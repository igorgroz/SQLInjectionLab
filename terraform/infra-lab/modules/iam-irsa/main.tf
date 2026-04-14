# =============================================================================
# iam-irsa/main.tf — IRSA roles for ESO and the backend application
#
# IRSA (IAM Roles for Service Accounts) deep dive:
#
# The trust policy on each IAM role contains two conditions:
#   1. StringEquals on the OIDC issuer — only tokens from THIS cluster's OIDC
#      provider are accepted. Prevents tokens from other EKS clusters (even in
#      the same account) from assuming the role.
#   2. StringEquals on the subject claim — the subject is formatted as:
#      "system:serviceaccount:<namespace>:<serviceaccount-name>"
#      Only the specific ServiceAccount in the specific namespace can assume
#      the role. A pod in a different namespace, or a pod with a different
#      ServiceAccount name, gets denied even if it has a valid OIDC token.
#
# This is the least-privilege principle applied at the pod identity level.
# Each functional component (ESO, backend) gets exactly the permissions it
# needs and nothing more.
#
# Roles created here:
#   1. ESO role — External Secrets Operator reads from Secrets Manager.
#      ESO then creates K8s Secrets from those values. The backend pod
#      consumes the K8s Secret as environment variables or a mounted volume.
#   2. Backend role — direct AWS access if the backend ever needs it
#      (e.g., calling other AWS services). Currently limited to Secrets
#      Manager read for its own secrets.
# =============================================================================

data "aws_caller_identity" "current" {}

# =============================================================================
# Shared: OIDC trust condition helpers
# =============================================================================
# These locals simplify building the trust policy conditions.
# The format for OIDC subject claims is standardised across all EKS clusters:
#   system:serviceaccount:<namespace>:<service-account-name>

locals {
  oidc_subject_eso     = "system:serviceaccount:${var.eso_namespace}:${var.eso_service_account}"
  oidc_subject_backend = "system:serviceaccount:${var.app_namespace}:${var.backend_service_account}"
}

# =============================================================================
# Role 1: External Secrets Operator (ESO) — Secrets Manager reader
# =============================================================================
#
# ESO is a K8s operator that syncs AWS Secrets Manager → K8s Secrets.
# The application never calls Secrets Manager directly — it just reads a K8s
# Secret as it would any other config. This is the correct pattern because:
#   - The app doesn't need to know about AWS at all (portability)
#   - Secret rotation in Secrets Manager propagates to K8s automatically
#   - You can audit Secrets Manager access separately from app access
#
# ESO architecture in K8s:
#   SecretStore (or ClusterSecretStore) → references the IAM role via annotation
#   ExternalSecret → references the SecretStore + specifies which SM secret to fetch
#   K8s Secret → created/updated by ESO from the SM value

data "aws_iam_policy_document" "eso_assume" {
  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRoleWithWebIdentity"]

    principals {
      type        = "Federated"
      identifiers = [var.oidc_provider_arn]
    }

    condition {
      test     = "StringEquals"
      variable = "${var.oidc_provider_url}:aud"
      values   = ["sts.amazonaws.com"]
    }

    condition {
      test     = "StringEquals"
      variable = "${var.oidc_provider_url}:sub"
      values   = [local.oidc_subject_eso]
    }
  }
}

resource "aws_iam_role" "eso" {
  name               = "${var.cluster_name}-eso-role"
  assume_role_policy = data.aws_iam_policy_document.eso_assume.json
  description        = "IRSA role for External Secrets Operator - reads from Secrets Manager"

  tags = merge(var.tags, {
    Name = "${var.cluster_name}-eso-role"
  })
}

data "aws_iam_policy_document" "eso_permissions" {
  # ESO needs to list secrets to discover them, and get values to sync them.
  # GetSecretValue is the critical permission. Scoped to secrets tagged
  # with the project — in production, use a more specific ARN pattern.
  statement {
    sid    = "ReadSecretsManager"
    effect = "Allow"
    actions = [
      "secretsmanager:GetSecretValue",
      "secretsmanager:DescribeSecret",
      "secretsmanager:ListSecrets",
    ]
    resources = [
      "arn:aws:secretsmanager:${var.aws_region}:${data.aws_caller_identity.current.account_id}:secret:sqlinj/*"
    ]
  }
}

