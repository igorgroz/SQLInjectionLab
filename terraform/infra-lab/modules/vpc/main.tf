# =============================================================================
# vpc/main.tf — VPC, subnets, NAT gateway, routing, and EKS subnet tags
#
# Security architecture:
#   ┌──────────────────────────────────────────┐
#   │  VPC  10.0.0.0/16                         │
#   │                                           │
#   │  Public subnets (AZ-a, AZ-b, AZ-c)        │
#   │    10.0.1.0/24  10.0.2.0/24  10.0.3.0/24  │
#   │    ALB ← IGW                              │
#   │    NAT GW (single, in AZ-a)               │
#   │                                           │
#   │  Private subnets (AZ-a, AZ-b, AZ-c)      │
#   │    10.0.16.0/20  10.0.32.0/20  10.0.48/20 │
#   │    EKS worker nodes + pods                │
#   │    Outbound via NAT GW only               │
#   └──────────────────────────────────────────┘
#
# Worker nodes in private subnets cannot be reached from the internet directly.
# The only inbound path for user traffic is:  Internet → IGW → ALB → backend pods.
# =============================================================================

# ─── VPC ─────────────────────────────────────────────────────────────────────

resource "aws_vpc" "main" {
  cidr_block = var.vpc_cidr

  # Required for EKS: each node needs a DNS hostname so the control plane
  # and pods can resolve service endpoints within the cluster.
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = merge(var.tags, {
    Name = "${var.cluster_name}-vpc"
  })
}

# ─── Internet Gateway ─────────────────────────────────────────────────────────
# IGW is attached to the VPC and provides a path for public subnets to reach
# the internet. Private subnets route through NAT GW, not IGW directly.

resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id

  tags = merge(var.tags, {
    Name = "${var.cluster_name}-igw"
  })
}

# ─── Public subnets ───────────────────────────────────────────────────────────
# map_public_ip_on_launch = true so ALB ENIs and NAT GW EIPs get public IPs.
# EKS worker nodes are NOT in public subnets — they're in private subnets below.
#
# EKS subnet tag (kubernetes.io/role/elb):
#   The AWS Load Balancer Controller (running inside EKS) uses this tag to
#   discover which subnets to place internet-facing ALBs into when you create
#   a Kubernetes Ingress resource. Without this tag, Ingress creation fails
#   with "no subnets found" — a very common gotcha.

resource "aws_subnet" "public" {
  count = length(var.azs)

  vpc_id                  = aws_vpc.main.id
  cidr_block              = var.public_subnet_cidrs[count.index]
  availability_zone       = var.azs[count.index]
  map_public_ip_on_launch = true # nosemgrep: terraform.aws.security.aws-subnet-has-public-ip-address
  # Public subnets intentionally assign public IPs — required for ALB ENIs and NAT
  # gateway Elastic IPs. Worker nodes are in private subnets and do NOT get public IPs.

  tags = merge(var.tags, {
    Name                                        = "${var.cluster_name}-public-${var.azs[count.index]}"
    "kubernetes.io/role/elb"                    = "1"
    "kubernetes.io/cluster/${var.cluster_name}" = "shared"
    Tier                                        = "public"
  })
}

# ─── Private subnets ──────────────────────────────────────────────────────────
# Worker nodes live here. No public IPs. Outbound traffic routes through NAT GW.
#
# EKS subnet tag (kubernetes.io/role/internal-elb):
#   Used by AWS LB Controller for internal/private ALBs. Our lab exposes the
#   app publicly so the internet-facing tag on public subnets is what matters,
#   but we tag both for completeness — production apps often have internal
#   services that shouldn't be internet-facing.

resource "aws_subnet" "private" {
  count = length(var.azs)

  vpc_id            = aws_vpc.main.id
  cidr_block        = var.private_subnet_cidrs[count.index]
  availability_zone = var.azs[count.index]

  tags = merge(var.tags, {
    Name                                        = "${var.cluster_name}-private-${var.azs[count.index]}"
    "kubernetes.io/role/internal-elb"           = "1"
    "kubernetes.io/cluster/${var.cluster_name}" = "shared"
    Tier                                        = "private"
  })
}

# ─── Elastic IP for NAT Gateway ───────────────────────────────────────────────
# NAT GW requires a static public IP. We allocate one EIP.
# If single_nat_gateway = false, we allocate one per AZ.

resource "aws_eip" "nat" {
  count  = var.single_nat_gateway ? 1 : length(var.azs)
  domain = "vpc"

  # Depends on IGW being attached first — EIP in a VPC requires an attached IGW.
  depends_on = [aws_internet_gateway.main]

  tags = merge(var.tags, {
    Name = var.single_nat_gateway
      ? "${var.cluster_name}-nat-eip"
      : "${var.cluster_name}-nat-eip-${var.azs[count.index]}"
  })
}

