#!/bin/bash

# Exit immediately if a command exits with a non-zero status.
set -e
# Treat unset variables as an error when substituting.
set -u

# --- Configuration (Verify and update these paths and names) ---
EKS_CLUSTER_NAME="sqlinjpr-lab-eks"
AWS_REGION="ap-southeast-2"
# This script assumes it's run from the 'DevSecOps/Scripts/' directory.
# Adjust paths if running from a different location (e.g., project root).
APP_CHART_PATH="../Helm_Charts/sqlinj-backend-chart" # Relative path to your app's Helm chart

# --- AWS Account ID (dynamically fetched) ---
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
if [ -z "$AWS_ACCOUNT_ID" ]; then
    echo "ERROR: Could not retrieve AWS Account ID. Ensure AWS CLI is configured."
    exit 1
fi
echo "INFO: Using AWS Account ID: $AWS_ACCOUNT_ID"

# --- VPC ID (Needs to be the VPC where your EKS cluster runs) ---
# This value is crucial for the AWS Load Balancer Controller.
# You can get this from your EKS CloudFormation stack outputs or EC2/VPC console.
# Example: vpc-06143697032bf986a
VPC_ID="vpc-06143697032bf986a" # *** REPLACE WITH YOUR ACTUAL EKS CLUSTER VPC ID ***
if [ "$VPC_ID" == "vpc-YOUR_EKS_VPC_ID_HERE" ]; then
    echo "ERROR: Please replace 'vpc-YOUR_EKS_VPC_ID_HERE' with your actual EKS Cluster VPC ID in the script."
    exit 1
fi

# --- IAM Role ARNs for IRSA (CRITICAL: These roles must exist with correct policies and trust relationships) ---
LBC_IAM_ROLE_ARN="arn:aws:iam::${AWS_ACCOUNT_ID}:role/AWSLoadBalancerControllerIAMRole-${EKS_CLUSTER_NAME}" # Example naming
ESO_IAM_ROLE_ARN="arn:aws:iam::${AWS_ACCOUNT_ID}:role/ExternalSecretsOperatorIAMRole-${EKS_CLUSTER_NAME}" # Example naming

# --- Application Specific Helm Configuration ---
APP_HELM_RELEASE_NAME="sqlinj-backend"
APP_NAMESPACE="sqlinj-backend-ns" # Will be created by Helm if --create-namespace is used

# --- Helper Function to Add/Update Helm Repos ---
ensure_helm_repo() {
  local repo_name="$1"
  local repo_url="$2"
  if ! helm repo list | grep -q "^${repo_name}\s"; then
    echo "INFO: Adding Helm repo: $repo_name from $repo_url"
    helm repo add "$repo_name" "$repo_url"
  else
    echo "INFO: Helm repo '$repo_name' already exists."
  fi
  echo "INFO: Updating Helm repo '$repo_name'..."
  helm repo update "$repo_name"
}

# --- Main Deployment Logic ---

echo "INFO: Starting application deployment to EKS cluster: $EKS_CLUSTER_NAME in region $AWS_REGION"

# 1. Configure kubectl
echo "INFO: Configuring kubectl for cluster '$EKS_CLUSTER_NAME'..."
aws eks update-kubeconfig --name "$EKS_CLUSTER_NAME" --region "$AWS_REGION" --alias "$EKS_CLUSTER_NAME"
KUBE_CONTEXT="$EKS_CLUSTER_NAME" # Use the alias for kubectl context

echo "INFO: Verifying kubectl context and connectivity..."
kubectl --context "$KUBE_CONTEXT" cluster-info # Simple check

# 2. Ensure Helm is installed
echo "INFO: Checking for Helm CLI..."
if ! command -v helm &> /dev/null; then
    echo "ERROR: helm CLI could not be found. Please install Helm."
    exit 1
fi
echo "INFO: Helm CLI found."

# 3. Install/Upgrade AWS Load Balancer Controller (LBC)
LBC_HELM_RELEASE_NAME="aws-load-balancer-controller"
LBC_NAMESPACE="kube-system" # LBC is typically installed in kube-system
LBC_K8S_SERVICE_ACCOUNT_NAME="aws-load-balancer-controller" # Default SA name for LBC

echo "INFO: Ensuring AWS Load Balancer Controller Helm chart in namespace '$LBC_NAMESPACE'..."
ensure_helm_repo "eks" "https://aws.github.io/eks-charts"

# The LBC ServiceAccount 'aws-load-balancer-controller' in 'kube-system' MUST
# already exist and be annotated with the LBC_IAM_ROLE_ARN for IRSA.
# This is typically done via `eksctl create iamserviceaccount` or by adding an
# `AWS::IAM::Role` and `AWS::EKS::FargateProfile` (for SA annotation) or `AWS::EKS::AccessEntry` to your EKS CFN.
# If the SA doesn't exist and isn't annotated, this Helm install might fail or LBC won't work.
helm upgrade --install "$LBC_HELM_RELEASE_NAME" eks/aws-load-balancer-controller \
  --namespace "$LBC_NAMESPACE" \
  --set clusterName="$EKS_CLUSTER_NAME" \
  --set serviceAccount.create=false \
  --set serviceAccount.name="$LBC_K8S_SERVICE_ACCOUNT_NAME" \
  --set region="$AWS_REGION" \
  --set vpcId="$VPC_ID" \
  --wait --timeout 10m
