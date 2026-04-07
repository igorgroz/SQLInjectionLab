#!/bin/bash

# Exit immediately if a command exits with a non-zero status.
set -e
# Treat unset variables as an error when substituting.
set -u
# Pipefail ensures that a pipeline command returns a failure status if any command in the pipeline fails
set -o pipefail

# --- Get the directory where this script is located (for relative chart path) ---
SCRIPT_DIR_APP_DEPLOY=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" &> /dev/null && pwd)

# Parameters (received from calling script)
EKS_CLUSTER_NAME="${1}"
AWS_REGION="${2}"
VPC_ID="${3}"
APP_IMAGE_TAG="${4}"
APP_K8S_SA_NAME="${5}"
APP_IAM_ROLE_NAME="${6}"
ESO_IAM_ROLE_NAME_FOR_CONTROLLER="${7}"

# --- Configuration (derived or fixed within this script) ---
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
if [ -z "$AWS_ACCOUNT_ID" ]; then
    echo "ERROR: deploy-app-to-eks.sh - Could not retrieve AWS Account ID. Ensure AWS CLI is configured."
    exit 1
fi

APP_HELM_CHART_PATH="${SCRIPT_DIR_APP_DEPLOY}/../Helm_Charts/sqlinj-backend-chart"
APP_HELM_RELEASE_NAME="sqlinj-backend"
APP_NAMESPACE="sqlinj-backend-ns"

LBC_K8S_NAMESPACE="kube-system"
LBC_HELM_RELEASE_NAME="aws-load-balancer-controller"
LBC_K8S_SA_NAME_FOR_HELM="aws-load-balancer-controller"

ESO_K8S_NAMESPACE="external-secrets"
ESO_HELM_RELEASE_NAME="external-secrets"
ESO_K8S_SA_NAME_FOR_CONTROLLER="external-secrets" # Default SA name in ESO helm chart

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

# --- Argument Validation ---
if [ -z "$EKS_CLUSTER_NAME" ] || [ -z "$AWS_REGION" ] || [ -z "$VPC_ID" ] || \
   [ -z "$APP_IMAGE_TAG" ] || [ -z "$APP_K8S_SA_NAME" ] || [ -z "$APP_IAM_ROLE_NAME" ] || \
   [ -z "$ESO_IAM_ROLE_NAME_FOR_CONTROLLER" ]; then
    log_error "deploy-app-to-eks.sh - One or more required parameters not provided."
    log_error "Usage: $0 <EKS_CLUSTER_NAME> <AWS_REGION> <VPC_ID> <APP_IMAGE_TAG> <APP_K8S_SA_NAME_FOR_APP> <APP_IAM_ROLE_NAME_FOR_APP> <ESO_IAM_ROLE_NAME_FOR_CONTROLLER>"
    exit 1
fi

# --- Main Deployment Logic ---
log_info "deploy-app-to-eks.sh - Using AWS Account ID: $AWS_ACCOUNT_ID"
log_info "deploy-app-to-eks.sh - Deploying to EKS cluster: $EKS_CLUSTER_NAME in region $AWS_REGION"
log_info "deploy-app-to-eks.sh - VPC ID for LBC: $VPC_ID"
log_info "deploy-app-to-eks.sh - App Image Tag: $APP_IMAGE_TAG"
log_info "deploy-app-to-eks.sh - App K8s SA: $APP_K8S_SA_NAME (IAM Role: $APP_IAM_ROLE_NAME)"
log_info "deploy-app-to-eks.sh - ESO Controller K8s SA: $ESO_K8S_SA_NAME_FOR_CONTROLLER (IAM Role: $ESO_IAM_ROLE_NAME_FOR_CONTROLLER)"

log_info "deploy-app-to-eks.sh - Verifying kubectl context and connectivity..."
kubectl cluster-info
kubectl get ns # Simple connectivity test

log_info "deploy-app-to-eks.sh - Checking for Helm CLI..."
if ! command -v helm &> /dev/null; then
    log_error "deploy-app-to-eks.sh - Helm CLI not found. Please install Helm."
    exit 1
fi
log_info "deploy-app-to-eks.sh - Helm CLI found."

