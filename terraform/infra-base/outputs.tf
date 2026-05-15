# =============================================================================
# outputs.tf — infra-base outputs
# =============================================================================

output "state_bucket_name" {
  description = "Name of the S3 bucket used for Terraform remote state"
  value       = local.state_bucket
}

# State locking moved to S3-native conditional writes (use_lockfile) — the
# DynamoDB table is gone; no more `state_lock_table` output to emit.

output "codebuild_project_name" {
  description = "Name of the CodeBuild project for nightly infra-lab destroy"
  value       = aws_codebuild_project.nightly_destroy.name
}

output "codebuild_project_arn" {
  description = "ARN of the nightly destroy CodeBuild project"
  value       = aws_codebuild_project.nightly_destroy.arn
}

output "eventbridge_rule_name" {
  description = "EventBridge rule name — enable this when ready for nightly auto-destroy"
  value       = aws_cloudwatch_event_rule.nightly_destroy.name
}

output "eventbridge_rule_state" {
  description = "Current state of the nightly destroy rule (ENABLED/DISABLED)"
  value       = aws_cloudwatch_event_rule.nightly_destroy.state
}

# ─── ECR (moved from infra-lab, see main.tf) ─────────────────────────────────

output "ecr_repository_urls" {
  description = "ECR repository URLs — paste into K8s manifests' image: fields"
  value       = module.ecr.repository_urls
}

output "ecr_docker_login_command" {
  description = "Authenticate Docker to ECR"
  value       = module.ecr.docker_login_command
}

# ─── GitHub Actions OIDC role ─────────────────────────────────────────────────

output "github_actions_role_arn" {
  description = "Copy this value into GitHub repo secret AWS_GITHUB_ACTIONS_ROLE_ARN (Settings → Secrets → Actions)"
  value       = aws_iam_role.github_actions.arn
}
