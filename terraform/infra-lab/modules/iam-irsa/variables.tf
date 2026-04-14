# =============================================================================
# iam-irsa/variables.tf
# =============================================================================

variable "cluster_name" {
  description = "EKS cluster name"
  type        = string
}

variable "oidc_provider_arn" {
  description = "ARN of the EKS OIDC provider — from the eks module output"
  type        = string
}

variable "oidc_provider_url" {
  description = "OIDC provider URL without https:// prefix — from the eks module output"
  type        = string
}

variable "aws_region" {
  description = "AWS region"
  type        = string
}

variable "app_namespace" {
  description = "Kubernetes namespace where the application runs"
  type        = string
  default     = "sqlinj"
}

variable "eso_namespace" {
  description = "Kubernetes namespace where External Secrets Operator runs"
  type        = string
  default     = "external-secrets"
}

variable "eso_service_account" {
  description = "Kubernetes ServiceAccount name for the External Secrets Operator"
  type        = string
  default     = "external-secrets-sa"
}

variable "backend_service_account" {
  description = "Kubernetes ServiceAccount name for the backend application"
  type        = string
  default     = "sqlinj-backend-sa"
}

variable "tags" {
  description = "Additional tags to apply to all IAM resources"
  type        = map(string)
  default     = {}
}
