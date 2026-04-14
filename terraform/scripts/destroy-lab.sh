#!/usr/bin/env bash
# =============================================================================
# destroy-lab.sh — Manual destroy of infra-lab (tear down the EKS cluster)
#
# The nightly EventBridge → CodeBuild job does this automatically.
# Use this script if you want to destroy before the nightly window.
#
# Usage: ./destroy-lab.sh [--auto-approve]
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INFRA_LAB_DIR="${SCRIPT_DIR}/../infra-lab"
AUTO_APPROVE=""

if [[ "${1:-}" == "--auto-approve" ]]; then
  AUTO_APPROVE="-auto-approve"
  echo "⚠  Auto-approve mode — destruction will begin immediately"
fi

echo "→ Initialising Terraform..."
cd "${INFRA_LAB_DIR}"
terraform init -input=false

echo "→ Generating destroy plan..."
terraform plan -destroy -input=false -out=tfplan-destroy

if [[ -z "${AUTO_APPROVE}" ]]; then
  echo ""
  echo "⚠  This will DESTROY all infra-lab resources (VPC, EKS, ECR, IAM)."
  echo "   Review the plan above. Press ENTER to destroy or Ctrl-C to abort."
  read -r
fi

echo "→ Destroying infra-lab..."
terraform apply ${AUTO_APPROVE} -input=false tfplan-destroy

echo ""
echo "✓ infra-lab destroyed. Re-apply tomorrow with:"
echo "  ./apply-lab.sh"
