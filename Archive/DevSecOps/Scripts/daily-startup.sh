#!/bin/bash

# Exit immediately if a command exits with a non-zero status.
set -e
# Treat unset variables as an error when substituting.
set -u
# Pipefail ensures that a pipeline command returns a failure status if any command in the pipeline fails
set -o pipefail

# --- Get the directory where this script is located ---
SCRIPT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" &> /dev/null && pwd)

# --- Configuration ---
AWS_REGION="ap-southeast-2"
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
if [ -z "$AWS_ACCOUNT_ID" ]; then
    echo "ERROR: daily-startup.sh - Could not retrieve AWS Account ID. Ensure AWS CLI is configured."
    exit 1
fi

# RDS Configuration
RDS_INSTANCE_ID="sqlinjproject-db"

# EKS CloudFormation Stack Configuration
EKS_CFN_STACK_NAME="sqlinjpr-eks-cluster-stack"
EKS_CFN_TEMPLATE_PATH="${SCRIPT_DIR}/../Stacks/create-eks-cluster-for-app.yaml"

# EKS Cluster Parameters (used for CFN stack and passed to sub-script)
EKS_CLUSTER_NAME_PARAM="sqlinjpr-lab-eks"
VPC_ID_PARAM="vpc-06143697032bf986a"
APP_PRIV_SUBNET1_PARAM="subnet-0cb8f78e7475d05cb"
APP_PRIV_SUBNET2_PARAM="subnet-04ce18dfb77f6a1bf"
PUBLIC_SUBNET1_PARAM="subnet-0060eb44dff3f97d2"
PUBLIC_SUBNET2_PARAM="subnet-05ef5a56b6b80482e"
KEYPAIR_NAME_PARAM="sqlinjpr-keypair"
SSH_CIDR_PARAM="122.107.215.188/32" # Replace with your actual IP or a variable

# LBC Configuration
LBC_IAM_POLICY_ARN="arn:aws:iam::${AWS_ACCOUNT_ID}:policy/AWSLoadBalancerControllerIAMPolicy-Lab"
LBC_K8S_SA_NAME="aws-load-balancer-controller"
LBC_K8S_NAMESPACE="kube-system"
LBC_IAM_ROLE_NAME="AWSLoadBalancerControllerIAMRole-${EKS_CLUSTER_NAME_PARAM}"

# ESO Controller Configuration
ESO_CONTROLLER_IAM_ROLE_NAME="ExternalSecretsOperatorIAMRole-${EKS_CLUSTER_NAME_PARAM}"

# Application Namespace Secrets IRSA Configuration
APP_NAMESPACE_FOR_SECRETS="sqlinj-backend-ns"
APP_SECRETS_K8S_SA_NAME="sqlinj-backend-secrets-sa"
APP_SECRETS_IRSA_ROLE_NAME="SqlInjBackendNamespaceIAMRole-${EKS_CLUSTER_NAME_PARAM}"

# Application Specific (Passed to sub-script)
APP_IMAGE_TAG="latest" # Or derive this

# App Deployment Script
APP_DEPLOY_SCRIPT_PATH="${SCRIPT_DIR}/deploy-app-to-eks.sh"

# --- Helper Functions ---
log_info() {
    echo "INFO: $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_error() {
    echo "ERROR: $(date '+%Y-%m-%d %H:%M:%S') - $1" >&2
}

