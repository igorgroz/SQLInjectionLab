# =============================================================================
# backend.tf — Remote state configuration for infra-lab
#
# IMPORTANT: Replace ACCOUNT_ID with your actual AWS account ID after running
# scripts/bootstrap.sh.
#
# Note the different key from infra-base:
#   infra-base uses: "infra-base/terraform.tfstate"
#   infra-lab  uses: "infra-lab/terraform.tfstate"
#
# This separation is what allows the nightly CodeBuild job to run
# `terraform destroy` on infra-lab without any risk of touching infra-base.
# They are completely independent state files.
# =============================================================================

terraform {
  backend "s3" {
    bucket         = "sqlinj-tfstate-ACCOUNT_ID"   # ← replace after bootstrap
    key            = "infra-lab/terraform.tfstate"
    region         = "ap-southeast-2"
    dynamodb_table = "sqlinj-tfstate-lock"
    encrypt        = true
  }
}
