# =============================================================================
# eks/main.tf — EKS cluster, managed node group, and OIDC provider
#
# Security decisions and their rationale are documented inline.
#
# Key concepts:
#   OIDC provider — the trust anchor for IRSA. EKS generates JWT tokens for
#   pods; AWS IAM verifies those tokens via the OIDC endpoint and exchanges
#   them for temporary AWS credentials. No long-lived access keys anywhere.
#
#   Cluster IAM role — allows the EKS control plane to manage AWS resources
#   on your behalf (register nodes, create ENIs, update load balancers).
#
#   Node IAM role — instance profile attached to worker EC2 nodes. Gives nodes
#   permission to join the cluster and pull container images from ECR.
#   Application pods should NOT rely on this role for AWS access — use IRSA.
# =============================================================================

data "aws_caller_identity" "current" {}
data "aws_region" "current" {}

# =============================================================================
# Security Groups
# =============================================================================

# Control plane security group — controls what can talk to the EKS API server.
# EKS creates additional managed security groups; this is the "additional" SG
# that we control, separate from the EKS-managed cluster security group.

resource "aws_security_group" "cluster" {
  name        = "${var.cluster_name}-cluster-sg"
  description = "EKS cluster control plane security group"
  vpc_id      = var.vpc_id

  tags = merge(var.tags, {
    Name = "${var.cluster_name}-cluster-sg"
  })
}

# Allow nodes to call the API server (kubelet, kubectl via worker nodes).
# Port 443 = HTTPS, which is all Kubernetes API traffic.
resource "aws_security_group_rule" "cluster_inbound_nodes" {
  type                     = "ingress"
  from_port                = 443
  to_port                  = 443
  protocol                 = "tcp"
  source_security_group_id = aws_security_group.nodes.id
  security_group_id        = aws_security_group.cluster.id
  description              = "Nodes to API server"
}

# Node security group — applied to all worker node ENIs.
resource "aws_security_group" "nodes" {
  name        = "${var.cluster_name}-nodes-sg"
  description = "EKS worker nodes security group"
  vpc_id      = var.vpc_id

  tags = merge(var.tags, {
    Name                                        = "${var.cluster_name}-nodes-sg"
    "kubernetes.io/cluster/${var.cluster_name}" = "owned"
  })
}

# Node-to-node: all traffic within the node group (pod networking, kubelet comms).
resource "aws_security_group_rule" "nodes_internal" {
  type              = "ingress"
  from_port         = 0
  to_port           = 0
  protocol          = "-1"
  self              = true
  security_group_id = aws_security_group.nodes.id
  description       = "Node-to-node communication"
}

# API server to nodes: control plane initiates connections for webhooks and exec.
resource "aws_security_group_rule" "nodes_from_cluster" {
  type                     = "ingress"
  from_port                = 0
  to_port                  = 65535
  protocol                 = "tcp"
  source_security_group_id = aws_security_group.cluster.id
  security_group_id        = aws_security_group.nodes.id
  description              = "API server to nodes"
}

# Nodes egress: unrestricted outbound (NAT GW controls actual internet access).
# More restrictive: limit to 443 (ECR, Secrets Manager) + DNS. But this can
# break unexpected tooling during lab exploration. Document and scope in Phase 5.
resource "aws_security_group_rule" "nodes_egress" {
  type              = "egress"
  from_port         = 0
  to_port           = 0
  protocol          = "-1"
  cidr_blocks       = ["0.0.0.0/0"]
  security_group_id = aws_security_group.nodes.id
  description       = "Node egress (outbound via NAT GW)"
}

# =============================================================================
# IAM — Cluster role
# =============================================================================
# The EKS control plane assumes this role to make AWS API calls:
#   - Register/deregister EC2 nodes in the cluster
#   - Create and attach ENIs for VPC CNI
#   - Update ALB target groups when pods are added/removed

