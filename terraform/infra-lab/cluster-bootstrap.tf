# =============================================================================
# cluster-bootstrap.tf — out-of-band cluster setup that Terraform manages
# but doesn't try to model as native resources.
#
# Two things live here:
#
# 1. A gp3 StorageClass applied to the cluster, marked as the default.
#    The EBS CSI addon ships a gp2-named SC but it uses the in-tree
#    provisioner kubernetes.io/aws-ebs which has been dead since K8s 1.23.
#    Without a working default SC, every PVC sits Pending with "no storage
#    class is set". This is what stalled the postgres pod in Phase 3b-4.
#
# 2. A pre-destroy hook that deletes K8s Ingress objects so the AWS
#    Load Balancer Controller has a chance to deprovision the ALBs it
#    created before Terraform tears down the cluster. Without it, ALBs
#    survive cluster destruction as AWS-side orphans, hold subnets +
#    IGW open via their ENIs, and block VPC deletion. Hit this 2026-05-07,
#    cost ~30min of manual cleanup.
#
# Both use null_resource + local-exec because they're operational hooks
# rather than persistent state. A "proper" prod approach would use the
# kubernetes provider with explicit dependency wiring, but for the lab
# this is simpler to read and reason about.
# =============================================================================

# -----------------------------------------------------------------------------
# 1. gp3 default StorageClass
# -----------------------------------------------------------------------------
# Triggers are what cause local-exec to rerun. We tie this to the EBS CSI
# addon being in place (so a fresh addon install retriggers the apply).
resource "null_resource" "gp3_storageclass" {
  triggers = {
    cluster_name  = module.eks.cluster_name
    ebs_csi_addon = aws_eks_addon.ebs_csi.id
  }

  provisioner "local-exec" {
    interpreter = ["bash", "-c"]
    command     = <<-EOT
      set -euo pipefail

      # Make sure kubectl is pointed at our cluster (idempotent — overwrites
      # any stale context for the same cluster name).
      aws eks update-kubeconfig \
        --region ${var.aws_region} \
        --name ${module.eks.cluster_name} \
        --no-cli-pager

      # Apply gp3 StorageClass as the default. server-side apply with
      # --force-conflicts handles re-apply cleanly.
      cat <<'YAML' | kubectl apply -f -
      apiVersion: storage.k8s.io/v1
      kind: StorageClass
      metadata:
        name: gp3
        annotations:
          storageclass.kubernetes.io/is-default-class: "true"
      provisioner: ebs.csi.aws.com
      volumeBindingMode: WaitForFirstConsumer
      allowVolumeExpansion: true
      reclaimPolicy: Delete
      parameters:
        type: gp3
        encrypted: "true"
      YAML

      # Unmark the legacy gp2 (uses dead in-tree provisioner) as default
      # if it ever was. The minus suffix on the annotation key removes it.
      kubectl annotate storageclass gp2 \
        storageclass.kubernetes.io/is-default-class- 2>/dev/null || true
    EOT
  }

  depends_on = [aws_eks_addon.ebs_csi]
}

# -----------------------------------------------------------------------------
# 2. Pre-destroy: delete all Ingresses + give ALBC ~60s to deprovision ALBs
# -----------------------------------------------------------------------------
# Important: this resource depends on the EKS cluster, so it will be
# destroyed BEFORE the cluster (Terraform destroys in reverse dependency
# order). when=destroy means the local-exec runs at that point.
#
# Notes:
#   - We can't kubectl against a cluster that no longer exists, so we use
#     a self-contained heredoc that's safe to run even if the K8s API is
#     already down. The `|| true` swallows transient failures.
#   - aws elbv2 fallback handles the case where ALBC was already gone
#     (e.g., previous failed destroy left orphans).
resource "null_resource" "predestroy_ingress_cleanup" {
  # `triggers` captures values needed in the destroy provisioner. Once a
  # resource is being destroyed, references to module outputs are no longer
  # resolvable — only `self.triggers.*` can be read. Bake everything needed
  # for the destroy script in here.
  triggers = {
    cluster_name = module.eks.cluster_name
    region       = var.aws_region
  }

  provisioner "local-exec" {
    when        = destroy
    interpreter = ["bash", "-c"]
    command     = <<-EOT
      set +e   # don't abort destroy if anything here fails

      echo "[predestroy] Refreshing kubeconfig..."
      aws eks update-kubeconfig \
        --region ${self.triggers.region} \
        --name ${self.triggers.cluster_name} \
        --no-cli-pager 2>/dev/null

      echo "[predestroy] Deleting all Ingresses cluster-wide..."
      kubectl delete ingress --all -A --ignore-not-found --wait=false 2>/dev/null
      sleep 60   # let ALBC's reconcile call elbv2:DeleteLoadBalancer

      # Belt-and-suspenders: directly delete any ALB still tagged for this cluster
      echo "[predestroy] Hunting for orphan ALBs..."
      for ALB_ARN in $(aws elbv2 describe-load-balancers --no-cli-pager \
                         --query "LoadBalancers[?contains(LoadBalancerName,'dsl')].LoadBalancerArn" \
                         --output text 2>/dev/null); do
        echo "[predestroy] Force-deleting orphan ALB: $ALB_ARN"
        aws elbv2 delete-load-balancer --no-cli-pager --load-balancer-arn "$ALB_ARN" 2>/dev/null
      done

      # Same for orphan target groups (deletable once their ALB is gone)
      for TG_ARN in $(aws elbv2 describe-target-groups --no-cli-pager \
                        --query "TargetGroups[?starts_with(TargetGroupName,'k8s-dsl-')].TargetGroupArn" \
                        --output text 2>/dev/null); do
        aws elbv2 delete-target-group --no-cli-pager --target-group-arn "$TG_ARN" 2>/dev/null
      done

      # Same for ALBC-created security groups in the VPC
      VPC_ID=$(aws ec2 describe-vpcs --no-cli-pager \
                 --filters Name=tag:Name,Values=dsl-eks-vpc \
                 --query "Vpcs[0].VpcId" --output text 2>/dev/null)
      if [ "$VPC_ID" != "None" ] && [ -n "$VPC_ID" ]; then
        for SG_ID in $(aws ec2 describe-security-groups --no-cli-pager \
                         --filters "Name=vpc-id,Values=$VPC_ID" \
                                   "Name=group-name,Values=k8s-*" \
                         --query "SecurityGroups[].GroupId" --output text 2>/dev/null); do
          echo "[predestroy] Deleting orphan SG: $SG_ID"
          aws ec2 delete-security-group --no-cli-pager --group-id "$SG_ID" 2>/dev/null
        done
      fi

      echo "[predestroy] Cleanup complete; terraform destroy can proceed."
      exit 0
    EOT
  }

  # Hooks into the EKS module so we run BEFORE its destruction.
  # Don't depend on cluster_name — that's a string and won't establish
  # dependency order. Depend on the cluster's identity output instead.
  depends_on = [module.eks]
}
