import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, PutCommand, DeleteCommand, UpdateCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { randomUUID } from "crypto";

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);
const tableName = process.env.TABLE_EXPERIENCES;

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
        const { httpMethod, pathParameters, body, queryStringParameters, requestContext } = event;
        const payload = body ? JSON.parse(body) : {};
        const { experience_id } = pathParameters || {};
        const category = queryStringParameters?.category;

        // Extract user_id from JWT token in the request context
        const userId = requestContext?.authorizer?.claims?.sub || requestContext?.authorizer?.claims?.user_id;
        const universityId = requestContext?.authorizer?.claims?.['custom:university_id'];

        if (!userId) {
            return formatResponse(401, { error: 'User ID not found in token' });
        }

        switch (httpMethod) {
            case 'GET':
                if (experience_id) {
                    return await getExperience(userId, experience_id);
                } else {
                    return await listExperiences(universityId, userId, category);
                }
            case 'POST':
                return await createExperience(payload);
            case 'PUT':
                return await updateExperience(userId, experience_id, payload);
            case 'DELETE':
                return await deleteExperience(userId, experience_id);
            default:
                return formatResponse(405, { error: 'Method not allowed' });
        }
    } catch (error) {
        console.error('Error:', error);
        return formatResponse(500, { error: error.message });
    }
};

async function createExperience(item) {
    if (!item.experience_id) {
        item.experience_id = randomUUID();
    }
    if (!item.university_id) {
        return formatResponse(400, { error: 'university_id is required' });
    }

    // Validate required fields
    if (!item.user_id || !item.category || !item.title || !item.organization || !item.hours) {
        return formatResponse(400, { error: 'user_id, category, title, organization, and hours are required' });
    }

    // Validate category
    if (!['shadowing', 'volunteering'].includes(item.category)) {
        return formatResponse(400, { error: 'Category must be either "shadowing" or "volunteering"' });
    }

    const timestamp = new Date().toISOString();
    item.created_at = timestamp;
    item.updated_at = timestamp;

    // Set default values
    item.status = item.status || 'active';
    item.description = item.description || '';

    await docClient.send(new PutCommand({
        TableName: tableName,
        Item: item,
        ConditionExpression: 'attribute_not_exists(experience_id) AND attribute_not_exists(university_id)'
    }));

    return formatResponse(201, { success: true, experience: item });
}

async function getExperience(user_id, experience_id) {
    const response = await docClient.send(new GetCommand({
        TableName: tableName,
        Key: { user_id, experience_id }
    }));

    if (!response.Item) {
        return formatResponse(404, { error: 'Experience not found' });
    }

    return formatResponse(200, response.Item);
}

async function listExperiences(university_id, userId, category) {
    let queryParams = {
        TableName: tableName,
        KeyConditionExpression: 'user_id = :user_id',
        ExpressionAttributeValues: { ':user_id': userId }
    };

    // Filter by category if specified
    if (category) {
        queryParams.IndexName = 'CategoryIndex';
        queryParams.KeyConditionExpression = 'user_id = :user_id AND category = :category';
        queryParams.ExpressionAttributeValues[':category'] = category;
    }

    const response = await docClient.send(new QueryCommand(queryParams));

    return formatResponse(200, { items: response.Items || [] });
}

async function updateExperience(user_id, experience_id, attributes) {
    if (!user_id || !experience_id) {
        return formatResponse(400, { error: 'User ID and Experience ID are required' });
    }

    // Remove key attributes that cannot be updated
    const { user_id: _, experience_id: __, university_id: ___, ...updateAttributes } = attributes;

    updateAttributes.updated_at = new Date().toISOString();

    let updateExpression = 'SET';
    const expressionAttributeNames = {};
    const expressionAttributeValues = {};

    Object.entries(updateAttributes).forEach(([key, value], index) => {
        const attrName = `#attr${index}`;
        const attrValue = `:val${index}`;
        expressionAttributeNames[attrName] = key;
        expressionAttributeValues[attrValue] = value;
        updateExpression += index === 0 ? ` ${attrName} = ${attrValue}` : `, ${attrName} = ${attrValue}`;
    });

    const response = await docClient.send(new UpdateCommand({
        TableName: tableName,
        Key: { user_id, experience_id },
        UpdateExpression: updateExpression,
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: expressionAttributeValues,
        ReturnValues: 'ALL_NEW'
    }));

    return formatResponse(200, response.Attributes);
}

async function deleteExperience(user_id, experience_id) {
    if (!user_id || !experience_id) {
        return formatResponse(400, { error: 'User ID and Experience ID are required' });
    }

    await docClient.send(new DeleteCommand({
        TableName: tableName,
        Key: { user_id, experience_id }
    }));

    return formatResponse(200, { success: true });
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
