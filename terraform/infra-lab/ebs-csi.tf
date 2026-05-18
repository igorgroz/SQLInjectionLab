# =============================================================================
# ebs-csi.tf — IRSA role + EKS managed addon for the EBS CSI driver
#
# The EBS CSI driver is what backs PersistentVolumeClaims with real EBS
# volumes. EKS 1.23+ removed the in-tree kubernetes.io/aws-ebs provisioner,
# so a CSI driver is now mandatory for any PVC to be honoured.
#
# Why the dedicated IRSA role:
#   The controller pod needs to call ec2:CreateVolume, AttachVolume,
#   DetachVolume, etc. Without IRSA it would fall back to IMDS — which our
#   launch template blocks (hop_limit=1) on purpose. So IRSA is mandatory.
#   This was discovered the hard way during Phase 3b-4 (2026-05-07):
#   pods CrashLooped with "no EC2 IMDS role found, context deadline exceeded"
#   until we set up IRSA manually.
#
# Trust policy: pins the AssumeRoleWithWebIdentity to the SPECIFIC
# (namespace, ServiceAccount) pair that the EBS CSI addon uses by
# convention: kube-system/ebs-csi-controller-sa. Any other pod that tried
# to assume this role gets StsAccessDenied.
#
# Permissions policy: the AWS-managed AmazonEBSCSIDriverPolicy. Reviewed
# and updated by AWS; safer than handcrafting a narrower variant that
# inevitably gets stale on the next CSI driver release.
# =============================================================================

locals {
  ebs_csi_namespace       = "kube-system"
  ebs_csi_service_account = "ebs-csi-controller-sa"
}

data "aws_iam_policy_document" "ebs_csi_trust" {
  statement {
    actions = ["sts:AssumeRoleWithWebIdentity"]
    effect  = "Allow"

    principals {
      type        = "Federated"
      identifiers = [module.eks.oidc_provider_arn]
    }

    condition {
      test     = "StringEquals"
      variable = "${module.eks.oidc_provider_url}:sub"
      values   = ["system:serviceaccount:${local.ebs_csi_namespace}:${local.ebs_csi_service_account}"]
    }

    condition {
      test     = "StringEquals"
      variable = "${module.eks.oidc_provider_url}:aud"
      values   = ["sts.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "ebs_csi" {
  name               = "${var.cluster_name}-ebs-csi-role"
  description        = "IRSA role for the EBS CSI driver addon"
  assume_role_policy = data.aws_iam_policy_document.ebs_csi_trust.json

  tags = {
    Project   = "dsl"
    ManagedBy = "terraform"
    Component = "ebs-csi"
  }
}

resource "aws_iam_role_policy_attachment" "ebs_csi" {
  role       = aws_iam_role.ebs_csi.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonEBSCSIDriverPolicy"
}

# -----------------------------------------------------------------------------
# The EKS managed addon. addon_version is left implicit so EKS picks the
# default compatible version for the cluster's K8s version — keeps the lab
# from breaking on K8s upgrades. For prod pin it explicitly.
#
# IMPORTANT: depends_on the EKS node group so the addon is installed AFTER
# nodes exist; otherwise the controller pods have nowhere to schedule.
# -----------------------------------------------------------------------------
resource "aws_eks_addon" "ebs_csi" {
  cluster_name                = module.eks.cluster_name
  addon_name                  = "aws-ebs-csi-driver"
  service_account_role_arn    = aws_iam_role.ebs_csi.arn
  resolve_conflicts_on_create = "OVERWRITE"
  resolve_conflicts_on_update = "OVERWRITE"

  tags = {
    Project   = "dsl"
    ManagedBy = "terraform"
    Component = "ebs-csi"
  }

  depends_on = [
    module.eks,
    aws_iam_role_policy_attachment.ebs_csi,
  ]
}
