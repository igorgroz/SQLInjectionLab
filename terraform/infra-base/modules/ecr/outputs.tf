# =============================================================================
# ecr/outputs.tf
# =============================================================================

output "repository_urls" {
  description = "Map of repository name to full ECR URL (use this in K8s image: field)"
  value       = { for k, v in aws_ecr_repository.repos : k => v.repository_url }
}

output "repository_arns" {
  description = "Map of repository name to ARN"
  value       = { for k, v in aws_ecr_repository.repos : k => v.arn }
}

output "registry_id" {
  description = "AWS account ID that owns the registry (used for docker login)"
  value       = data.aws_caller_identity.current.account_id
}

output "registry_url" {
  description = "ECR registry base URL — for docker login command"
  value       = "${data.aws_caller_identity.current.account_id}.dkr.ecr.${data.aws_region.current.name}.amazonaws.com"
}

output "docker_login_command" {
  description = "Command to authenticate Docker with ECR"
  value       = "aws ecr get-login-password --region ${data.aws_region.current.name} | docker login --username AWS --password-stdin ${data.aws_caller_identity.current.account_id}.dkr.ecr.${data.aws_region.current.name}.amazonaws.com"
}
