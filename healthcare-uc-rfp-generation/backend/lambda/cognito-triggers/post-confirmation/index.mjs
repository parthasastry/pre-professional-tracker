import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';

// Initialize AWS clients
const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);

// Environment variables
const TABLE_USERS = process.env.TABLE_RFP_USERS || 'healthcare-uc-rfp-users';

export const handler = async (event, context) => {
    console.log('Post Confirmation Trigger:', JSON.stringify(event, null, 2));

    try {
        const { userAttributes, userName } = event;

        // Extract user information
        const userId = userName;
        const email = userAttributes.email;
        const givenName = userAttributes.given_name || userAttributes.name;
        const familyName = userAttributes.family_name || '';
        const organization = userAttributes['custom:organization'] || 'Unknown Organization';
        const role = userAttributes['custom:role'] || 'user';
        const department = userAttributes['custom:department'] || 'General';

        // Create user record in DynamoDB
        const userRecord = {
            user_id: userId,
            email: email,
            given_name: givenName,
            family_name: familyName,
            organization: organization,
            role: role,
            department: department,
            status: 'active',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            last_login: new Date().toISOString(),
            rfps_processed: 0,
            total_documents: 0,
        };

        // Store user in DynamoDB
        await docClient.send(new PutCommand({
            TableName: TABLE_USERS,
            Item: userRecord
        }));

        console.log('User created successfully:', userId);

        // Return the event to continue the confirmation process
        return event;

    } catch (error) {
        console.error('Error in post confirmation trigger:', error);

        // Don't fail the confirmation process, just log the error
        // The user will still be confirmed, but we'll need to handle the data separately
        console.error('Failed to create user record, but continuing with confirmation');

        return event;
    }
};