# ─── NAT Gateway ─────────────────────────────────────────────────────────────
# Single NAT GW in first public subnet = lab cost saving.
# Production pattern: one per AZ to survive an AZ failure.
# A dead NAT GW means all worker nodes in that AZ lose internet access
# (no ECR image pulls, no AWS API calls from pods without IRSA).

resource "aws_nat_gateway" "main" {
  count = var.single_nat_gateway ? 1 : length(var.azs)

  allocation_id = aws_eip.nat[count.index].id
  subnet_id     = aws_subnet.public[count.index].id

  tags = merge(var.tags, {
    Name = var.single_nat_gateway
      ? "${var.cluster_name}-nat"
      : "${var.cluster_name}-nat-${var.azs[count.index]}"
  })

  depends_on = [aws_internet_gateway.main]
}

# ─── Route tables ─────────────────────────────────────────────────────────────

# Public route table: default route → IGW
# All public subnets share one route table (they all need internet access the same way).

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }

  tags = merge(var.tags, {
    Name = "${var.cluster_name}-rt-public"
  })
}

resource "aws_route_table_association" "public" {
  count = length(var.azs)

  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

# Private route tables: default route → NAT GW
# With single NAT GW, all private subnets use one route table.
# With per-AZ NAT GW, each private subnet uses its own route table pointing
# to the NAT GW in the same AZ (avoids cross-AZ traffic charges).

resource "aws_route_table" "private" {
  count  = var.single_nat_gateway ? 1 : length(var.azs)
  vpc_id = aws_vpc.main.id

  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = var.single_nat_gateway
      ? aws_nat_gateway.main[0].id
      : aws_nat_gateway.main[count.index].id
  }

  tags = merge(var.tags, {
    Name = var.single_nat_gateway
      ? "${var.cluster_name}-rt-private"
      : "${var.cluster_name}-rt-private-${var.azs[count.index]}"
  })
}

resource "aws_route_table_association" "private" {
  count = length(var.azs)

  subnet_id = aws_subnet.private[count.index].id
  route_table_id = var.single_nat_gateway
    ? aws_route_table.private[0].id
    : aws_route_table.private[count.index].id
}

# ─── VPC Flow Logs ────────────────────────────────────────────────────────────
# Flow logs capture metadata about IP traffic to/from ENIs in the VPC.
# They don't capture payload (content), only: src/dst IP, port, protocol,
# bytes, packets, action (ACCEPT/REJECT).
#
# Security value:
#   - Post-incident forensics: which pod talked to which external IP
#   - Detect unexpected egress (data exfiltration patterns)
#   - Confirm security group rules are actually blocking what you think
#
# Lab choice: we create the log group but set 14-day retention (CloudWatch
# Logs storage has a cost). Production: send to S3 with S3 Intelligent-Tiering
# for long-term retention + Athena queries.

resource "aws_cloudwatch_log_group" "vpc_flow_logs" {
  name              = "/aws/vpc/flow-logs/${var.cluster_name}"
  retention_in_days = 14

  tags = merge(var.tags, {
    Name = "${var.cluster_name}-vpc-flow-logs"
  })
}

data "aws_iam_policy_document" "flow_logs_assume" {
  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["vpc-flow-logs.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "flow_logs" {
  name               = "${var.cluster_name}-vpc-flow-logs"
  assume_role_policy = data.aws_iam_policy_document.flow_logs_assume.json
}

data "aws_iam_policy_document" "flow_logs" {
  statement {
    effect = "Allow"
    actions = [
      "logs:CreateLogGroup",
      "logs:CreateLogStream",
      "logs:PutLogEvents",
      "logs:DescribeLogGroups",
      "logs:DescribeLogStreams",
    ]
    resources = ["*"]
  }
}

resource "aws_iam_role_policy" "flow_logs" {
  name   = "vpc-flow-logs-policy"
  role   = aws_iam_role.flow_logs.id
  policy = data.aws_iam_policy_document.flow_logs.json
}

resource "aws_flow_log" "main" {
  vpc_id          = aws_vpc.main.id
  traffic_type    = "ALL"   # ACCEPT, REJECT, or ALL — ALL gives full picture for forensics
  iam_role_arn    = aws_iam_role.flow_logs.arn
  log_destination = aws_cloudwatch_log_group.vpc_flow_logs.arn

  tags = merge(var.tags, {
    Name = "${var.cluster_name}-flow-log"
  })
}