log_warn() {
    echo "WARN: $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

# --- Main Startup Logic ---
log_info "==============================================="
log_info "Starting Daily Lab Environment from ${SCRIPT_DIR}"
log_info "EKS Template will be sourced from: ${EKS_CFN_TEMPLATE_PATH}"
log_info "Using EKS Cluster Name: ${EKS_CLUSTER_NAME_PARAM}"
log_info "Using VPC ID: ${VPC_ID_PARAM}"
log_info "Using App Image Tag: ${APP_IMAGE_TAG}"
log_info "App Namespace K8s SA: ${APP_SECRETS_K8S_SA_NAME} for IAM Role: ${APP_SECRETS_IRSA_ROLE_NAME}"
log_info "ESO Controller IAM Role: ${ESO_CONTROLLER_IAM_ROLE_NAME}"
log_info "==============================================="
START_TIME=$(date +%s)

CURRENT_STEP=1
TOTAL_STEPS=6

# 1. Start RDS Instance
log_info "[${CURRENT_STEP}/${TOTAL_STEPS}] Starting RDS instance: $RDS_INSTANCE_ID..."
if aws rds describe-db-instances --db-instance-identifier "$RDS_INSTANCE_ID" --region "$AWS_REGION" --query "DBInstances[?DBInstanceStatus=='stopped']" --output text | grep -q "$RDS_INSTANCE_ID"; then
    aws rds start-db-instance --db-instance-identifier "$RDS_INSTANCE_ID" --region "$AWS_REGION"
    log_info "Waiting for RDS instance to become available (this can take up to 10 minutes)..."
    aws rds wait db-instance-available --db-instance-identifier "$RDS_INSTANCE_ID" --region "$AWS_REGION"
    log_info "RDS instance $RDS_INSTANCE_ID is available."
elif aws rds describe-db-instances --db-instance-identifier "$RDS_INSTANCE_ID" --region "$AWS_REGION" --query "DBInstances[?DBInstanceStatus=='available']" --output text | grep -q "$RDS_INSTANCE_ID"; then
    log_info "RDS instance $RDS_INSTANCE_ID is already available."
else
    RDS_STATUS_CHECK=$(aws rds describe-db-instances --db-instance-identifier "$RDS_INSTANCE_ID" --region "$AWS_REGION" --query "DBInstances[0].DBInstanceStatus" --output text 2>/dev/null || echo "NOT_FOUND")
    if [[ "$RDS_STATUS_CHECK" == "NOT_FOUND" ]]; then
        log_warn "RDS instance $RDS_INSTANCE_ID does not exist. Skipping RDS start."
    else
        log_warn "RDS instance $RDS_INSTANCE_ID is in state '$RDS_STATUS_CHECK'. Check RDS console. Skipping RDS start."
    fi
fi
CURRENT_STEP=$((CURRENT_STEP + 1))

# 2. Create/Ensure EKS Cluster CloudFormation Stack
log_info "[${CURRENT_STEP}/${TOTAL_STEPS}] Checking EKS CloudFormation stack: $EKS_CFN_STACK_NAME..."
if [ ! -f "$EKS_CFN_TEMPLATE_PATH" ]; then
    log_error "EKS CloudFormation template not found at: $EKS_CFN_TEMPLATE_PATH"
    exit 1
fi

STACK_EXISTS_STATUS=$(aws cloudformation describe-stacks --stack-name "$EKS_CFN_STACK_NAME" --region "$AWS_REGION" --query "Stacks[0].StackStatus" --output text 2>/dev/null || echo "NOT_FOUND")

if [[ "$STACK_EXISTS_STATUS" == "NOT_FOUND" ]]; then
    log_info "EKS stack $EKS_CFN_STACK_NAME does not exist. Creating..."
    aws cloudformation create-stack \
      --stack-name "$EKS_CFN_STACK_NAME" \
      --template-body "file://${EKS_CFN_TEMPLATE_PATH}" \
      --capabilities CAPABILITY_NAMED_IAM \
      --region "$AWS_REGION" \
      --parameters \
        ParameterKey=VpcId,ParameterValue="$VPC_ID_PARAM" \
        ParameterKey=AppPrivateSubnet1Id,ParameterValue="$APP_PRIV_SUBNET1_PARAM" \
        ParameterKey=AppPrivateSubnet2Id,ParameterValue="$APP_PRIV_SUBNET2_PARAM" \
        ParameterKey=PublicSubnet1Id,ParameterValue="$PUBLIC_SUBNET1_PARAM" \
        ParameterKey=PublicSubnet2Id,ParameterValue="$PUBLIC_SUBNET2_PARAM" \
        ParameterKey=EKSClusterName,ParameterValue="$EKS_CLUSTER_NAME_PARAM" \
        ParameterKey=EKSClusterVersion,ParameterValue="1.32" \
        ParameterKey=NodeInstanceType,ParameterValue="t3.medium" \
        ParameterKey=NodeDesiredCount,ParameterValue="1" \
        ParameterKey=KeyPairName,ParameterValue="$KEYPAIR_NAME_PARAM" \
        ParameterKey=MySshAccessCIDR,ParameterValue="$SSH_CIDR_PARAM"
    log_info "Waiting for EKS stack creation to complete (this can take 15-30 mins)..." # Increased estimated time
    aws cloudformation wait stack-create-complete --stack-name "$EKS_CFN_STACK_NAME" --region "$AWS_REGION"
    log_info "EKS cluster stack $EKS_CFN_STACK_NAME created."
elif [[ "$STACK_EXISTS_STATUS" == "CREATE_COMPLETE" || "$STACK_EXISTS_STATUS" == "UPDATE_COMPLETE" ]]; then
    log_info "EKS stack $EKS_CFN_STACK_NAME already exists and is in a good state ($STACK_EXISTS_STATUS)."
else
    log_error "EKS stack $EKS_CFN_STACK_NAME exists but is in state '$STACK_EXISTS_STATUS'. Manual intervention may be required."
    exit 1
fi
CURRENT_STEP=$((CURRENT_STEP + 1))

# 3. Configure IRSA Prerequisites for EKS Cluster
log_info "[${CURRENT_STEP}/${TOTAL_STEPS}] Configuring IRSA prerequisites for EKS cluster: $EKS_CLUSTER_NAME_PARAM..."
log_info "Associating IAM OIDC provider for cluster $EKS_CLUSTER_NAME_PARAM..."
if ! eksctl utils describe-iam-oidc-provider --cluster "$EKS_CLUSTER_NAME_PARAM" --region "$AWS_REGION" > /dev/null 2>&1; then
    eksctl utils associate-iam-oidc-provider --cluster "$EKS_CLUSTER_NAME_PARAM" --region "$AWS_REGION" --approve
    log_info "IAM OIDC provider associated."
else
    log_info "IAM OIDC provider already associated."
fi

OIDC_ISSUER_URL_NO_HTTPS=$(aws eks describe-cluster --name "$EKS_CLUSTER_NAME_PARAM" --region "$AWS_REGION" --query "cluster.identity.oidc.issuer" --output text | sed 's~https://~~')
if [ -z "$OIDC_ISSUER_URL_NO_HTTPS" ]; then
    log_error "Could not retrieve OIDC Issuer URL for cluster $EKS_CLUSTER_NAME_PARAM."
    exit 1
fi
log_info "OIDC Issuer URL identified: $OIDC_ISSUER_URL_NO_HTTPS"

log_info "Creating/Ensuring IAM Service Account for LBC ($LBC_K8S_SA_NAME in $LBC_K8S_NAMESPACE)..."
eksctl create iamserviceaccount \
  --cluster="$EKS_CLUSTER_NAME_PARAM" \
  --namespace="$LBC_K8S_NAMESPACE" \
  --name="$LBC_K8S_SA_NAME" \
  --role-name="$LBC_IAM_ROLE_NAME" \
  --attach-policy-arn="$LBC_IAM_POLICY_ARN" \
  --override-existing-serviceaccounts \
  --region "$AWS_REGION" \
  --approve
log_info "LBC IAM Service Account processed."

# Ensure ESO Controller IAM Role exists and update its trust policy
ESO_CONTROLLER_K8S_SA="external-secrets" # Default SA for ESO helm chart
ESO_CONTROLLER_K8S_NAMESPACE="external-secrets"
log_info "Ensuring IAM Role '$ESO_CONTROLLER_IAM_ROLE_NAME' for ESO controller..."
if ! aws iam get-role --role-name "$ESO_CONTROLLER_IAM_ROLE_NAME" > /dev/null 2>&1; then
    log_warn "ESO Controller IAM Role '$ESO_CONTROLLER_IAM_ROLE_NAME' not found. This role must be created MANUALLY with permissions for ESO to list/get secrets from AWS Secrets Manager."
    # Ideally, create it if you have a predefined policy ARN for it:
    # ESO_CONTROLLER_POLICY_ARN="arn:aws:iam::$AWS_ACCOUNT_ID:policy/YourESOPermissionsPolicy"
    # eksctl create iamserviceaccount \
    #   --cluster="$EKS_CLUSTER_NAME_PARAM" \
    #   --namespace="$ESO_CONTROLLER_K8S_NAMESPACE" \
    #   --name="$ESO_CONTROLLER_K8S_SA" \
    #   --role-name="$ESO_CONTROLLER_IAM_ROLE_NAME" \
    #   --attach-policy-arn="$ESO_CONTROLLER_POLICY_ARN" \
    #   --override-existing-serviceaccounts \
    #   --region "$AWS_REGION" \
    #   --approve
    # log_info "ESO Controller IAM Role and SA created by eksctl."
else
    log_info "ESO Controller IAM Role '$ESO_CONTROLLER_IAM_ROLE_NAME' found. Updating trust policy..."
    TRUST_POLICY_ESO_CONTROLLER_JSON=$(cat <<EOF
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Principal": {
                "Federated": "arn:aws:iam::${AWS_ACCOUNT_ID}:oidc-provider/${OIDC_ISSUER_URL_NO_HTTPS}"
            },
            "Action": "sts:AssumeRoleWithWebIdentity",
            "Condition": {
                "StringEquals": {
                    "${OIDC_ISSUER_URL_NO_HTTPS}:sub": "system:serviceaccount:${ESO_CONTROLLER_K8S_NAMESPACE}:${ESO_CONTROLLER_K8S_SA}",
                    "${OIDC_ISSUER_URL_NO_HTTPS}:aud": "sts.amazonaws.com"
                }
            }
        }
    ]
}
EOF
)
    aws iam update-assume-role-policy --role-name "$ESO_CONTROLLER_IAM_ROLE_NAME" --policy-document "$TRUST_POLICY_ESO_CONTROLLER_JSON"
    log_info "ESO Controller IAM Role trust policy updated."
