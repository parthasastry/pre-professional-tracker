import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, PutCommand, DeleteCommand, UpdateCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { randomUUID } from "crypto";

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);
const tableName = process.env.TABLE_CHECKLIST;

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
        const { checklist_id, university_id } = pathParameters || {};
        const userId = queryStringParameters?.user_id;
        const status = queryStringParameters?.status;

        switch (httpMethod) {
            case 'GET':
                if (checklist_id && university_id) {
                    return await getChecklistItem(checklist_id, university_id);
                } else if (university_id) {
                    return await listChecklistItems(university_id, userId, status);
                } else {
                    return formatResponse(400, { error: 'university_id required' });
                }
            case 'POST':
                return await createChecklistItem(payload);
            case 'PUT':
                return await updateChecklistItem(checklist_id, university_id, payload);
            case 'DELETE':
                return await deleteChecklistItem(checklist_id, university_id);
            default:
                return formatResponse(405, { error: 'Method not allowed' });
        }
    } catch (error) {
        console.error('Error:', error);
        return formatResponse(500, { error: error.message });
    }
};

async function createChecklistItem(item) {
    if (!item.checklist_id) {
        item.checklist_id = randomUUID();
    }
    if (!item.university_id) {
        return formatResponse(400, { error: 'university_id is required' });
    }

    // Validate required fields
    if (!item.user_id || !item.item) {
        return formatResponse(400, { error: 'user_id and item are required' });
    }

    const timestamp = new Date().toISOString();
    item.created_at = timestamp;
    item.updated_at = timestamp;

    // Set default values
    item.status = item.status || 'not_started';
    item.priority = item.priority || 'medium';
    item.notes = item.notes || '';

    await docClient.send(new PutCommand({
        TableName: tableName,
        Item: item,
        ConditionExpression: 'attribute_not_exists(checklist_id) AND attribute_not_exists(university_id)'
    }));

    return formatResponse(201, { success: true, checklist_item: item });
}

async function getChecklistItem(checklist_id, university_id) {
    const response = await docClient.send(new GetCommand({
        TableName: tableName,
        Key: { checklist_id, university_id }
    }));

    if (!response.Item) {
        return formatResponse(404, { error: 'Checklist item not found' });
    }

    return formatResponse(200, response.Item);
}

async function listChecklistItems(university_id, userId, status) {
    let queryParams = {
        TableName: tableName,
        KeyConditionExpression: 'university_id = :university_id',
        ExpressionAttributeValues: { ':university_id': university_id }
    };

    // Filter by user if specified
    if (userId) {
        queryParams.IndexName = 'UserIndex';
        queryParams.KeyConditionExpression = 'user_id = :user_id';
        queryParams.ExpressionAttributeValues = { ':user_id': userId };

        // Filter by status if specified
        if (status) {
            queryParams.KeyConditionExpression = 'user_id = :user_id AND status = :status';
            queryParams.ExpressionAttributeValues[':status'] = status;
        }
    }

    const response = await docClient.send(new QueryCommand(queryParams));

    return formatResponse(200, { items: response.Items || [] });
}

async function updateChecklistItem(checklist_id, university_id, attributes) {
    if (!checklist_id || !university_id) {
        return formatResponse(400, { error: 'Checklist ID and University ID are required' });
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
        Key: { checklist_id, university_id },
        UpdateExpression: updateExpression,
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: expressionAttributeValues,
        ReturnValues: 'ALL_NEW'
    }));

    return formatResponse(200, response.Attributes);
}

async function deleteChecklistItem(checklist_id, university_id) {
    if (!checklist_id || !university_id) {
        return formatResponse(400, { error: 'Checklist ID and University ID are required' });
    }

    await docClient.send(new DeleteCommand({
        TableName: tableName,
        Key: { checklist_id, university_id }
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
