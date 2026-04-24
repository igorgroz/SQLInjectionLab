# =============================================================================
# alb-controller-iam.tf — IRSA role for AWS Load Balancer Controller
#
# The AWS Load Balancer Controller (ALBC) reconciles Kubernetes Ingress and
# Service objects into real AWS ALBs and NLBs. To do so it needs broad
# permissions on EC2 (security groups, describe), ELBv2 (CRUD), WAFv2, Shield,
# ACM (describe certs), and IAM (CreateServiceLinkedRole).
#
# We grant these via IRSA: the controller's Pod runs in the kube-system
# namespace as ServiceAccount "aws-load-balancer-controller". Our IAM role
# trusts that specific (namespace, SA) pair via the EKS OIDC provider.
# No long-lived AWS credentials live in the cluster — only short-lived STS
# tokens fetched per-call by the SDK inside the Pod.
#
# The IAM policy is the upstream policy from kubernetes-sigs, pinned to the
# same version as the controller + Helm chart we install. The JSON file
# lives alongside this .tf file and is checked into Git so the policy
# version is auditable via git log.
#
# Ref: https://kubernetes-sigs.github.io/aws-load-balancer-controller/v3.2/deploy/installation/
# =============================================================================

locals {
  alb_controller_version   = "v3.2.2"
  alb_controller_namespace = "kube-system"
  alb_controller_sa_name   = "aws-load-balancer-controller"
}

# -----------------------------------------------------------------------------
# Trust policy: allow the controller's ServiceAccount (via OIDC) to assume
# this role. The `sub` condition pins to one specific (ns, sa) — no other Pod
# in the cluster can assume this role. The `aud` condition is required by AWS.
# -----------------------------------------------------------------------------

data "aws_iam_policy_document" "alb_controller_trust" {
  statement {
    actions = ["sts:AssumeRoleWithWebIdentity"]
    effect  = "Allow"

    principals {
      type        = "Federated"
      identifiers = [module.eks.oidc_provider_arn]
    }

    condition {
      test     = "StringEquals"
      variable = "${replace(module.eks.oidc_provider_url, "https://", "")}:sub"
      values   = ["system:serviceaccount:${local.alb_controller_namespace}:${local.alb_controller_sa_name}"]
    }

    condition {
      test     = "StringEquals"
      variable = "${replace(module.eks.oidc_provider_url, "https://", "")}:aud"
      values   = ["sts.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "alb_controller" {
  name               = "${var.cluster_name}-alb-controller-role"
  description        = "IRSA role for AWS Load Balancer Controller ${local.alb_controller_version} on ${var.cluster_name}"
  assume_role_policy = data.aws_iam_policy_document.alb_controller_trust.json

  tags = {
    Project   = "sqlinj"
    ManagedBy = "terraform"
    Component = "alb-controller"
  }
}

# -----------------------------------------------------------------------------
# Permissions policy — upstream JSON, verbatim. Do NOT handcraft a narrower
# version; the upstream is reviewed by AWS + ALBC maintainers and expands on
# each minor release. Production hardening goes via Condition blocks layered
# ON TOP of the upstream, not by trimming it.
# -----------------------------------------------------------------------------

resource "aws_iam_policy" "alb_controller" {
  name        = "${var.cluster_name}-alb-controller-policy"
  description = "Upstream IAM policy for AWS Load Balancer Controller ${local.alb_controller_version}"
  policy      = file("${path.module}/alb-controller-iam-policy-${local.alb_controller_version}.json")

  tags = {
    Project   = "sqlinj"
    ManagedBy = "terraform"
    Component = "alb-controller"
  }
}

resource "aws_iam_role_policy_attachment" "alb_controller" {
  role       = aws_iam_role.alb_controller.name
  policy_arn = aws_iam_policy.alb_controller.arn
}