resource "aws_iam_role_policy" "eso" {
  name   = "secrets-manager-read"
  role   = aws_iam_role.eso.id
  policy = data.aws_iam_policy_document.eso_permissions.json
}

# =============================================================================
# Role 2: Backend application — direct AWS access if needed
# =============================================================================
# Scoped to reading its own secrets only. If the backend needed to write to
# S3, SQS, etc., those permissions would be added here — not to the node role.

data "aws_iam_policy_document" "backend_assume" {
  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRoleWithWebIdentity"]

    principals {
      type        = "Federated"
      identifiers = [var.oidc_provider_arn]
    }

    condition {
      test     = "StringEquals"
      variable = "${var.oidc_provider_url}:aud"
      values   = ["sts.amazonaws.com"]
    }

    condition {
      test     = "StringEquals"
      variable = "${var.oidc_provider_url}:sub"
      values   = [local.oidc_subject_backend]
    }
  }
}

resource "aws_iam_role" "backend" {
  name               = "${var.cluster_name}-backend-role"
  assume_role_policy = data.aws_iam_policy_document.backend_assume.json
  description        = "IRSA role for the backend Node.js application"

  tags = merge(var.tags, {
    Name = "${var.cluster_name}-backend-role"
  })
}

data "aws_iam_policy_document" "backend_permissions" {
  statement {
    sid    = "ReadOwnSecrets"
    effect = "Allow"
    actions = [
      "secretsmanager:GetSecretValue",
      "secretsmanager:DescribeSecret",
    ]
    resources = [
      "arn:aws:secretsmanager:${var.aws_region}:${data.aws_caller_identity.current.account_id}:secret:sqlinj/backend/*"
    ]
  }
}

resource "aws_iam_role_policy" "backend" {
  name   = "read-own-secrets"
  role   = aws_iam_role.backend.id
  policy = data.aws_iam_policy_document.backend_permissions.json
}

# =============================================================================
# Secrets Manager — secret scaffolding
# =============================================================================
# Create the secret entries now (with placeholder values) so the ARNs exist
# and ESO can reference them. Actual values are set manually or via the
# pipeline — never in Terraform (secrets in state = bad).
#
# Phase 3b will configure ESO to sync these into K8s Secrets.

resource "aws_secretsmanager_secret" "db_password" {
  name        = "sqlinj/backend/db-password"
  description = "PostgreSQL password for the sqlinj backend application"

  # 30-day recovery window before permanent deletion.
  # Terraform destroy sets this to 0 for immediate deletion (fine for lab).
  recovery_window_in_days = 0

  tags = merge(var.tags, {
    Name = "sqlinj-db-password"
  })
}

resource "aws_secretsmanager_secret" "jwt_secret" {
  name        = "sqlinj/backend/jwt-secret"
  description = "JWT signing secret for the sqlinj backend"

  recovery_window_in_days = 0

  tags = merge(var.tags, {
    Name = "sqlinj-jwt-secret"
  })
}

# Placeholder versions — set to "PLACEHOLDER" so the secret exists.
# In Phase 3b, you'll run:
#   aws secretsmanager put-secret-value --secret-id sqlinj/backend/db-password \
#     --secret-string "your-actual-password"
# This should be done manually — never via Terraform or committed to the repo.

resource "aws_secretsmanager_secret_version" "db_password" {
  secret_id     = aws_secretsmanager_secret.db_password.id
  secret_string = "PLACEHOLDER_REPLACE_BEFORE_DEPLOY"

  lifecycle {
    # Ignore changes to the secret value — Terraform should not overwrite
    # a value that was set manually or by another process.
    ignore_changes = [secret_string]
  }
}

resource "aws_secretsmanager_secret_version" "jwt_secret" {
  secret_id     = aws_secretsmanager_secret.jwt_secret.id
  secret_string = "PLACEHOLDER_REPLACE_BEFORE_DEPLOY"

  lifecycle {
    ignore_changes = [secret_string]
  }
}
