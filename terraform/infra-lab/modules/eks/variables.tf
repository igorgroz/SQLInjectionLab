# =============================================================================
# eks/variables.tf
# =============================================================================

variable "cluster_name" {
  description = "EKS cluster name"
  type        = string
}

variable "cluster_version" {
  description = "Kubernetes version for the EKS cluster"
  type        = string
  default     = "1.33"
}

variable "vpc_id" {
  description = "VPC ID to deploy the cluster into"
  type        = string
}

variable "private_subnet_ids" {
  description = "Private subnet IDs for worker nodes"
  type        = list(string)
}

variable "public_subnet_ids" {
  description = "Public subnet IDs — passed for reference (ALB, not used by nodes)"
  type        = list(string)
}

# Node group sizing
# Lab defaults: t3.medium is the minimum comfortable for EKS system pods +
# your app stack. t3.small will OOM. t3.medium (2 vCPU, 4 GB) works for the lab.
# Production: at least t3.large with auto-scaling, Cluster Autoscaler or Karpenter.

variable "node_instance_type" {
  description = "EC2 instance type for worker nodes"
  type        = string
  default     = "t3.medium"
}

variable "node_desired_size" {
  description = "Desired number of worker nodes"
  type        = number
  default     = 2
}

variable "node_min_size" {
  description = "Minimum number of worker nodes"
  type        = number
  default     = 1
}

variable "node_max_size" {
  description = "Maximum number of worker nodes"
  type        = number
  default     = 3
}

variable "node_disk_size_gb" {
  description = "EBS volume size (GB) for each worker node's root disk"
  type        = number
  default     = 20
}

variable "enable_cluster_endpoint_public_access" {
  description = <<-EOT
    Whether the EKS API server endpoint is reachable from the public internet.
    true  = lab convenience (kubectl works from anywhere without VPN)
    false = production posture (requires VPN or bastion to reach API server)

    With public access enabled, authentication still requires valid AWS credentials
    + a kubeconfig entry — the endpoint is not unauthenticated. But the attack
    surface includes the Kubernetes API itself, so production should disable this
    and use VPC-only access with AWS PrivateLink.
  EOT
  type        = bool
  default     = true
}

variable "cluster_endpoint_public_access_cidrs" {
  description = <<-EOT
    CIDRs allowed to reach the public EKS API endpoint.
    Default ["0.0.0.0/0"] is convenient for the lab.
    Production: restrict to your office CIDR or VPN exit IP.
  EOT
  type        = list(string)
  default     = ["0.0.0.0/0"]
}

variable "tags" {
  description = "Additional tags to apply to all EKS resources"
  type        = map(string)
  default     = {}
}
