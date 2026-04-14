# =============================================================================
# main.tf — infra-base: Nightly destroy infrastructure
#
# Resources managed here are PERMANENT — never run terraform destroy on this
# module unless you want to lose the state backend and the destroyer itself.
#
# Architecture:
#   EventBridge (cron 22:00 AEST)
#     └→ IAM role (allows events.amazonaws.com to start CodeBuild)
#         └→ CodeBuild project
#               └→ IAM role (allows CodeBuild to run terraform + destroy AWS resources)
#               └→ Checks out repo, installs Terraform, runs destroy on infra-lab
# =============================================================================

data "aws_caller_identity" "current" {}
data "aws_region" "current" {}

locals {
  account_id   = data.aws_caller_identity.current.account_id
  region       = data.aws_region.current.name
  state_bucket = "sqlinj-tfstate-${local.account_id}"
}

# =============================================================================
# IAM — CodeBuild execution role
# =============================================================================
#
# Security design note:
#   This role uses AdministratorAccess for the lab. This is a deliberate
#   simplification with acknowledged trade-offs:
#
#   Production pattern would use a least-privilege policy with conditions:
#     - eks:DeleteCluster with condition aws:ResourceTag/ManagedBy = terraform
#     - ec2:TerminateInstances with condition ec2:ResourceTag/AutoDestroy = true
#     - vpc:Delete* scoped to specific VPC IDs via resource ARNs
#     etc.
#
#   The tagging strategy we use (AutoDestroy=true on infra-lab resources) is
#   designed to make this production scope-down straightforward when needed.

data "aws_iam_policy_document" "codebuild_assume" {
  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["codebuild.amazonaws.com"]
    }

    # Restrict assume to CodeBuild projects in this account only.
    # Prevents other accounts from assuming this role via CodeBuild.
    condition {
      test     = "StringEquals"
      variable = "aws:SourceAccount"
      values   = [local.account_id]
    }
  }
}

resource "aws_iam_role" "codebuild_destroy" {
  name               = "sqlinj-codebuild-nightly-destroy"
  assume_role_policy = data.aws_iam_policy_document.codebuild_assume.json
  description        = "CodeBuild role for nightly terraform destroy of infra-lab"
}

# Lab: AdministratorAccess for simplicity.
# Production: replace with a custom least-privilege policy scoped to tagged resources.
resource "aws_iam_role_policy_attachment" "codebuild_admin" {
  role       = aws_iam_role.codebuild_destroy.name
  policy_arn = "arn:aws:iam::aws:policy/AdministratorAccess"
}

# Explicit S3 + DynamoDB access for Terraform state operations.
# Although AdministratorAccess covers this, making it explicit documents intent
# and makes the production scope-down path clearer.
data "aws_iam_policy_document" "codebuild_tfstate" {
  statement {
    sid    = "TerraformStateBucket"
    effect = "Allow"
    actions = [
      "s3:GetObject",
      "s3:GetObjectVersion",
      "s3:PutObject",
      "s3:DeleteObject",
      "s3:ListBucket",
    ]
    resources = [
      "arn:aws:s3:::${local.state_bucket}",
      "arn:aws:s3:::${local.state_bucket}/*",
    ]
  }

  statement {
    sid    = "TerraformStateLock"
    effect = "Allow"
    actions = [
      "dynamodb:GetItem",
      "dynamodb:PutItem",
      "dynamodb:DeleteItem",
      "dynamodb:DescribeTable",
    ]
    resources = [
      "arn:aws:dynamodb:${local.region}:${local.account_id}:table/sqlinj-tfstate-lock"
    ]
  }

  statement {
    sid    = "CloudWatchLogs"
    effect = "Allow"
    actions = [
      "logs:CreateLogGroup",
      "logs:CreateLogStream",
      "logs:PutLogEvents",
    ]
    resources = [
      "arn:aws:logs:${local.region}:${local.account_id}:log-group:/aws/codebuild/sqlinj-nightly-destroy",
      "arn:aws:logs:${local.region}:${local.account_id}:log-group:/aws/codebuild/sqlinj-nightly-destroy:*",
    ]
  }
}

resource "aws_iam_role_policy" "codebuild_tfstate" {
  name   = "tfstate-and-logs"
  role   = aws_iam_role.codebuild_destroy.id
  policy = data.aws_iam_policy_document.codebuild_tfstate.json
}

# =============================================================================
# CloudWatch Log Group — CodeBuild output
# =============================================================================
# Explicit log group with a retention policy.
# Without this, CodeBuild creates the group with infinite retention —
# which accumulates cost and clutters CloudWatch. 14 days is enough to
# diagnose a failed nightly destroy.

resource "aws_cloudwatch_log_group" "codebuild_destroy" {
  name              = "/aws/codebuild/sqlinj-nightly-destroy"
  retention_in_days = 14
}

# =============================================================================
# CodeBuild project — terraform destroy runner
# =============================================================================

