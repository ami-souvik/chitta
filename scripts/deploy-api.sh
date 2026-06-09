#!/bin/bash
set -e

AWS_REGION=${AWS_REGION:-ap-south-1}
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
ECR_REPO="$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/chitta-api"

echo "Building Docker image..."
docker build -t chitta-api ./apps/api

echo "Tagging image..."
docker tag chitta-api:latest "$ECR_REPO:latest"

echo "Logging into ECR..."
aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin "$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com"

echo "Pushing to ECR..."
docker push "$ECR_REPO:latest"

echo "Updating Lambda..."
aws lambda update-function-code \
  --function-name chitta-api \
  --image-uri "$ECR_REPO:latest" \
  --region $AWS_REGION

echo "Deploy complete."
