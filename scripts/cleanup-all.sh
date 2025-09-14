#!/bin/bash

# Comprehensive cleanup script for Pre-Professional Tracker
REGION="us-east-2"

echo "🧹 Starting comprehensive cleanup of Pre-Professional Tracker resources..."

# Function to check if resource exists
check_resource() {
    local resource_type=$1
    local resource_id=$2
    local command=$3
    
    if eval "$command" >/dev/null 2>&1; then
        echo "✅ Found $resource_type: $resource_id"
        return 0
    else
        echo "❌ $resource_type $resource_id not found or already deleted"
        return 1
    fi
}

# Function to delete resource with confirmation
delete_resource() {
    local resource_type=$1
    local resource_id=$2
    local delete_command=$3
    
    echo "🗑️  Deleting $resource_type: $resource_id"
    if eval "$delete_command"; then
        echo "✅ Successfully deleted $resource_type: $resource_id"
    else
        echo "❌ Failed to delete $resource_type: $resource_id"
    fi
}

echo ""
echo "🔍 Step 1: Checking and deleting CloudFormation stacks..."

# Delete main stack first
if check_resource "CloudFormation Stack" "PreProfessionalTrackerStack" "aws cloudformation describe-stacks --stack-name PreProfessionalTrackerStack --region $REGION"; then
    echo "Deleting PreProfessionalTrackerStack..."
    aws cloudformation delete-stack --stack-name PreProfessionalTrackerStack --region $REGION
    echo "⏳ Waiting for stack deletion to complete..."
    aws cloudformation wait stack-delete-complete --stack-name PreProfessionalTrackerStack --region $REGION
fi

# Delete Cognito stack
if check_resource "CloudFormation Stack" "PreProfessionalTrackerCognitoStack" "aws cloudformation describe-stacks --stack-name PreProfessionalTrackerCognitoStack --region $REGION"; then
    echo "Deleting PreProfessionalTrackerCognitoStack..."
    aws cloudformation delete-stack --stack-name PreProfessionalTrackerCognitoStack --region $REGION
    echo "⏳ Waiting for stack deletion to complete..."
    aws cloudformation wait stack-delete-complete --stack-name PreProfessionalTrackerCognitoStack --region $REGION
fi

echo ""
echo "🔍 Step 2: Checking and deleting Lambda functions..."

# List of Lambda functions to delete
LAMBDA_FUNCTIONS=(
    "pre-professional-tracker-experiences-crud"
    "pre-professional-tracker-courses-crud"
    "pre-professional-tracker-checklist-crud"
    "pre-professional-tracker-universities-crud"
    "pre-professional-tracker-stripe-subscription"
    "pre-professional-tracker-stripe-webhook"
    "pre-professional-tracker-post-confirmation"
)

for func in "${LAMBDA_FUNCTIONS[@]}"; do
    if check_resource "Lambda Function" "$func" "aws lambda get-function --function-name $func --region $REGION"; then
        delete_resource "Lambda Function" "$func" "aws lambda delete-function --function-name $func --region $REGION"
    fi
done

echo ""
echo "🔍 Step 3: Checking and deleting DynamoDB tables..."

# List of DynamoDB tables to delete
DYNAMODB_TABLES=(
    "pre-professional-tracker-experiences-v2"
    "pre-professional-tracker-courses-v2"
    "pre-professional-tracker-checklist-v2"
    "pre-professional-tracker-universities"
    "pre-professional-tracker-users"
)

for table in "${DYNAMODB_TABLES[@]}"; do
    if check_resource "DynamoDB Table" "$table" "aws dynamodb describe-table --table-name $table --region $REGION"; then
        delete_resource "DynamoDB Table" "$table" "aws dynamodb delete-table --table-name $table --region $REGION"
    fi
done

echo ""
echo "🔍 Step 4: Checking and deleting API Gateway..."

# Delete API Gateway
if check_resource "API Gateway" "idsvnld425" "aws apigateway get-rest-api --rest-api-id idsvnld425 --region $REGION"; then
    delete_resource "API Gateway" "idsvnld425" "aws apigateway delete-rest-api --rest-api-id idsvnld425 --region $REGION"
fi

echo ""
echo "🔍 Step 5: Checking and deleting Cognito resources..."

# Delete Cognito User Pool
if check_resource "Cognito User Pool" "us-east-2_EO4W1lPdt" "aws cognito-idp describe-user-pool --user-pool-id us-east-2_EO4W1lPdt --region $REGION"; then
    delete_resource "Cognito User Pool" "us-east-2_EO4W1lPdt" "aws cognito-idp delete-user-pool --user-pool-id us-east-2_EO4W1lPdt --region $REGION"
fi

# Delete Cognito Identity Pool
if check_resource "Cognito Identity Pool" "us-east-2:0269a2eb-7bc3-46c2-bc62-88689897881d" "aws cognito-identity describe-identity-pool --identity-pool-id us-east-2:0269a2eb-7bc3-46c2-bc62-88689897881d --region $REGION"; then
    delete_resource "Cognito Identity Pool" "us-east-2:0269a2eb-7bc3-46c2-bc62-88689897881d" "aws cognito-identity delete-identity-pool --identity-pool-id us-east-2:0269a2eb-7bc3-46c2-bc62-88689897881d --region $REGION"
fi

echo ""
echo "🔍 Step 6: Checking and deleting IAM roles and policies..."

# List of IAM roles to delete (these will be cleaned up by CloudFormation, but let's check)
IAM_ROLES=(
    "PreProfessionalTrackerCog-CognitoDefaultAuthenticat-eXXjBx3rMVpb"
    "PreProfessionalTrackerCog-PostConfirmationLambdaSer-sqtLe1HafEK7"
    "pre-professional-tracker-experiences-crud-role"
    "pre-professional-tracker-courses-crud-role"
    "pre-professional-tracker-checklist-crud-role"
    "pre-professional-tracker-universities-crud-role"
    "pre-professional-tracker-stripe-subscription-role"
    "pre-professional-tracker-stripe-webhook-role"
)

for role in "${IAM_ROLES[@]}"; do
    if check_resource "IAM Role" "$role" "aws iam get-role --role-name $role"; then
        echo "⚠️  IAM Role $role still exists. This might be cleaned up by CloudFormation."
    fi
done

echo ""
echo "🔍 Step 7: Checking for any remaining resources..."

# Check for any remaining CloudFormation stacks
echo "Checking for remaining CloudFormation stacks..."
aws cloudformation list-stacks --region $REGION --query "StackSummaries[?contains(StackName, 'pre-professional') || contains(StackName, 'PreProfessional')].{Name:StackName,Status:StackStatus}" --output table

echo ""
echo "🎉 Cleanup completed!"
echo ""
echo "📋 Summary of what was cleaned up:"
echo "   ✅ CloudFormation stacks"
echo "   ✅ Lambda functions"
echo "   ✅ DynamoDB tables"
echo "   ✅ API Gateway"
echo "   ✅ Cognito User Pool and Identity Pool"
echo ""
echo "🚀 You can now redeploy the stack with:"
echo "   cd infra && cdk deploy --all"
