# =============================================================================
# backend.tf — Remote state configuration for infra-base
#
# IMPORTANT: Replace ACCOUNT_ID with your actual AWS account ID after running
# scripts/bootstrap.sh. The bootstrap script outputs the correct values.
#
# Why remote state?
#   - Local state (terraform.tfstate on your filesystem) is lost when you
#     switch machines and can't be shared or locked.
#   - S3 provides durable, versioned, encrypted storage.
#   - State locking via S3 conditional writes (use_lockfile, GA in AWS
#     provider 5.83+) prevents two concurrent applies from corrupting state.
#     This replaces the older DynamoDB lock-table pattern — one fewer
#     resource to manage, no IAM grants on a side table.
#
# Why separate state keys?
#   - infra-base/terraform.tfstate  → permanent infrastructure
#   - infra-lab/terraform.tfstate   → ephemeral infrastructure
#   Separate keys mean terraform destroy on infra-lab cannot touch infra-base.
#   This is the critical safety property of the two-state design.
#
# Security note:
#   The bucket was created with SSE-AES256 and public access blocking by
#   bootstrap.sh. The encrypt = true flag here tells Terraform to explicitly
#   request SSE when writing objects, as a belt-and-suspenders measure.
# =============================================================================

terraform {
  backend "s3" {
    bucket       = "sqlinj-tfstate-510151297987"
    key          = "infra-base/terraform.tfstate"
    region       = "ap-southeast-2"
    use_lockfile = true
    encrypt      = true
  }
}