data "aws_iam_policy_document" "cluster_assume" {
  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["eks.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "cluster" {
  name               = "${var.cluster_name}-cluster-role"
  assume_role_policy = data.aws_iam_policy_document.cluster_assume.json
  description        = "EKS control plane IAM role for ${var.cluster_name}"
}

# AWS-managed policies for EKS cluster operation — these are the minimum
# required. In production, audit what each policy allows and consider whether
# custom least-privilege policies are warranted.
resource "aws_iam_role_policy_attachment" "cluster_eks_policy" {
  role       = aws_iam_role.cluster.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSClusterPolicy"
}

# =============================================================================
# IAM — Node group role
# =============================================================================
# EC2 instances in the node group use this role as their instance profile.
# This is the identity at the NODE level. Individual pods should use IRSA,
# not node-level credentials — the node role should have only what nodes need
# to function (join cluster + pull images), not what apps need.
#
# Security note: Any pod can access the EC2 instance metadata endpoint
# (169.254.169.254) unless you configure IMDSv2-only and block pods from
# reaching it. We set http_put_response_hop_limit=1 on the launch template
# (below) to ensure only the node itself can get instance metadata, not pods
# that hop through the node's network namespace.

data "aws_iam_policy_document" "node_assume" {
  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["ec2.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "nodes" {
  name               = "${var.cluster_name}-node-role"
  assume_role_policy = data.aws_iam_policy_document.node_assume.json
  description        = "EKS worker node IAM role for ${var.cluster_name}"
}

# Required: allows nodes to call EKS APIs (register, health checks)
resource "aws_iam_role_policy_attachment" "nodes_worker_policy" {
  role       = aws_iam_role.nodes.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSWorkerNodePolicy"
}

# Required: VPC CNI (aws-node DaemonSet) needs this to manage ENIs for pod networking
resource "aws_iam_role_policy_attachment" "nodes_cni_policy" {
  role       = aws_iam_role.nodes.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKS_CNI_Policy"
}

# Required: nodes need to pull container images from ECR (your private registry)
resource "aws_iam_role_policy_attachment" "nodes_ecr_policy" {
  role       = aws_iam_role.nodes.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly"
}

# SSM Session Manager — allows you to shell into nodes without opening SSH ports.
# Production security best practice: no SSH access, all node access via SSM.
# This replaces the need for a bastion host for node-level debugging.
resource "aws_iam_role_policy_attachment" "nodes_ssm" {
  role       = aws_iam_role.nodes.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

# =============================================================================
# EKS Cluster
# =============================================================================

resource "aws_eks_cluster" "main" {
  name     = var.cluster_name
  version  = var.cluster_version
  role_arn = aws_iam_role.cluster.arn

  vpc_config {
    subnet_ids              = concat(var.private_subnet_ids, var.public_subnet_ids)
    security_group_ids      = [aws_security_group.cluster.id]
    endpoint_private_access = true   # always enable private access

    # Public access: true for lab convenience, false in production.
    # With public access, the API server is reachable from the internet
    # (authenticated via AWS SigV4). With private only, you need VPN or
    # AWS PrivateLink to reach the API server.
    endpoint_public_access  = var.enable_cluster_endpoint_public_access
    public_access_cidrs     = var.cluster_endpoint_public_access_cidrs
  }

  # API_AND_CONFIG_MAP: enables the new EKS Access Entries API (required for
  # aws_eks_access_entry resources) while keeping the legacy aws-auth ConfigMap
  # as a fallback. "API" alone would remove ConfigMap support entirely — not
  # worth the disruption for a lab. Production recommendation: migrate to "API"
  # once all access is managed via Access Entries.
  access_config {
    authentication_mode = "API_AND_CONFIG_MAP"
  }

  # Audit logs are critical for security monitoring. Enable them from day one.
  # api       — every kubectl command, RBAC decision
  # audit     — detailed request log with user, source IP, resource, verb
  # authenticator — AWS IAM → K8s identity mapping (STS calls)
  # controllerManager, scheduler — useful for troubleshooting, less security value
  #
  # These go to CloudWatch Logs. Production: also forward to a SIEM.
  enabled_cluster_log_types = ["api", "audit", "authenticator", "controllerManager", "scheduler"]

  # Encryption config for Kubernetes Secrets at rest.
  # Without this, Secrets in etcd are base64-encoded (not encrypted).
  # With this, they're encrypted with a KMS key.
  #
  # Lab note: We're omitting KMS envelope encryption here to keep Phase 3a
  # focused. It requires creating a KMS key and granting the cluster role
  # kms:Encrypt/Decrypt. We'll use Secrets Manager + IRSA instead for
  # sensitive values — that's a stronger pattern anyway.
  # Production: add encryption_config block with a CMK.

  tags = merge(var.tags, {
    Name = var.cluster_name
  })

  depends_on = [
    aws_iam_role_policy_attachment.cluster_eks_policy,
    aws_cloudwatch_log_group.cluster,
  ]
}

# Explicit log group with retention. Without this, EKS creates the group
# with infinite retention (cost accumulation).
resource "aws_cloudwatch_log_group" "cluster" {
  name              = "/aws/eks/${var.cluster_name}/cluster"
  retention_in_days = 14

  tags = merge(var.tags, {
    Name = "${var.cluster_name}-eks-logs"
  })
}

# =============================================================================
# OIDC Provider — trust anchor for IRSA
# =============================================================================
#
# How IRSA works (important concept):
#   1. Pod is assigned a ServiceAccount with an IRSA annotation pointing to an IAM role.
#   2. EKS injects a projected volume into the pod with a JWT token signed by this
#      OIDC issuer. The token has the ServiceAccount name as the subject claim.
#   3. When the pod calls an AWS service, the AWS SDK calls sts:AssumeRoleWithWebIdentity
#      passing the JWT token.
#   4. AWS IAM verifies the JWT signature against the OIDC provider's public key
#      (fetched from the OIDC endpoint), checks the role's trust policy conditions
#      (which reference the exact ServiceAccount), and returns temporary credentials.
#
# This is Zero Trust at the pod identity level: each pod gets its own scoped
# credentials, credentials rotate automatically (15-minute STS tokens), and
# there are no long-lived access keys anywhere in the cluster.

data "tls_certificate" "eks_oidc" {
  url = aws_eks_cluster.main.identity[0].oidc[0].issuer
}

resource "aws_iam_openid_connect_provider" "eks" {
  client_id_list  = ["sts.amazonaws.com"]
  thumbprint_list = [data.tls_certificate.eks_oidc.certificates[0].sha1_fingerprint]
  url             = aws_eks_cluster.main.identity[0].oidc[0].issuer

  tags = merge(var.tags, {
    Name = "${var.cluster_name}-oidc-provider"
  })
}

# =============================================================================
# Managed Node Group
# =============================================================================
#
# Managed node group vs self-managed:
#   Managed = AWS handles node lifecycle (OS patches via AMI updates, graceful
#   drain on scale-in, automatic replacement of unhealthy nodes). You define
#   the desired state, AWS enforces it. Much less operational overhead.
#
#   Self-managed = you bring your own EC2 instances. Full control but you own
#   patching, replacement, draining. Rarely justified except for specialised
#   hardware (GPU, Graviton-specific AMIs).

resource "aws_eks_node_group" "main" {
  cluster_name    = aws_eks_cluster.main.name
  node_group_name = "${var.cluster_name}-workers"
  node_role_arn   = aws_iam_role.nodes.arn

  # Worker nodes go into private subnets — they're not internet-facing.
  subnet_ids = var.private_subnet_ids

  # Amazon Linux 2 is the standard EKS-optimised AMI. It ships with:
  # - kubelet, container runtime (containerd), VPC CNI pre-installed
  # - Kernel configured for container workloads
  # AL2023 is the newer option; AL2 has broader community testing at this point.
  #
  # Note: disk_size cannot be set here when a launch_template is provided.
  # Disk sizing is in the launch template's block_device_mappings below.
  ami_type       = "AL2_x86_64"
  instance_types = [var.node_instance_type]

  scaling_config {
    desired_size = var.node_desired_size
    min_size     = var.node_min_size
    max_size     = var.node_max_size
  }

  # FORCE_NEW_DEPLOYMENT — when updating to a new AMI version, how to handle
  # existing nodes. FORCE_NEW_DEPLOYMENT replaces nodes immediately.
  # Production alternative: LAUNCH_TEMPLATE_VERSION with surge or drain strategy.
  update_config {
    max_unavailable = 1
  }

  # Launch template: sets IMDSv2 requirements and hop limit.
  # This is the critical node-level metadata security control.
  launch_template {
    id      = aws_launch_template.nodes.id
    version = aws_launch_template.nodes.latest_version
  }

  tags = merge(var.tags, {
    Name = "${var.cluster_name}-workers"
  })

  depends_on = [
    aws_iam_role_policy_attachment.nodes_worker_policy,
    aws_iam_role_policy_attachment.nodes_cni_policy,
    aws_iam_role_policy_attachment.nodes_ecr_policy,
  ]

  lifecycle {
    ignore_changes = [scaling_config[0].desired_size]
  }
}

# =============================================================================
# Launch Template — IMDSv2 enforcement
# =============================================================================
#
# EC2 Instance Metadata Service (IMDS) provides instance metadata including
# the IAM role credentials. The default IMDSv1 is vulnerable to SSRF attacks:
# an attacker who can make HTTP requests from inside a pod can reach
# http://169.254.169.254/latest/meta-data/iam/security-credentials/ROLE_NAME
# and steal the node's IAM credentials.
#
# IMDSv2 mitigations:
#   1. Requires a PUT request to get a session token before GET requests work.
#      SSRF via HTTP GET (the common case) cannot get the token.
#   2. http_put_response_hop_limit = 1 means the token request TTL is 1 hop.
#      Pod → node's network namespace = 2 hops (pod's veth + node's eth0).
#      So pods cannot reach IMDS even if they try IMDSv2. Only the node itself
#      (hop count 0) can reach IMDS.
#
# This means pods MUST use IRSA for AWS credentials — they literally cannot
# fall back to node credentials. Belt and suspenders.

resource "aws_launch_template" "nodes" {
  name_prefix = "${var.cluster_name}-nodes-"
  description = "Launch template for EKS node group - enforces IMDSv2"

  # Root EBS volume — must be defined here when launch_template is used with
  # a managed node group (disk_size on the node group resource is not allowed).
  # gp3 is cheaper and faster than gp2 for the same size.
  # encrypted = true: EBS encryption at rest — lab and production posture.
  block_device_mappings {
    device_name = "/dev/xvda"   # AL2 root device name

    ebs {
      volume_size           = var.node_disk_size_gb
      volume_type           = "gp3"
      delete_on_termination = true
      encrypted             = true
    }
  }

  metadata_options {
    http_endpoint               = "enabled"
    http_tokens                 = "required"    # IMDSv2 only — required is the key setting
    http_put_response_hop_limit = 1             # blocks pod IMDS access
    instance_metadata_tags      = "enabled"     # allows instances to query their own tags
  }

  # Tag EBS volumes so they're identifiable in the console and can be
  # targeted by resource-level IAM policies if needed.
  tag_specifications {
    resource_type = "instance"
    tags = merge(var.tags, {
      Name = "${var.cluster_name}-worker-node"
    })
  }

  tag_specifications {
    resource_type = "volume"
    tags = merge(var.tags, {
      Name = "${var.cluster_name}-worker-node-volume"
    })
  }

  lifecycle {
    create_before_destroy = true
  }
}

# =============================================================================
# aws-auth ConfigMap — authorise nodes to join the cluster
# =============================================================================
# When a worker node bootstraps, it calls the EKS API using its node IAM role.
# For the API server to allow it, the node role must be mapped in the
# aws-auth ConfigMap in the kube-system namespace.
#
# This is one of EKS's more confusing aspects: IAM authentication + K8s RBAC
# are two separate systems and aws-auth is the bridge. If this is missing,
# nodes join as NotReady and stay that way.
#
# Important note: aws-auth is being replaced by EKS Access Entries (GA in 2024),
# which allows managing cluster access entirely through AWS APIs without
# touching in-cluster ConfigMaps. We use the ConfigMap approach here as it
# works across all EKS versions and is well-understood.

resource "aws_eks_access_entry" "nodes" {
  cluster_name  = aws_eks_cluster.main.name
  principal_arn = aws_iam_role.nodes.arn
  type          = "EC2_LINUX"

  tags = var.tags
}
