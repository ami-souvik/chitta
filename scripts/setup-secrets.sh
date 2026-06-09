#!/bin/bash
# Creates the AWS Secrets Manager secret for Chitta
# Run once. Then fill in the values in the AWS console.

AWS_REGION=${AWS_REGION:-ap-south-1}

aws secretsmanager create-secret \
  --name chitta/prod \
  --description "Chitta production secrets" \
  --region $AWS_REGION \
  --secret-string '{
    "SUPABASE_URL": "",
    "SUPABASE_SERVICE_KEY": "",
    "GOOGLE_AI_API_KEY": "",
    "NEO4J_URI": "",
    "NEO4J_USERNAME": "neo4j",
    "NEO4J_PASSWORD": "",
    "CLERK_SECRET_KEY": "",
    "CLERK_WEBHOOK_SECRET": ""
  }'

echo "Secret created. Fill in values at: https://console.aws.amazon.com/secretsmanager/secret?name=chitta%2Fprod&region=$AWS_REGION"