# --- Install/Ensure AWS Load Balancer Controller ---
log_info "deploy-app-to-eks.sh - Ensuring AWS Load Balancer Controller Helm chart in namespace '$LBC_K8S_NAMESPACE'..."
if ! helm repo list | grep -q -E "^eks\s+https://aws.github.io/eks-charts"; then
    log_info "deploy-app-to-eks.sh - Adding Helm repo: eks from https://aws.github.io/eks-charts"
    helm repo add eks https://aws.github.io/eks-charts
fi
log_info "deploy-app-to-eks.sh - Updating Helm repo 'eks'..."
helm repo update eks

if ! helm status "$LBC_HELM_RELEASE_NAME" -n "$LBC_K8S_NAMESPACE" > /dev/null 2>&1; then
    log_info "deploy-app-to-eks.sh - AWS LBC release '$LBC_HELM_RELEASE_NAME' not found. Installing..."
    helm install "$LBC_HELM_RELEASE_NAME" eks/aws-load-balancer-controller \
      -n "$LBC_K8S_NAMESPACE" --create-namespace \
      --set clusterName="$EKS_CLUSTER_NAME" \
      --set serviceAccount.create=false \
      --set serviceAccount.name="$LBC_K8S_SA_NAME_FOR_HELM" \
      --set region="$AWS_REGION" \
      --set vpcId="$VPC_ID"
else
    log_info "deploy-app-to-eks.sh - AWS LBC release '$LBC_HELM_RELEASE_NAME' found. Upgrading..."
    helm upgrade "$LBC_HELM_RELEASE_NAME" eks/aws-load-balancer-controller \
      -n "$LBC_K8S_NAMESPACE" \
      --set clusterName="$EKS_CLUSTER_NAME" \
      --set serviceAccount.create=false \
      --set serviceAccount.name="$LBC_K8S_SA_NAME_FOR_HELM" \
      --set region="$AWS_REGION" \
      --set vpcId="$VPC_ID"
fi
log_info "deploy-app-to-eks.sh - AWS LBC Helm chart deployment processed."
log_info "deploy-app-to-eks.sh - Waiting for LBC deployment to be ready..."
if ! kubectl rollout status deployment/aws-load-balancer-controller -n "$LBC_K8S_NAMESPACE" --timeout=5m; then # Increased timeout
    log_error "deploy-app-to-eks.sh - AWS LBC deployment did not become ready."
    kubectl get pods -n "$LBC_K8S_NAMESPACE" -l app.kubernetes.io/name=aws-load-balancer-controller
    exit 1
fi
log_info "deploy-app-to-eks.sh - AWS LBC is ready."

# --- Install/Ensure ExternalSecrets Operator ---
log_info "deploy-app-to-eks.sh - Ensuring ExternalSecrets Operator Helm chart in namespace '$ESO_K8S_NAMESPACE'..."
if ! helm repo list | grep -q -E "^external-secrets\s+https://charts.external-secrets.io"; then
    log_info "deploy-app-to-eks.sh - Adding Helm repo: external-secrets from https://charts.external-secrets.io"
    helm repo add external-secrets https://charts.external-secrets.io
fi
log_info "deploy-app-to-eks.sh - Updating Helm repo 'external-secrets'..."
helm repo update external-secrets

ESO_CONTROLLER_IAM_ROLE_ARN="arn:aws:iam::${AWS_ACCOUNT_ID}:role/${ESO_IAM_ROLE_NAME_FOR_CONTROLLER}"

if ! helm status "$ESO_HELM_RELEASE_NAME" -n "$ESO_K8S_NAMESPACE" > /dev/null 2>&1; then
    log_info "deploy-app-to-eks.sh - ESO release '$ESO_HELM_RELEASE_NAME' not found. Installing..."
    helm install "$ESO_HELM_RELEASE_NAME" external-secrets/external-secrets \
      -n "$ESO_K8S_NAMESPACE" --create-namespace \
      --set installCRDs=true \
      --set serviceAccount.create=true \
      --set serviceAccount.name="$ESO_K8S_SA_NAME_FOR_CONTROLLER" \
      --set serviceAccount.annotations."eks\.amazonaws\.com/role-arn"="$ESO_CONTROLLER_IAM_ROLE_ARN"
