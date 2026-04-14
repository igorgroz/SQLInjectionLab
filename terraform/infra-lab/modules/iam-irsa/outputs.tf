# =============================================================================
# iam-irsa/outputs.tf
# =============================================================================

output "eso_role_arn" {
  description = "ARN of the IRSA role for External Secrets Operator"
  value       = aws_iam_role.eso.arn
}

output "eso_role_name" {
  description = "Name of the IRSA role for External Secrets Operator"
  value       = aws_iam_role.eso.name
}

output "backend_role_arn" {
  description = "ARN of the IRSA role for the backend application"
  value       = aws_iam_role.backend.arn
}

output "backend_role_name" {
  description = "Name of the IRSA role for the backend application"
  value       = aws_iam_role.backend.name
}

output "db_password_secret_arn" {
  description = "ARN of the database password secret in Secrets Manager"
  value       = aws_secretsmanager_secret.db_password.arn
}

output "jwt_secret_arn" {
  description = "ARN of the JWT secret in Secrets Manager"
  value       = aws_secretsmanager_secret.jwt_secret.arn
}

output "db_password_secret_name" {
  description = "Name of the database password secret (for ESO SecretStore reference)"
  value       = aws_secretsmanager_secret.db_password.name
}

output "jwt_secret_name" {
  description = "Name of the JWT secret (for ESO SecretStore reference)"
  value       = aws_secretsmanager_secret.jwt_secret.name
}
