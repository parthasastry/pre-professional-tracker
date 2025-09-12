import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, PutCommand, DeleteCommand, UpdateCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { randomUUID } from "crypto";

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);
const tableName = process.env.TABLE_ADVISORS;

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
        const { advisor_id, university_id } = pathParameters || {};
        const email = queryStringParameters?.email;

        switch (httpMethod) {
            case 'GET':
                if (advisor_id && university_id) {
                    return await getAdvisor(advisor_id, university_id);
                } else if (university_id) {
                    return await listAdvisors(university_id);
                } else if (email) {
                    return await getAdvisorByEmail(email);
                } else {
                    return formatResponse(400, { error: 'university_id or email required' });
                }
            case 'POST':
                return await createAdvisor(payload);
            case 'PUT':
                return await updateAdvisor(advisor_id, university_id, payload);
            case 'DELETE':
                return await deleteAdvisor(advisor_id, university_id);
            default:
                return formatResponse(405, { error: 'Method not allowed' });
        }
    } catch (error) {
        console.error('Error:', error);
        return formatResponse(500, { error: error.message });
    }
};

async function createAdvisor(item) {
    if (!item.advisor_id) {
        item.advisor_id = randomUUID();
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
    item.status = item.status || 'active';
    item.role = item.role || 'advisor';
    item.department = item.department || 'Pre-Health Advising';

    await docClient.send(new PutCommand({
        TableName: tableName,
        Item: item,
        ConditionExpression: 'attribute_not_exists(advisor_id) AND attribute_not_exists(university_id)'
    }));

    return formatResponse(201, { success: true, advisor: item });
}

async function getAdvisor(advisor_id, university_id) {
    const response = await docClient.send(new GetCommand({
        TableName: tableName,
        Key: { advisor_id, university_id }
    }));

    if (!response.Item) {
        return formatResponse(404, { error: 'Advisor not found' });
    }

    return formatResponse(200, response.Item);
}

async function listAdvisors(university_id) {
    const response = await docClient.send(new QueryCommand({
        TableName: tableName,
        KeyConditionExpression: 'university_id = :university_id',
        ExpressionAttributeValues: { ':university_id': university_id }
    }));

    return formatResponse(200, { items: response.Items || [] });
}

async function getAdvisorByEmail(email) {
    const response = await docClient.send(new QueryCommand({
        TableName: tableName,
        IndexName: 'EmailIndex',
        KeyConditionExpression: 'email = :email',
        ExpressionAttributeValues: { ':email': email }
    }));

    if (!response.Items || response.Items.length === 0) {
        return formatResponse(404, { error: 'Advisor not found' });
    }

    return formatResponse(200, response.Items[0]);
}

async function updateAdvisor(advisor_id, university_id, attributes) {
    if (!advisor_id || !university_id) {
        return formatResponse(400, { error: 'Advisor ID and University ID are required' });
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
        Key: { advisor_id, university_id },
        UpdateExpression: updateExpression,
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: expressionAttributeValues,
        ReturnValues: 'ALL_NEW'
    }));

    return formatResponse(200, response.Attributes);
}

async function deleteAdvisor(advisor_id, university_id) {
    if (!advisor_id || !university_id) {
        return formatResponse(400, { error: 'Advisor ID and University ID are required' });
    }

    await docClient.send(new DeleteCommand({
        TableName: tableName,
        Key: { advisor_id, university_id }
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
