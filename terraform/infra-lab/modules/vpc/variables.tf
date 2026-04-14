# =============================================================================
# vpc/variables.tf
# =============================================================================

variable "cluster_name" {
  description = "EKS cluster name — used in subnet tags so the AWS LB Controller and EKS can discover subnets"
  type        = string
}

variable "vpc_cidr" {
  description = "CIDR block for the VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "azs" {
  description = "List of Availability Zones to deploy into (3 required for EKS HA)"
  type        = list(string)
  default     = ["ap-southeast-2a", "ap-southeast-2b", "ap-southeast-2c"]
}

# Subnet CIDR design:
#   10.0.0.0/16 gives us 65536 addresses.
#   We carve it as:
#     Public  /24 per AZ → 256 addresses each (ALB, NAT GW) — small, intentionally
#     Private /20 per AZ → 4096 addresses each (pods, nodes) — large for growth
#
#   /20 for private is important because EKS pod networking (VPC CNI) assigns
#   a real VPC IP to every pod, not a secondary overlay. A /24 runs out fast
#   on a moderately loaded cluster.

variable "public_subnet_cidrs" {
  description = "CIDR blocks for public subnets (one per AZ) — ALB and NAT gateway"
  type        = list(string)
  default     = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
}

variable "private_subnet_cidrs" {
  description = "CIDR blocks for private subnets (one per AZ) — EKS nodes and pods"
  type        = list(string)
  default     = ["10.0.16.0/20", "10.0.32.0/20", "10.0.48.0/20"]
}

variable "single_nat_gateway" {
  description = <<-EOT
    When true, deploy a single NAT gateway in the first AZ (cost saving for lab).
    When false, deploy one NAT gateway per AZ (production HA pattern).
    Lab cost difference: ~$1.08/day per additional NAT gateway.
  EOT
  type        = bool
  default     = true
}

variable "tags" {
  description = "Additional tags to apply to all VPC resources"
  type        = map(string)
  default     = {}
}