echo "INFO: AWS Load Balancer Controller Helm chart deployment processed."

# 4. Install/Upgrade ExternalSecrets Operator (ESO)
ESO_HELM_RELEASE_NAME="external-secrets"
ESO_NAMESPACE="external-secrets" # ESO typically installed in its own namespace
ESO_K8S_SERVICE_ACCOUNT_NAME="external-secrets" # Default SA name if chart creates it

echo "INFO: Ensuring ExternalSecrets Operator Helm chart in namespace '$ESO_NAMESPACE'..."
ensure_helm_repo "external-secrets" "https://charts.external-secrets.io"

helm upgrade --install "$ESO_HELM_RELEASE_NAME" external-secrets/external-secrets \
  --namespace "$ESO_NAMESPACE" \
  --create-namespace \
  --set installCRDs=true \
  --set serviceAccount.create=true \
  --set serviceAccount.name="$ESO_K8S_SERVICE_ACCOUNT_NAME" \
  --set serviceAccount.annotations."eks\.amazonaws\.com/role-arn"="$ESO_IAM_ROLE_ARN" \
  --wait --timeout 10m
echo "INFO: ExternalSecrets Operator Helm chart deployment processed."

# 5. Deploy Backend Application using its Helm Chart
echo "INFO: Deploying backend application ('$APP_HELM_RELEASE_NAME') from chart at '$APP_CHART_PATH' into namespace '$APP_NAMESPACE'..."

# You can pass values using --set or by creating a specific values file for this deployment
# e.g., --values ./my-lab-values.yaml
# For simplicity, we'll use --set for key values here.
# The values defined in your chart's values.yaml will be used as defaults.
helm upgrade --install "$APP_HELM_RELEASE_NAME" "$APP_CHART_PATH" \
  --namespace "$APP_NAMESPACE" \
  --create-namespace \
  --set image.tag="1205251806" `# Using your specific timestamped tag` \
  --set awsRegion="$AWS_REGION" `# Pass region to chart for SecretStore` \
  --set awsAccountId="$AWS_ACCOUNT_ID" `# Pass accountId to chart for image URI if needed, though already in values.yaml` \
  `# Other values like RDS host, secret names are taken from the chart's values.yaml` \
  `# If your chart's values.yaml doesn't have the correct ECR repo for the image, set it here:` \
  `# --set image.repository="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/my-sqlinj-backend"` \
  --wait --timeout 10m
echo "INFO: Backend application Helm chart deployment processed."

# 6. Wait for application deployment to be ready
APP_DEPLOYMENT_NAME="${APP_HELM_RELEASE_NAME}-deployment" # Based on chart template naming convention
echo "INFO: Waiting for application deployment '$APP_DEPLOYMENT_NAME' in namespace '$APP_NAMESPACE' to be ready (max 5 mins)..."
kubectl --context "$KUBE_CONTEXT" rollout status "deployment/${APP_DEPLOYMENT_NAME}" -n "$APP_NAMESPACE" --timeout=5m
echo "INFO: Application deployment '$APP_DEPLOYMENT_NAME' is ready."

# 7. Retrieve and display Ingress hostname
APP_INGRESS_NAME="${APP_HELM_RELEASE_NAME}-ingress" # Based on chart template naming convention
echo "INFO: Attempting to retrieve Ingress hostname for '$APP_INGRESS_NAME'..."
INGRESS_HOSTNAME=""
for i in {1..18}; do # Try for 3 minutes (18 * 10 seconds)
    INGRESS_HOSTNAME=$(kubectl --context "$KUBE_CONTEXT" get ingress "$APP_INGRESS_NAME" -n "$APP_NAMESPACE" -o jsonpath='{.status.loadBalancer.ingress[0].hostname}' 2>/dev/null || true)
    if [ -n "$INGRESS_HOSTNAME" ]; then
        # Get path from Helm chart's default values (requires yq and helm show values)
        # For simplicity, hardcoding /api which is the default in your values.yaml
        APP_PATH="/api"
        echo "-------------------------------------------------------------------------"
        echo "SUCCESS: Backend Ingress (ALB) endpoint should be available at:"
        echo "http://${INGRESS_HOSTNAME}${APP_PATH}"
        echo "-------------------------------------------------------------------------"
        break
    fi
    echo -n ". (waiting for Ingress hostname for '$APP_INGRESS_NAME') "
    sleep 10
    if [ "$i" -eq 18 ]; then
        echo ""
        echo "WARN: Could not retrieve Ingress hostname after 3 minutes."
        echo "The ALB might still be provisioning. Check the AWS Console -> EC2 -> Load Balancers."
        echo "You can also check the LBC logs: kubectl logs -n kube-system deployment/aws-load-balancer-controller"
        echo "And Ingress status: kubectl describe ingress $APP_INGRESS_NAME -n $APP_NAMESPACE"
    fi
done

echo "INFO: Deployment script finished."