fi

# Ensure Application Secrets IRSA Role exists and update its trust policy
log_info "Ensuring IAM Role '$APP_SECRETS_IRSA_ROLE_NAME' for Application Secrets..."
if ! aws iam get-role --role-name "$APP_SECRETS_IRSA_ROLE_NAME" > /dev/null 2>&1; then
    log_warn "Application Secrets IRSA Role '$APP_SECRETS_IRSA_ROLE_NAME' not found. This role must be created MANUALLY with permissions for the application's SecretStore to access specific AWS Secrets."
    # APP_SECRETS_POLICY_ARN="arn:aws:iam::$AWS_ACCOUNT_ID:policy/YourAppSecretsPermissionsPolicy"
    # eksctl create iamserviceaccount \
    #   --cluster="$EKS_CLUSTER_NAME_PARAM" \
    #   --namespace="$APP_NAMESPACE_FOR_SECRETS" \
    #   --name="$APP_SECRETS_K8S_SA_NAME" \
    #   --role-name="$APP_SECRETS_IRSA_ROLE_NAME" \
    #   --attach-policy-arn="$APP_SECRETS_POLICY_ARN" \
    #   --override-existing-serviceaccounts \
    #   --region "$AWS_REGION" \
    #   --approve
    # log_info "Application Secrets IRSA Role and SA created by eksctl."
