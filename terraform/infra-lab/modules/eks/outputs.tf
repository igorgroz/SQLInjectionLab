# =============================================================================
# eks/outputs.tf
# =============================================================================

output "cluster_name" {
  description = "EKS cluster name"
  value       = aws_eks_cluster.main.name
}

output "cluster_arn" {
  description = "EKS cluster ARN"
  value       = aws_eks_cluster.main.arn
}

output "cluster_endpoint" {
  description = "EKS API server endpoint URL"
  value       = aws_eks_cluster.main.endpoint
}

output "cluster_certificate_authority_data" {
  description = "Base64-encoded certificate authority data for the cluster"
  value       = aws_eks_cluster.main.certificate_authority[0].data
}

output "cluster_version" {
  description = "Kubernetes version running on the cluster"
  value       = aws_eks_cluster.main.version
}

output "cluster_security_group_id" {
  description = "ID of the cluster (control plane) security group"
  value       = aws_security_group.cluster.id
}

output "node_security_group_id" {
  description = "ID of the worker node security group"
  value       = aws_security_group.nodes.id
}

output "node_role_arn" {
  description = "ARN of the worker node IAM role"
  value       = aws_iam_role.nodes.arn
}

output "node_role_name" {
  description = "Name of the worker node IAM role"
  value       = aws_iam_role.nodes.name
}

output "oidc_provider_arn" {
  description = "ARN of the OIDC provider — used in IRSA trust policies"
  value       = aws_iam_openid_connect_provider.eks.arn
}

output "oidc_provider_url" {
  description = "OIDC issuer URL (without https:// prefix) — used in IRSA trust conditions"
  value       = replace(aws_eks_cluster.main.identity[0].oidc[0].issuer, "https://", "")
}

output "kubeconfig_command" {
  description = "AWS CLI command to update local kubeconfig"
  value       = "aws eks update-kubeconfig --region ${data.aws_region.current.name} --name ${aws_eks_cluster.main.name}"
}