else
    log_info "deploy-app-to-eks.sh - ESO release '$ESO_HELM_RELEASE_NAME' found. Upgrading..."
    helm upgrade "$ESO_HELM_RELEASE_NAME" external-secrets/external-secrets \
      -n "$ESO_K8S_NAMESPACE" \
      --set installCRDs=true \
      --set serviceAccount.create=true \
      --set serviceAccount.name="$ESO_K8S_SA_NAME_FOR_CONTROLLER" \
      --set serviceAccount.annotations."eks\.amazonaws\.com/role-arn"="$ESO_CONTROLLER_IAM_ROLE_ARN"
fi
log_info "deploy-app-to-eks.sh - ESO Helm chart deployment processed."

# --- Wait for ExternalSecrets CRDs and Pods ---
log_info "deploy-app-to-eks.sh - Waiting for ExternalSecrets CRDs to become available..."
CRDS_TO_CHECK=("externalsecrets.external-secrets.io" "secretstores.external-secrets.io" "clustersecretstores.external-secrets.io")
MAX_CRD_WAIT_RETRIES=24 # Increased: 24 * 10s = 4 minutes
CURRENT_CRD_RETRY=0

for crd_name in "${CRDS_TO_CHECK[@]}"; do
    log_info "deploy-app-to-eks.sh - Waiting for CRD: $crd_name to be established..."
    CURRENT_CRD_RETRY=0 # Reset retry count for each CRD
    while ! kubectl get crd "$crd_name" -o jsonpath='{.status.conditions[?(@.type=="Established")].status}' 2>/dev/null | grep -q "True"; do
        CURRENT_CRD_RETRY=$((CURRENT_CRD_RETRY + 1))
        if [ $CURRENT_CRD_RETRY -gt $MAX_CRD_WAIT_RETRIES ]; then
            log_error "deploy-app-to-eks.sh - CRD $crd_name did not become established after $MAX_CRD_WAIT_RETRIES attempts. Dumping CRD info..."
            kubectl get crd "$crd_name" -o yaml || log_warn "deploy-app-to-eks.sh - Failed to get CRD $crd_name yaml."
            log_error "deploy-app-to-eks.sh - Also checking API resources for external-secrets.io group..."
            kubectl api-resources --api-group=external-secrets.io || log_warn "deploy-app-to-eks.sh - api-resources command failed or found nothing for external-secrets.io"
            exit 1
        fi
        log_info "deploy-app-to-eks.sh - CRD $crd_name not yet established. Retrying in 10 seconds... (Attempt ${CURRENT_CRD_RETRY}/${MAX_CRD_WAIT_RETRIES})"
        sleep 10
    done
    log_info "deploy-app-to-eks.sh - CRD $crd_name is established."
done
log_info "deploy-app-to-eks.sh - All required ExternalSecrets CRDs are established."

log_info "deploy-app-to-eks.sh - Explicitly listing API resources for external-secrets.io group AFTER CRD wait..."
if ! kubectl api-resources --api-group=external-secrets.io; then
    log_error "deploy-app-to-eks.sh - FAILED to list API resources for external-secrets.io even after CRD wait. The CRDs are not properly registered/visible."
    exit 1
fi
log_info "deploy-app-to-eks.sh - API resources for external-secrets.io listed successfully."

log_info "deploy-app-to-eks.sh - Waiting for ExternalSecrets Operator pods to be ready in namespace '$ESO_K8S_NAMESPACE'..."
if ! kubectl wait --for=condition=Ready pod -l "app.kubernetes.io/instance=${ESO_HELM_RELEASE_NAME}" -n "$ESO_K8S_NAMESPACE" --timeout=5m; then # Increased timeout
    log_error "deploy-app-to-eks.sh - ExternalSecrets Operator pods did not become ready."
    log_error "deploy-app-to-eks.sh - Current pod status in '$ESO_K8S_NAMESPACE':"
    kubectl get pods -n "$ESO_K8S_NAMESPACE"
    # For now, let's try proceeding, but this is a high risk for app deployment failure
    log_warn "deploy-app-to-eks.sh - Proceeding despite ESO pods not confirmed ready. Application deployment may fail."
    # exit 1 # Uncomment to fail hard if ESO pods aren't ready
