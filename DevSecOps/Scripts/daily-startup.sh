#!/bin/bash

# Exit immediately if a command exits with a non-zero status.
set -e
# Treat unset variables as an error when substituting.
set -u

# --- Configuration ---
AWS_REGION="ap-southeast-2"
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
if [ -z "$AWS_ACCOUNT_ID" ]; then
    echo "ERROR: Could not retrieve AWS Account ID. Ensure AWS CLI is configured."
    exit 1
fi

# RDS Configuration
RDS_INSTANCE_ID="sqlinjproject-db" # This is likely the DBInstanceIdentifier used when creating RDS

# EKS CloudFormation Stack Configuration
EKS_CFN_STACK_NAME="sqlinjpr-eks-cluster-stack"
# Relative path from this script (DevSecOps/Scripts/) to the EKS CFN template
EKS_CFN_TEMPLATE_PATH="../CloudFormation/EKS/create-eks-cluster-for-app.yaml" # ** VERIFY THIS PATH **

# EKS Cluster Parameters (must match those in create-eks-cluster-for-app.yaml)
EKS_CLUSTER_NAME_PARAM="sqlinjpr-lab-eks"
VPC_ID_PARAM="vpc-06143697032bf986a" # <<< From your output
APP_PRIV_SUBNET1_PARAM="subnet-0cb8f78e7475d05cb" # <<< From your output (PrivateSubnet1Id)
APP_PRIV_SUBNET2_PARAM="subnet-04ce18dfb77f6a1bf" # <<< From your output (PrivateSubnet2Id)
PUBLIC_SUBNET1_PARAM="subnet-0060eb44dff3f97d2"     # <<< From your output (PublicSubnet1Id)
PUBLIC_SUBNET2_PARAM="subnet-05ef5a56b6b80482e"     # <<< From your output (PublicSubnet2Id)
KEYPAIR_NAME_PARAM="sqlinjpr-keypair"                 # ** REPLACE IF DIFFERENT, OR MAKE OPTIONAL IF NOT USING **
SSH_CIDR_PARAM="<YOUR_IP_FOR_SSH_ACCESS_TO_NODES/32>" # ** YOU STILL NEED TO REPLACE THIS with your actual IP/32 **

# LBC Configuration
LBC_IAM_POLICY_ARN="arn:aws:iam::${AWS_ACCOUNT_ID}:policy/AWSLoadBalancerControllerIAMPolicy-Lab" # Policy created earlier
LBC_K8S_SA_NAME="aws-load-balancer-controller"
LBC_K8S_NAMESPACE="kube-system"
LBC_IAM_ROLE_NAME="AWSLoadBalancerControllerIAMRole-${EKS_CLUSTER_NAME_PARAM}" # Explicit role name for eksctl

# ESO Configuration
ESO_IAM_ROLE_NAME="ExternalSecretsOperatorIAMRole-${EKS_CLUSTER_NAME_PARAM}" # Role created earlier

# App Deployment Script
# Relative path from this script (DevSecOps/Scripts/) to the app deployment script
APP_DEPLOY_SCRIPT_PATH="./deploy-app-to-eks.sh" # It's in the same directory

# --- Helper: Check if OpenVPN Server Stack needs creation/start ---
# (You can add logic here if you manage OpenVPN via a script/CFN)

# --- Main Startup Logic ---
echo "INFO: ==============================================="
echo "INFO: Starting Daily Lab Environment..."
echo "INFO: ==============================================="
START_TIME=$(date +%s)

# 1. Start RDS Instance
echo "INFO: [1/5] Starting RDS instance: $RDS_INSTANCE_ID..."
if aws rds describe-db-instances --db-instance-identifier "$RDS_INSTANCE_ID" --region "$AWS_REGION" --query "DBInstances[?DBInstanceStatus=='stopped']" --output text | grep -q "$RDS_INSTANCE_ID"; then
    aws rds start-db-instance --db-instance-identifier "$RDS_INSTANCE_ID" --region "$AWS_REGION"
    echo "INFO: Waiting for RDS instance to become available (this can take a few minutes)..."
    aws rds wait db-instance-available --db-instance-identifier "$RDS_INSTANCE_ID" --region "$AWS_REGION"
    echo "INFO: RDS instance $RDS_INSTANCE_ID is available."
elif aws rds describe-db-instances --db-instance-identifier "$RDS_INSTANCE_ID" --region "$AWS_REGION" --query "DBInstances[?DBInstanceStatus=='available']" --output text | grep -q "$RDS_INSTANCE_ID"; then
    echo "INFO: RDS instance $RDS_INSTANCE_ID is already available."
else
    echo "WARN: RDS instance $RDS_INSTANCE_ID is in an unexpected state or does not exist. Check RDS console."
fi

