#!/bin/bash

# API Gateway details
REST_API_ID="idsvnld425"
NEW_AUTHORIZER_ID="oyhn3f"
REGION="us-east-2"

echo "🔧 Updating API Gateway authorizer..."

# Update GET method on experiences endpoint
echo "📝 Updating experiences GET method..."
aws apigateway update-method \
    --rest-api-id $REST_API_ID \
    --resource-id kbocaq \
    --http-method GET \
    --patch-ops '[{"op":"replace","path":"/authorizationType","value":"COGNITO_USER_POOLS"},{"op":"replace","path":"/authorizerId","value":"'$NEW_AUTHORIZER_ID'"}]' \
    --region $REGION

# Update POST method on experiences endpoint
echo "📝 Updating experiences POST method..."
aws apigateway update-method \
    --rest-api-id $REST_API_ID \
    --resource-id kbocaq \
    --http-method POST \
    --patch-ops '[{"op":"replace","path":"/authorizationType","value":"COGNITO_USER_POOLS"},{"op":"replace","path":"/authorizerId","value":"'$NEW_AUTHORIZER_ID'"}]' \
    --region $REGION

echo "✅ Authorizer update completed!"
echo "🚀 Try accessing the Experiences page now."

