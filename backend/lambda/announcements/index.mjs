import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, PutCommand, DeleteCommand, UpdateCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { randomUUID } from "crypto";

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);
const tableName = process.env.TABLE_ANNOUNCEMENTS;

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
        const { announcement_id, university_id } = pathParameters || {};
        const targetAudience = queryStringParameters?.target_audience;
        const status = queryStringParameters?.status;

        switch (httpMethod) {
            case 'GET':
                if (announcement_id && university_id) {
                    return await getAnnouncement(announcement_id, university_id);
                } else if (university_id) {
                    return await listAnnouncements(university_id, targetAudience, status);
                } else {
                    return formatResponse(400, { error: 'university_id required' });
                }
            case 'POST':
                return await createAnnouncement(payload);
            case 'PUT':
                return await updateAnnouncement(announcement_id, university_id, payload);
            case 'DELETE':
                return await deleteAnnouncement(announcement_id, university_id);
            default:
                return formatResponse(405, { error: 'Method not allowed' });
        }
    } catch (error) {
        console.error('Error:', error);
        return formatResponse(500, { error: error.message });
    }
};

async function createAnnouncement(item) {
    if (!item.announcement_id) {
        item.announcement_id = randomUUID();
    }
    if (!item.university_id) {
        return formatResponse(400, { error: 'university_id is required' });
    }

    // Validate required fields
    if (!item.title || !item.content || !item.created_by) {
        return formatResponse(400, { error: 'title, content, and created_by are required' });
    }

    const timestamp = new Date().toISOString();
    item.created_at = timestamp;
    item.updated_at = timestamp;

    // Set default values
    item.status = item.status || 'active';
    item.target_audience = item.target_audience || 'all';
    item.priority = item.priority || 'normal';
    item.expires_at = item.expires_at || null;

    await docClient.send(new PutCommand({
        TableName: tableName,
        Item: item,
        ConditionExpression: 'attribute_not_exists(announcement_id) AND attribute_not_exists(university_id)'
    }));

    return formatResponse(201, { success: true, announcement: item });
}

async function getAnnouncement(announcement_id, university_id) {
    const response = await docClient.send(new GetCommand({
        TableName: tableName,
        Key: { announcement_id, university_id }
    }));

    if (!response.Item) {
        return formatResponse(404, { error: 'Announcement not found' });
    }

    return formatResponse(200, response.Item);
}

async function listAnnouncements(university_id, targetAudience, status) {
    let queryParams = {
        TableName: tableName,
        KeyConditionExpression: 'university_id = :university_id',
        ExpressionAttributeValues: { ':university_id': university_id }
    };

    // Filter by target audience if specified
    if (targetAudience) {
        queryParams.IndexName = 'TargetAudienceIndex';
        queryParams.KeyConditionExpression = 'university_id = :university_id AND target_audience = :target_audience';
        queryParams.ExpressionAttributeValues[':target_audience'] = targetAudience;
    }

    // Filter by status if specified
    if (status) {
        queryParams.FilterExpression = 'status = :status';
        queryParams.ExpressionAttributeValues[':status'] = status;
    }

    const response = await docClient.send(new QueryCommand(queryParams));

    // Filter out expired announcements
    const now = new Date();
    const activeAnnouncements = (response.Items || []).filter(announcement => {
        if (!announcement.expires_at) return true;
        return new Date(announcement.expires_at) > now;
    });

    return formatResponse(200, { items: activeAnnouncements });
}

async function updateAnnouncement(announcement_id, university_id, attributes) {
    if (!announcement_id || !university_id) {
        return formatResponse(400, { error: 'Announcement ID and University ID are required' });
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
        Key: { announcement_id, university_id },
        UpdateExpression: updateExpression,
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: expressionAttributeValues,
        ReturnValues: 'ALL_NEW'
    }));

    return formatResponse(200, response.Attributes);
}

async function deleteAnnouncement(announcement_id, university_id) {
    if (!announcement_id || !university_id) {
        return formatResponse(400, { error: 'Announcement ID and University ID are required' });
    }

    await docClient.send(new DeleteCommand({
        TableName: tableName,
        Key: { announcement_id, university_id }
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