resource "aws_codebuild_project" "nightly_destroy" {
  name          = "sqlinj-nightly-destroy"
  description   = "Nightly terraform destroy of infra-lab — prevents runaway lab costs"
  service_role  = aws_iam_role.codebuild_destroy.arn
  build_timeout = var.codebuild_timeout_minutes

  artifacts {
    type = "NO_ARTIFACTS"
  }

  # Using the standard CodeBuild managed image which ships with common tooling.
  # We download Terraform at build time to control the exact version.
  # Alternative: build a custom Docker image with Terraform pre-installed and
  # push to ECR — faster builds, no external download at runtime.
  environment {
    compute_type                = "BUILD_GENERAL1_SMALL"
    image                       = "aws/codebuild/standard:7.0"
    type                        = "LINUX_CONTAINER"
    image_pull_credentials_type = "CODEBUILD"

    environment_variable {
      name  = "TF_VERSION"
      value = var.terraform_version
    }

    environment_variable {
      name  = "TF_IN_AUTOMATION"
      value = "1"   # suppresses interactive prompts and adds context to output
    }

    environment_variable {
      name  = "AWS_DEFAULT_REGION"
      value = local.region
    }
  }

  source {
    type            = "GITHUB"
    location        = "https://github.com/${var.github_repo}.git"
    git_clone_depth = 1   # shallow clone — we only need the latest Terraform configs

    # The buildspec is inline rather than a file in the repo so the destroy
    # logic is self-contained in Terraform and visible in one place.
    # A file-based buildspec (buildspec.yml) is also valid and easier to test.
    buildspec = <<-BUILDSPEC
      version: 0.2

      phases:
        install:
          commands:
            - echo "=== Installing Terraform $${TF_VERSION} ==="
            - curl -sLo /tmp/terraform.zip https://releases.hashicorp.com/terraform/$${TF_VERSION}/terraform_$${TF_VERSION}_linux_amd64.zip
            - unzip -o /tmp/terraform.zip -d /usr/local/bin/
            - terraform version

        pre_build:
          commands:
            - echo "=== Starting nightly destroy at $(date) ==="
            - echo "=== Repo ${var.github_repo} branch ${var.github_branch} ==="
            - cd terraform/infra-lab
            - terraform init -input=false -no-color

        build:
          commands:
            - echo "=== Running terraform destroy ==="
            - terraform destroy -auto-approve -input=false -no-color || true
            - echo "=== Destroy completed at $(date) ==="

        post_build:
          commands:
            - echo "=== Nightly destroy job finished ==="
    BUILDSPEC
  }

  logs_config {
    cloudwatch_logs {
      group_name  = aws_cloudwatch_log_group.codebuild_destroy.name
      stream_name = "nightly-destroy"
      status      = "ENABLED"
    }
  }

  depends_on = [aws_cloudwatch_log_group.codebuild_destroy]
}

# =============================================================================
# IAM — EventBridge role (permission to trigger CodeBuild)
# =============================================================================

data "aws_iam_policy_document" "eventbridge_assume" {
  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["events.amazonaws.com"]
    }

    condition {
      test     = "StringEquals"
      variable = "aws:SourceAccount"
      values   = [local.account_id]
    }
  }
}

resource "aws_iam_role" "eventbridge_codebuild" {
  name               = "sqlinj-eventbridge-start-codebuild"
  assume_role_policy = data.aws_iam_policy_document.eventbridge_assume.json
  description        = "Allows EventBridge to start the nightly CodeBuild destroy job"
}

data "aws_iam_policy_document" "eventbridge_codebuild" {
  statement {
    sid       = "StartNightlyDestroyBuild"
    effect    = "Allow"
    actions   = ["codebuild:StartBuild"]
    resources = [aws_codebuild_project.nightly_destroy.arn]
  }
}

resource "aws_iam_role_policy" "eventbridge_codebuild" {
  name   = "start-nightly-destroy-build"
  role   = aws_iam_role.eventbridge_codebuild.id
  policy = data.aws_iam_policy_document.eventbridge_codebuild.json
}

# =============================================================================
# EventBridge — Scheduled rule
# =============================================================================

resource "aws_cloudwatch_event_rule" "nightly_destroy" {
  name                = "sqlinj-nightly-destroy"
  description         = "Trigger terraform destroy of infra-lab at 22:00 AEST nightly"
  schedule_expression = var.destroy_schedule_utc

  # ENABLED by default. Set to DISABLED here to avoid an accidental destroy
  # before you've validated infra-lab. Manually enable via console or
  # `aws events enable-rule --name sqlinj-nightly-destroy` when ready.
  state = "DISABLED"
}

resource "aws_cloudwatch_event_target" "codebuild_destroy" {
  rule      = aws_cloudwatch_event_rule.nightly_destroy.name
  target_id = "NightlyDestroyCodeBuild"
  arn       = aws_codebuild_project.nightly_destroy.arn
  role_arn  = aws_iam_role.eventbridge_codebuild.arn
}
