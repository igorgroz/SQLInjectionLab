# =============================================================================
# main.tf — infra-lab root: wires VPC, EKS, ECR, and IAM/IRSA modules
#
# This is the entry point for all ephemeral lab infrastructure.
# Run `terraform apply` to provision. Run `terraform destroy` to tear down.
# The nightly CodeBuild job runs destroy automatically at 22:00 AEST.
#
# Module dependency order (Terraform resolves this automatically via references):
#   vpc → eks (needs subnet IDs, VPC ID)
#   eks → iam-irsa (needs OIDC provider ARN and URL)
#   ecr (independent)
# =============================================================================

# =============================================================================
# VPC — Network foundation
# =============================================================================

module "vpc" {
  source = "./modules/vpc"

  cluster_name = var.cluster_name
  vpc_cidr     = var.vpc_cidr

  azs = [
    "${var.aws_region}a",
    "${var.aws_region}b",
    "${var.aws_region}c",
  ]

  public_subnet_cidrs  = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
  private_subnet_cidrs = ["10.0.16.0/20", "10.0.32.0/20", "10.0.48.0/20"]

  # Lab: single NAT GW to save ~$1.08/day.
  # Production: set to false for one NAT GW per AZ (HA).
  single_nat_gateway = true
}

# =============================================================================
# EKS — Cluster, managed node group, OIDC provider
# =============================================================================

module "eks" {
  source = "./modules/eks"

  cluster_name    = var.cluster_name
  cluster_version = var.cluster_version
  vpc_id          = module.vpc.vpc_id
  private_subnet_ids = module.vpc.private_subnet_ids
  public_subnet_ids  = module.vpc.public_subnet_ids

  node_instance_type = var.node_instance_type
  node_desired_size  = var.node_desired_size
  node_min_size      = var.node_min_size
  node_max_size      = var.node_max_size
  node_disk_size_gb  = 20

  # Lab: public endpoint enabled for kubectl access from your Mac.
  # Production: set to false and use VPN or AWS PrivateLink.
  enable_cluster_endpoint_public_access = true

  # Lab: unrestricted for convenience.
  # Production: set to your home/office IP or VPN exit IP.
  cluster_endpoint_public_access_cidrs = ["0.0.0.0/0"]
}

# =============================================================================
# ECR — Container registries
# =============================================================================

module "ecr" {
  source = "./modules/ecr"

  cluster_name = var.cluster_name

  repositories = {
    "sqlinj-frontend" = {
      image_tag_mutability = "IMMUTABLE"
      scan_on_push         = true
    }
    "sqlinj-backend" = {
      image_tag_mutability = "IMMUTABLE"
      scan_on_push         = true
    }
  }

  lifecycle_untagged_days = 1
  lifecycle_tagged_count  = 10
}

# =============================================================================
# EKS Admin Access — grant kubectl access to the Terraform operator
# =============================================================================
# EKS with API_AND_CONFIG_MAP authentication mode does NOT automatically create
# an access entry for the cluster creator. Without this, kubectl fails with
# "server has asked for credentials" even though AWS credentials are valid.
#
# We use data.aws_caller_identity to dynamically target whoever is running
# Terraform — no hardcoded ARNs, works for any IAM user or assumed role.

data "aws_caller_identity" "current" {}

resource "aws_eks_access_entry" "operator_admin" {
  cluster_name  = module.eks.cluster_name
  principal_arn = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:user/terraform"
  type          = "STANDARD"

  tags = {
    Project   = "sqlinj"
    ManagedBy = "terraform"
  }
}

resource "aws_eks_access_policy_association" "operator_admin" {
  cluster_name  = module.eks.cluster_name
  principal_arn = aws_eks_access_entry.operator_admin.principal_arn
  policy_arn    = "arn:aws:eks::aws:cluster-access-policy/AmazonEKSClusterAdminPolicy"

  access_scope {
    type = "cluster"
  }
}

# =============================================================================
# IAM/IRSA — Pod identity roles and Secrets Manager scaffolding
# =============================================================================

module "iam_irsa" {
  source = "./modules/iam-irsa"

  cluster_name      = var.cluster_name
  oidc_provider_arn = module.eks.oidc_provider_arn
  oidc_provider_url = module.eks.oidc_provider_url
  aws_region        = var.aws_region

  app_namespace = "sqlinj"
  eso_namespace = "external-secrets"

  eso_service_account     = "external-secrets-sa"
  backend_service_account = "sqlinj-backend-sa"
}
