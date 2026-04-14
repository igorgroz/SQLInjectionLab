#!/usr/bin/env bash
# =============================================================================
# apply-lab.sh — Manual apply of infra-lab (spin up the EKS cluster)
#
# Run this when you want to start a lab session. Takes ~15-20 minutes.
# Prerequisite: infra-base must already be applied (state bucket exists).
#
# Usage: ./apply-lab.sh [--auto-approve]
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INFRA_LAB_DIR="${SCRIPT_DIR}/../infra-lab"
AUTO_APPROVE=""

if [[ "${1:-}" == "--auto-approve" ]]; then
  AUTO_APPROVE="-auto-approve"
  echo "⚠  Auto-approve mode — no confirmation prompt"
fi

echo "→ Initialising Terraform..."
cd "${INFRA_LAB_DIR}"
terraform init -input=false

echo "→ Validating configuration..."
terraform validate

echo "→ Generating plan..."
terraform plan -input=false -out=tfplan

if [[ -z "${AUTO_APPROVE}" ]]; then
  echo ""
  echo "Review the plan above. Press ENTER to apply or Ctrl-C to abort."
  read -r
fi

echo "→ Applying infra-lab..."
terraform apply ${AUTO_APPROVE} -input=false tfplan

echo ""
echo "✓ infra-lab applied. Retrieve kubeconfig with:"
echo "  aws eks update-kubeconfig --region ap-southeast-2 --name sqlinj-eks"
