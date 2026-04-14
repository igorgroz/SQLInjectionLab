# =============================================================================
# versions.tf — Provider version constraints for infra-lab
#
# We need two providers here:
#   - aws:  for all AWS resources
#   - tls:  for fetching the EKS OIDC provider TLS certificate thumbprint
#           (used by the eks module to register the OIDC provider with IAM)
# =============================================================================

terraform {
  required_version = ">= 1.7.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    tls = {
      source  = "hashicorp/tls"
      version = "~> 4.0"
    }
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Environment = "lab"
      Project     = "sqlinj"
      ManagedBy   = "terraform"
      Component   = "infra-lab"
      AutoDestroy = "true"
    }
  }
}

provider "tls" {}
