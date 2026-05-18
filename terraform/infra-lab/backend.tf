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

# State locking now uses S3-native conditional writes (use_lockfile, GA in
# AWS provider 5.83+) instead of a DynamoDB table. One fewer resource to
# manage and pay for, no IAM grant on a table needed. The lock manifests
# as a sibling `<key>.tflock` object next to the state file inside the bucket.
terraform {
  backend "s3" {
    bucket       = "sqlinj-tfstate-510151297987"  # real bucket name — rename is a separate infra task
    key          = "infra-lab/terraform.tfstate"
    region       = "ap-southeast-2"
    use_lockfile = true
    encrypt      = true
  }
}
