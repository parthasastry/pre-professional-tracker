#!/bin/bash

# Manual cleanup script for stubborn resources
REGION="us-east-2"

echo "🔧 Manual cleanup of stubborn resources..."

echo ""
echo "1. Force delete CloudFormation stacks (if they're stuck)..."
aws cloudformation delete-stack --stack-name PreProfessionalTrackerStack --region $REGION 2>/dev/null || echo "Stack already deleted or doesn't exist"
aws cloudformation delete-stack --stack-name PreProfessionalTrackerCognitoStack --region $REGION 2>/dev/null || echo "Stack already deleted or doesn't exist"

echo ""
echo "2. Delete API Gateway manually..."
aws apigateway delete-rest-api --rest-api-id idsvnld425 --region $REGION 2>/dev/null || echo "API Gateway already deleted or doesn't exist"

echo ""
echo "3. Delete Cognito User Pool manually..."
aws cognito-idp delete-user-pool --user-pool-id us-east-2_EO4W1lPdt --region $REGION 2>/dev/null || echo "User Pool already deleted or doesn't exist"

echo ""
echo "4. Delete Cognito Identity Pool manually..."
aws cognito-identity delete-identity-pool --identity-pool-id us-east-2:0269a2eb-7bc3-46c2-bc62-88689897881d --region $REGION 2>/dev/null || echo "Identity Pool already deleted or doesn't exist"

echo ""
echo "5. Delete DynamoDB tables manually..."
aws dynamodb delete-table --table-name pre-professional-tracker-experiences-v2 --region $REGION 2>/dev/null || echo "Experiences table already deleted or doesn't exist"
aws dynamodb delete-table --table-name pre-professional-tracker-courses-v2 --region $REGION 2>/dev/null || echo "Courses table already deleted or doesn't exist"
aws dynamodb delete-table --table-name pre-professional-tracker-checklist-v2 --region $REGION 2>/dev/null || echo "Checklist table already deleted or doesn't exist"
aws dynamodb delete-table --table-name pre-professional-tracker-universities --region $REGION 2>/dev/null || echo "Universities table already deleted or doesn't exist"
aws dynamodb delete-table --table-name pre-professional-tracker-users --region $REGION 2>/dev/null || echo "Users table already deleted or doesn't exist"

echo ""
echo "6. Delete Lambda functions manually..."
aws lambda delete-function --function-name pre-professional-tracker-experiences-crud --region $REGION 2>/dev/null || echo "Experiences Lambda already deleted or doesn't exist"
aws lambda delete-function --function-name pre-professional-tracker-courses-crud --region $REGION 2>/dev/null || echo "Courses Lambda already deleted or doesn't exist"
aws lambda delete-function --function-name pre-professional-tracker-checklist-crud --region $REGION 2>/dev/null || echo "Checklist Lambda already deleted or doesn't exist"
aws lambda delete-function --function-name pre-professional-tracker-universities-crud --region $REGION 2>/dev/null || echo "Universities Lambda already deleted or doesn't exist"
aws lambda delete-function --function-name pre-professional-tracker-stripe-subscription --region $REGION 2>/dev/null || echo "Stripe subscription Lambda already deleted or doesn't exist"
aws lambda delete-function --function-name pre-professional-tracker-stripe-webhook --region $REGION 2>/dev/null || echo "Stripe webhook Lambda already deleted or doesn't exist"
aws lambda delete-function --function-name pre-professional-tracker-post-confirmation --region $REGION 2>/dev/null || echo "Post confirmation Lambda already deleted or doesn't exist"

echo ""
echo "✅ Manual cleanup completed!"
echo ""
echo "Now you can run the comprehensive cleanup script:"
echo "./scripts/cleanup-all.sh"
