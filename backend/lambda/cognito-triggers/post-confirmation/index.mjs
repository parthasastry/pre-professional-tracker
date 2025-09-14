import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';

const docClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const tableName = process.env.TABLE_USERS;

export const handler = async (event) => {
    console.log('Post Confirmation Trigger Event:', JSON.stringify(event, null, 2));

    try {
        // Handle different event structures
        let userAttributes, userSub;

        if (event.request && event.request.userAttributes) {
            // Standard Cognito trigger structure
            userAttributes = event.request.userAttributes;
            userSub = event.request.userAttributes.sub || event.userName;
        } else if (event.userAttributes) {
            // Alternative structure
            userAttributes = event.userAttributes;
            userSub = event.userAttributes.sub || event.userName;
        } else {
            // Direct event structure
            userAttributes = event.userAttributes || {};
            userSub = event.userAttributes?.sub || event.username || event.userName;
        }

        // Additional fallback - use userName if userSub is still undefined
        if (!userSub && event.userName) {
            userSub = event.userName;
        }

        console.log('Extracted userAttributes:', userAttributes);
        console.log('Extracted userSub:', userSub);

        // Handle empty event case - this might happen during testing or if Cognito sends an empty event
        if (!userAttributes || Object.keys(userAttributes).length === 0 || !userSub) {
            console.warn('Empty or incomplete event received. This might be a test invocation or incomplete user confirmation.');
            console.log('Event structure:', JSON.stringify(event, null, 2));

            // Return the event as-is to avoid breaking the Cognito flow
            return event;
        }

        // Extract data from Cognito user attributes
        const userData = {
            user_id: userSub,
            university_id: userAttributes['custom:university_id'],
            email: userAttributes.email,
            given_name: userAttributes.given_name,
            family_name: userAttributes.family_name,
            user_type: userAttributes['custom:user_type'] || 'student',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            plan: 'free',
            subscription_status: 'trial',
            trial_ends_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
            status: 'active',
            email_verified: userAttributes.email_verified === 'true',
            last_login: new Date().toISOString()
        };

        console.log('User data to be created:', JSON.stringify(userData, null, 2));

        // Handle missing university_id - set a default or skip user creation
        if (!userData.university_id) {
            console.log('Missing university_id in user attributes, setting default');
            userData.university_id = 'default-university'; // Set a default university
        }

        if (!userData.email || !userData.given_name || !userData.family_name) {
            console.error('Missing required user attributes');
            throw new Error('Email, given_name, and family_name are required');
        }

        console.log('Creating user record:', JSON.stringify(userData, null, 2));

        // Create user in DynamoDB
        await docClient.send(new PutCommand({
            TableName: tableName,
            Item: userData,
            ConditionExpression: 'attribute_not_exists(user_id) AND attribute_not_exists(university_id)'
        }));

        console.log('User created successfully:', userData.user_id);

        // Return the event unchanged (required for Cognito triggers)
        return event;

    } catch (error) {
        console.error('Error in post confirmation trigger:', error);

        // If it's a conditional check error, user might already exist
        if (error.name === 'ConditionalCheckFailedException') {
            console.log('User already exists, continuing...');
            return event;
        }

        // For other errors, we should still return the event to not break Cognito flow
        // but log the error for monitoring
        console.error('Non-critical error in post confirmation trigger:', error.message);
        return event;
    }
};
