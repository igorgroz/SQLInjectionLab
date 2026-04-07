#!/bin/bash

set -e # Exit on error

# --- Configuration ---
AWS_ACCOUNT_ID="510151297987"      # Your Account ID
AWS_REGION="ap-southeast-2"       # Your AWS Region
ECR_REPOSITORY_NAME="my-sqlinj-backend"
LOCAL_IMAGE_NAME="sqlinj-backend" # Base name for local build

# --- Generate Timestamp Tag ---
TIMESTAMP_TAG=$(date +%d%m%y%H%M)
echo "INFO: Using timestamp tag: $TIMESTAMP_TAG"

# Derived ECR repository URI
ECR_REPOSITORY_URI="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_REPOSITORY_NAME}"

# --- Main ---
echo "INFO: Authenticating Docker to ECR..."
aws ecr get-login-password --region "${AWS_REGION}" | docker login --username AWS --password-stdin "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
echo "INFO: Docker ECR login successful."

echo "INFO: Building Docker image ${LOCAL_IMAGE_NAME}:${TIMESTAMP_TAG} from ./backend directory..."
docker build -t "${LOCAL_IMAGE_NAME}:${TIMESTAMP_TAG}" ./backend
echo "INFO: Docker image built locally as ${LOCAL_IMAGE_NAME}:${TIMESTAMP_TAG}"

echo "INFO: Tagging image for ECR as ${ECR_REPOSITORY_URI}:${TIMESTAMP_TAG}..."
docker tag "${LOCAL_IMAGE_NAME}:${TIMESTAMP_TAG}" "${ECR_REPOSITORY_URI}:${TIMESTAMP_TAG}"
echo "INFO: Image tagged with timestamp for ECR."

echo "INFO: Also tagging image for ECR as ${ECR_REPOSITORY_URI}:latest..."
docker tag "${LOCAL_IMAGE_NAME}:${TIMESTAMP_TAG}" "${ECR_REPOSITORY_URI}:latest"
echo "INFO: Image also tagged as latest for ECR."

echo "INFO: Pushing image ${ECR_REPOSITORY_URI}:${TIMESTAMP_TAG} to ECR..."
docker push "${ECR_REPOSITORY_URI}:${TIMESTAMP_TAG}"
echo "INFO: Pushed timestamped tag to ECR."

echo "INFO: Pushing image ${ECR_REPOSITORY_URI}:latest to ECR..."
docker push "${ECR_REPOSITORY_URI}:latest"
echo "INFO: Pushed latest tag to ECR."

echo "ECR Image URIs pushed:"
echo "  ${ECR_REPOSITORY_URI}:${TIMESTAMP_TAG}"
echo "  ${ECR_REPOSITORY_URI}:latest"