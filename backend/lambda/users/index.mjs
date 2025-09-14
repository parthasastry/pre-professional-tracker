import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, PutCommand, DeleteCommand, UpdateCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { randomUUID } from "crypto";

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);
const tableName = process.env.TABLE_USERS;

export const handler = async (event) => {
    // Handle OPTIONS preflight
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
                'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
                'Content-Type': 'application/json'
            },
            body: ''
        };
    }

    try {
        const { httpMethod, pathParameters, body, queryStringParameters } = event;
        const payload = body ? JSON.parse(body) : {};
        const { user_id, university_id } = pathParameters || {};
        const userType = queryStringParameters?.user_type;

        switch (httpMethod) {
            case 'GET':
                if (user_id && university_id) {
                    return await getUser(user_id, university_id);
                } else if (university_id) {
                    return await listUsersByUniversity(university_id, userType);
                } else {
                    return formatResponse(400, { error: 'university_id required' });
                }
            case 'POST':
                return await createUser(payload);
            case 'PUT':
                return await updateUser(user_id, university_id, payload);
            case 'DELETE':
                return await deleteUser(user_id, university_id);
            default:
                return formatResponse(405, { error: 'Method not allowed' });
        }
    } catch (error) {
        console.error('Error:', error);
        return formatResponse(500, { error: error.message });
    }
};

async function createUser(item) {
    if (!item.user_id) {
        item.user_id = randomUUID();
    }
    if (!item.university_id) {
        return formatResponse(400, { error: 'university_id is required' });
    }

    // Validate required fields
    if (!item.email || !item.given_name || !item.family_name) {
        return formatResponse(400, { error: 'Email, given_name, and family_name are required' });
    }

    const timestamp = new Date().toISOString();
    item.created_at = timestamp;
    item.updated_at = timestamp;

    // Set default values
    item.user_type = item.user_type || 'student';
    item.status = item.status || 'active';
    item.plan = item.plan || 'free';

    // Subscription and trial fields
    item.subscription_status = item.subscription_status || 'trial';
    item.trial_ends_at = item.trial_ends_at || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days from now
    item.stripe_customer_id = item.stripe_customer_id || null;
    item.stripe_subscription_id = item.stripe_subscription_id || null;
    item.subscription_plan = item.subscription_plan || null;
    item.subscription_ends_at = item.subscription_ends_at || null;
    item.email_verified = item.email_verified || false;
    item.last_login = item.last_login || null;

    await docClient.send(new PutCommand({
        TableName: tableName,
        Item: item,
        ConditionExpression: 'attribute_not_exists(user_id) AND attribute_not_exists(university_id)'
    }));

    return formatResponse(201, { success: true, user: item });
}

async function getUser(user_id, university_id) {
    const response = await docClient.send(new GetCommand({
        TableName: tableName,
        Key: { user_id, university_id }
    }));

    if (!response.Item) {
        return formatResponse(404, { error: 'User not found' });
    }

    // Add trial status information
    const user = response.Item;
    const trialInfo = getTrialStatus(user);

    return formatResponse(200, {
        ...user,
        trial_info: trialInfo
    });
}

async function listUsersByUniversity(university_id, userType) {
    let queryParams = {
        TableName: tableName,
        KeyConditionExpression: 'university_id = :university_id',
        ExpressionAttributeValues: { ':university_id': university_id }
    };

    // Filter by user type if specified
    if (userType) {
        queryParams.IndexName = 'UserTypeIndex';
        queryParams.KeyConditionExpression = 'university_id = :university_id AND user_type = :user_type';
        queryParams.ExpressionAttributeValues[':user_type'] = userType;
    }

    const response = await docClient.send(new QueryCommand(queryParams));

    return formatResponse(200, { items: response.Items || [] });
}

async function updateUser(user_id, university_id, attributes) {
    if (!user_id || !university_id) {
        return formatResponse(400, { error: 'User ID and University ID are required' });
    }

    attributes.updated_at = new Date().toISOString();

    let updateExpression = 'SET';
    const expressionAttributeNames = {};
    const expressionAttributeValues = {};

    Object.entries(attributes).forEach(([key, value], index) => {
        const attrName = `#attr${index}`;
        const attrValue = `:val${index}`;
        expressionAttributeNames[attrName] = key;
        expressionAttributeValues[attrValue] = value;
        updateExpression += index === 0 ? ` ${attrName} = ${attrValue}` : `, ${attrName} = ${attrValue}`;
    });

    const response = await docClient.send(new UpdateCommand({
        TableName: tableName,
        Key: { user_id, university_id },
        UpdateExpression: updateExpression,
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: expressionAttributeValues,
        ReturnValues: 'ALL_NEW'
    }));

    return formatResponse(200, response.Attributes);
}

async function deleteUser(user_id, university_id) {
    if (!user_id || !university_id) {
        return formatResponse(400, { error: 'User ID and University ID are required' });
    }

    await docClient.send(new DeleteCommand({
        TableName: tableName,
        Key: { user_id, university_id }
    }));

    return formatResponse(200, { success: true });
}

function getTrialStatus(user) {
    const now = new Date();
    const trialEnds = new Date(user.trial_ends_at);
    const isTrialActive = user.subscription_status === 'trial' && now < trialEnds;
    const daysRemaining = Math.max(0, Math.ceil((trialEnds - now) / (1000 * 60 * 60 * 24)));

    return {
        is_trial_active: isTrialActive,
        trial_ends_at: user.trial_ends_at,
        days_remaining: daysRemaining,
        subscription_status: user.subscription_status,
        requires_subscription: !isTrialActive && user.subscription_status !== 'active'
    };
}

function formatResponse(statusCode, body) {
    return {
        statusCode,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
            'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
    };
}
