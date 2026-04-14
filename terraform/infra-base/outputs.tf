# =============================================================================
# outputs.tf — infra-base outputs
# =============================================================================

output "state_bucket_name" {
  description = "Name of the S3 bucket used for Terraform remote state"
  value       = local.state_bucket
}

output "state_lock_table" {
  description = "Name of the DynamoDB table used for Terraform state locking"
  value       = "sqlinj-tfstate-lock"
}

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