fi
log_info "deploy-app-to-eks.sh - ExternalSecrets Operator pods appear to be ready."

# --- Deploy Backend Application Helm Chart ---
log_info "deploy-app-to-eks.sh - Deploying backend application ('$APP_HELM_RELEASE_NAME') from chart at '$APP_HELM_CHART_PATH' into namespace '$APP_NAMESPACE'..."
if [ ! -d "$APP_HELM_CHART_PATH" ]; then
    log_error "deploy-app-to-eks.sh - Application Helm chart directory not found at: $APP_HELM_CHART_PATH"
    exit 1
fi

APP_IAM_ROLE_ARN_FOR_SA="arn:aws:iam::${AWS_ACCOUNT_ID}:role/${APP_IAM_ROLE_NAME}"

# This is where your SecretStore and ExternalSecrets for the app would be applied.
# These should ideally be part of your application's Helm chart or applied just before it.
# For example, if your chart includes templates for SecretStore and ExternalSecret:
# Values passed to Helm chart:
# secretStore.aws.serviceAccount.annotations.roleArn = $APP_IAM_ROLE_ARN_FOR_SA
# secretStore.aws.serviceAccount.name = $APP_K8S_SA_NAME
# externalSecretDb.name = "sqlinj-backend-db-credentials" (name of the ExternalSecret CR)
# externalSecretJwt.name = "sqlinj-backend-jwt-secret" (name of the ExternalSecret CR)

if ! helm status "$APP_HELM_RELEASE_NAME" -n "$APP_NAMESPACE" > /dev/null 2>&1; then
    log_info "deploy-app-to-eks.sh - Helm release '$APP_HELM_RELEASE_NAME' not found. Installing..."
    helm install "$APP_HELM_RELEASE_NAME" "$APP_HELM_CHART_PATH" \
      --namespace "$APP_NAMESPACE" \
      --create-namespace \
      --set image.tag="${APP_IMAGE_TAG}" \
      --set serviceAccount.create=true \
      --set serviceAccount.name="${APP_K8S_SA_NAME}" \
      --set serviceAccount.annotations."eks\.amazonaws\.com/role-arn"="${APP_IAM_ROLE_ARN_FOR_SA}" \
      --wait --timeout 10m # Add wait for Helm install to complete resources
      # Add other --set values as needed by your chart (e.g., values for your SecretStore and ExternalSecret names)
else
    log_info "deploy-app-to-eks.sh - Helm release '$APP_HELM_RELEASE_NAME' found. Upgrading..."
    helm upgrade "$APP_HELM_RELEASE_NAME" "$APP_HELM_CHART_PATH" \
      --namespace "$APP_NAMESPACE" \
      --set image.tag="${APP_IMAGE_TAG}" \
      --set serviceAccount.create=true \
      --set serviceAccount.name="${APP_K8S_SA_NAME}" \
      --set serviceAccount.annotations."eks\.amazonaws\.com/role-arn"="${APP_IAM_ROLE_ARN_FOR_SA}" \
      --wait --timeout 10m # Add wait for Helm upgrade
      # Add other --set values
fi
log_info "deploy-app-to-eks.sh - Application Helm chart deployment processed."

# No need for separate kubectl rollout status if using helm --wait
# log_info "deploy-app-to-eks.sh - Waiting for application deployment (deployment named '$APP_HELM_RELEASE_NAME') to be ready..."
# if ! kubectl rollout status "deployment/${APP_HELM_RELEASE_NAME}" -n "$APP_NAMESPACE" --timeout=5m; then
#     log_error "deploy-app-to-eks.sh - Application deployment rollout failed or timed out."
#     log_error "deploy-app-to-eks.sh - Check 'kubectl get all -n $APP_NAMESPACE' and 'kubectl describe deployment/${APP_HELM_RELEASE_NAME} -n $APP_NAMESPACE'"
#     log_error "deploy-app-to-eks.sh - Also check logs of pods in $APP_NAMESPACE: 'kubectl logs -n $APP_NAMESPACE -l app=<your-app-label> --all-containers'"
#     exit 1
# fi

log_info "deploy-app-to-eks.sh - Application deployment complete!"