# 2. Create/Ensure EKS Cluster CloudFormation Stack
echo "INFO: [2/5] Checking EKS CloudFormation stack: $EKS_CFN_STACK_NAME..."
if ! aws cloudformation describe-stacks --stack-name "$EKS_CFN_STACK_NAME" --region "$AWS_REGION" > /dev/null 2>&1; then
    echo "INFO: EKS stack $EKS_CFN_STACK_NAME does not exist. Creating..."
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
        ParameterKey=NodeInstanceType,ParameterValue="t3.micro" \
        ParameterKey=NodeDesiredCount,ParameterValue="1" \
        ParameterKey=KeyPairName,ParameterValue="$KEYPAIR_NAME_PARAM" \
        ParameterKey=MySshAccessCIDR,ParameterValue="$SSH_CIDR_PARAM"
    
    echo "INFO: Waiting for EKS stack creation to complete (this can take 15-25 mins)..."
    aws cloudformation wait stack-create-complete --stack-name "$EKS_CFN_STACK_NAME" --region "$AWS_REGION"
    echo "INFO: EKS cluster stack $EKS_CFN_STACK_NAME created."
else
    STACK_STATUS=$(aws cloudformation describe-stacks --stack-name "$EKS_CFN_STACK_NAME" --region "$AWS_REGION" --query "Stacks[0].StackStatus" --output text)
    if [[ "$STACK_STATUS" == "CREATE_COMPLETE" || "$STACK_STATUS" == "UPDATE_COMPLETE" ]]; then
        echo "INFO: EKS stack $EKS_CFN_STACK_NAME already exists and is in a good state ($STACK_STATUS)."
    else
        echo "ERROR: EKS stack $EKS_CFN_STACK_NAME exists but is in state '$STACK_STATUS'. Manual intervention may be required."
        exit 1
    fi
fi

# 3. Configure IRSA Prerequisites for the new EKS Cluster instance
echo "INFO: [3/5] Configuring IRSA prerequisites for EKS cluster: $EKS_CLUSTER_NAME_PARAM..."

# 3a. Associate IAM OIDC Provider
echo "INFO: Associating IAM OIDC provider for cluster $EKS_CLUSTER_NAME_PARAM..."
eksctl utils associate-iam-oidc-provider --cluster "$EKS_CLUSTER_NAME_PARAM" --region "$AWS_REGION" --approve
echo "INFO: IAM OIDC provider associated."

# 3b. Create/Ensure LBC IAM Role & Service Account
echo "INFO: Creating/Ensuring IAM Service Account for LBC ($LBC_K8S_SA_NAME in $LBC_K8S_NAMESPACE)..."
eksctl create iamserviceaccount \
  --cluster="$EKS_CLUSTER_NAME_PARAM" \
  --namespace="$LBC_K8S_NAMESPACE" \
  --name="$LBC_K8S_SA_NAME" \
  --role-name="$LBC_IAM_ROLE_NAME" \
  --attach-policy-arn="$LBC_IAM_POLICY_ARN" \
  --override-existing-serviceaccounts \
  --region "$AWS_REGION" \
  --approve
echo "INFO: LBC IAM Service Account processed."

# 3c. Update Trust Policy for existing ESO IAM Role
echo "INFO: Updating trust policy for ESO IAM Role: $ESO_IAM_ROLE_NAME..."
OIDC_ISSUER_URL_NO_HTTPS=$(aws eks describe-cluster --name "$EKS_CLUSTER_NAME_PARAM" --region "$AWS_REGION" --query "cluster.identity.oidc.issuer" --output text | sed 's~https://~~')
if [ -z "$OIDC_ISSUER_URL_NO_HTTPS" ]; then
    echo "ERROR: Could not retrieve OIDC Issuer URL for cluster $EKS_CLUSTER_NAME_PARAM."
    exit 1
fi

ESO_K8S_SA_FOR_TRUST="external-secrets"
ESO_K8S_NAMESPACE_FOR_TRUST="external-secrets"

TRUST_POLICY_JSON=$(cat <<EOF
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
                    "${OIDC_ISSUER_URL_NO_HTTPS}:sub": "system:serviceaccount:${ESO_K8S_NAMESPACE_FOR_TRUST}:${ESO_K8S_SA_FOR_TRUST}",
                    "${OIDC_ISSUER_URL_NO_HTTPS}:aud": "sts.amazonaws.com"
                }
            }
        }
    ]
}
EOF
)
aws iam update-assume-role-policy --role-name "$ESO_IAM_ROLE_NAME" --policy-document "$TRUST_POLICY_JSON"
echo "INFO: ESO IAM Role trust policy updated."

# 4. Deploy Backend Application to EKS
echo "INFO: [4/5] Running backend application deployment script..."
if [ -f "$APP_DEPLOY_SCRIPT_PATH" ]; then
    bash "$APP_DEPLOY_SCRIPT_PATH"
else
    echo "ERROR: Application deployment script not found at $APP_DEPLOY_SCRIPT_PATH"
    exit 1
fi

# 5. Final Summary
echo "INFO: [5/5] Daily Lab Environment startup process complete."
END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))
echo "INFO: Total startup duration: $(date -u -d @${DURATION} +"%T")"
echo "INFO: ==============================================="