else
    log_info "Application Secrets IRSA Role '$APP_SECRETS_IRSA_ROLE_NAME' found. Updating trust policy..."
    TRUST_POLICY_APP_SECRETS_JSON=$(cat <<EOF
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Principal": {
                "Federated": "arn:aws:iam::${AWS_ACCOUNT_ID}:oidc-provider/${OIDC_ISSUER_URL_NO_HTTPS}"
            },
            "Action": "sts:AssumeRoleWithWebIdentity",
            "Condition": {
                "StringEquals": {
                    "${OIDC_ISSUER_URL_NO_HTTPS}:sub": "system:serviceaccount:${APP_NAMESPACE_FOR_SECRETS}:${APP_SECRETS_K8S_SA_NAME}",
                    "${OIDC_ISSUER_URL_NO_HTTPS}:aud": "sts.amazonaws.com"
                }
            }
        }
    ]
}
EOF
)
    aws iam update-assume-role-policy --role-name "$APP_SECRETS_IRSA_ROLE_NAME" --policy-document "$TRUST_POLICY_APP_SECRETS_JSON"
    log_info "Application Namespace Secrets IRSA Role trust policy updated."
fi
CURRENT_STEP=$((CURRENT_STEP + 1))

# 4. Update Kubeconfig
log_info "[${CURRENT_STEP}/${TOTAL_STEPS}] Updating kubeconfig for cluster $EKS_CLUSTER_NAME_PARAM..."
aws eks update-kubeconfig --name "$EKS_CLUSTER_NAME_PARAM" --region "$AWS_REGION" --alias "$EKS_CLUSTER_NAME_PARAM"
log_info "Kubeconfig updated."
CURRENT_STEP=$((CURRENT_STEP + 1))

# 5. Deploy Backend Application to EKS
log_info "[${CURRENT_STEP}/${TOTAL_STEPS}] Running backend application deployment script from: $APP_DEPLOY_SCRIPT_PATH..."
if [ ! -f "$APP_DEPLOY_SCRIPT_PATH" ]; then
    log_error "Application deployment script not found at: $APP_DEPLOY_SCRIPT_PATH"
    exit 1
fi
# Pass all necessary parameters to the sub-script
bash "$APP_DEPLOY_SCRIPT_PATH" \
  "$EKS_CLUSTER_NAME_PARAM" \
  "$AWS_REGION" \
  "$VPC_ID_PARAM" \
  "$APP_IMAGE_TAG" \
  "$APP_SECRETS_K8S_SA_NAME" \
  "$APP_SECRETS_IRSA_ROLE_NAME" \
  "$ESO_CONTROLLER_IAM_ROLE_NAME"
CURRENT_STEP=$((CURRENT_STEP + 1))

# Final Summary
log_info "==============================================="
log_info "Daily Lab Environment startup process complete."
END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))
log_info "Total startup duration: $(date -u -d @${DURATION} +"%T")"
log_info "==============================================="