#!/bin/bash

# Healthcare UC RFP Generation - Deployment Script
# This script helps deploy the infrastructure and test the system

set -e

echo "🏥 Healthcare UC RFP Generation - Deployment Script"
echo "=================================================="

# Check if AWS CLI is configured
if ! aws sts get-caller-identity &> /dev/null; then
    echo "❌ AWS CLI not configured. Please run 'aws configure' first."
    exit 1
fi

# Get AWS account info
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
REGION=$(aws configure get region || echo "us-east-1")

echo "✅ AWS Account: $ACCOUNT_ID"
echo "✅ AWS Region: $REGION"

# Check if CDK is installed
if ! command -v cdk &> /dev/null; then
    echo "❌ AWS CDK not installed. Installing..."
    npm install -g aws-cdk
fi

echo "✅ AWS CDK installed"

# Install dependencies
echo "📦 Installing dependencies..."
cd infra
npm install
cd ../backend/lambda/rfp-processor
npm install
cd ../..

# Bootstrap CDK if needed
echo "🚀 Bootstrapping CDK..."
cd infra
cdk bootstrap --region $REGION

# Deploy the stack
echo "🚀 Deploying infrastructure..."
npm run deploy

# Get API Gateway URL
echo "🔍 Getting API Gateway URL..."
API_URL=$(aws cloudformation describe-stacks \
    --stack-name HealthcareUcRfpGenerationStack \
    --query 'Stacks[0].Outputs[?OutputKey==`RfpApiGatewayUrl`].OutputValue' \
    --output text)

echo "✅ Deployment complete!"
echo ""
echo "🌐 API Gateway URL: $API_URL"
echo ""
echo "🧪 Testing the system..."
echo ""

# Test health endpoint
echo "Testing health endpoint..."
curl -s "$API_URL/health" | jq '.' || echo "Health check failed"

echo ""
echo "📋 Next steps:"
echo "1. Test document upload:"
echo "   curl -X POST $API_URL/rfp \\"
echo "     -H 'Content-Type: application/json' \\"
echo "     -d '{\"client_name\":\"Test Hospital\",\"region\":\"North America\",\"industry\":\"Healthcare\",\"content\":\"We need healthcare IT services.\"}'"
echo ""
echo "2. Start processing:"
echo "   curl -X POST $API_URL/rfp/process \\"
echo "     -H 'Content-Type: application/json' \\"
echo "     -d '{\"document_id\":\"YOUR_DOCUMENT_ID\"}'"
echo ""
echo "3. Check status:"
echo "   curl $API_URL/rfp/status/YOUR_PROCESS_ID"
echo ""
echo "🎉 Happy learning!"
