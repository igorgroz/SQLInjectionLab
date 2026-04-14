# =============================================================================
# outputs.tf — infra-lab root outputs
#
# These are printed after `terraform apply` completes. Copy and use them to
# configure kubectl, update K8s manifests, and set up Phase 3b.
# =============================================================================

# ─── Cluster ─────────────────────────────────────────────────────────────────

output "cluster_name" {
  description = "EKS cluster name"
  value       = module.eks.cluster_name
}

output "cluster_endpoint" {
  description = "EKS API server endpoint"
  value       = module.eks.cluster_endpoint
}

output "cluster_version" {
  description = "Kubernetes version"
  value       = module.eks.cluster_version
}

output "kubeconfig_command" {
  description = "Run this to configure kubectl after apply"
  value       = module.eks.kubeconfig_command
}

# ─── Networking ──────────────────────────────────────────────────────────────

output "vpc_id" {
  description = "VPC ID"
  value       = module.vpc.vpc_id
}

output "private_subnet_ids" {
  description = "Private subnet IDs (for EKS nodes)"
  value       = module.vpc.private_subnet_ids
}

output "public_subnet_ids" {
  description = "Public subnet IDs (for ALB)"
  value       = module.vpc.public_subnet_ids
}

output "nat_public_ips" {
  description = "NAT gateway public IP(s) — all outbound traffic from nodes uses this"
  value       = module.vpc.nat_public_ips
}

# ─── ECR ─────────────────────────────────────────────────────────────────────

output "ecr_repository_urls" {
  description = "ECR repository URLs — update image: fields in K8s manifests with these"
  value       = module.ecr.repository_urls
}

output "ecr_docker_login_command" {
  description = "Authenticate Docker to ECR"
  value       = module.ecr.docker_login_command
}

# ─── IRSA / Secrets Manager ──────────────────────────────────────────────────

output "oidc_provider_arn" {
  description = "OIDC provider ARN — for additional IRSA roles in Phase 3b"
  value       = module.eks.oidc_provider_arn
}

output "eso_role_arn" {
  description = "IRSA role ARN for External Secrets Operator"
  value       = module.iam_irsa.eso_role_arn
}

output "backend_role_arn" {
  description = "IRSA role ARN for the backend application"
  value       = module.iam_irsa.backend_role_arn
}

output "db_password_secret_name" {
  description = "Secrets Manager secret name for DB password — set actual value before deploying"
  value       = module.iam_irsa.db_password_secret_name
}

output "jwt_secret_name" {
  description = "Secrets Manager secret name for JWT secret — set actual value before deploying"
  value       = module.iam_irsa.jwt_secret_name
}

# ─── Post-apply checklist ────────────────────────────────────────────────────

output "next_steps" {
  description = "Actions to complete before Phase 3b (app deployment)"
  value = <<-EOT

    ============================================================
     Phase 3a complete — Next steps before Phase 3b
    ============================================================

    1. Configure kubectl:
       ${module.eks.kubeconfig_command}

    2. Verify nodes are Ready:
       kubectl get nodes

    3. Set actual secret values (never commit these!):
       aws secretsmanager put-secret-value \
         --secret-id ${module.iam_irsa.db_password_secret_name} \
         --secret-string "your-postgres-password"

       aws secretsmanager put-secret-value \
         --secret-id ${module.iam_irsa.jwt_secret_name} \
         --secret-string "your-jwt-signing-secret"

    4. Enable the nightly destroy rule when ready:
       aws events enable-rule --name sqlinj-nightly-destroy

    5. Update backend K8s manifests with ECR image URLs:
       Frontend: ${lookup(module.ecr.repository_urls, "sqlinj-frontend", "not-yet-created")}
       Backend:  ${lookup(module.ecr.repository_urls, "sqlinj-backend", "not-yet-created")}

    ============================================================
  EOT
}
