import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, PutCommand, DeleteCommand, UpdateCommand, ScanCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { randomUUID } from "crypto";

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);
const tableName = process.env.TABLE_UNIVERSITIES;

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
        const university_id = pathParameters?.university_id;
        const domain = queryStringParameters?.domain;

        switch (httpMethod) {
            case 'GET':
                if (university_id) {
                    return await getUniversity(university_id);
                } else if (domain) {
                    return await getUniversityByDomain(domain);
                } else {
                    return await listUniversities();
                }
            case 'POST':
                return await createUniversity(payload);
            case 'PUT':
                return await updateUniversity(university_id, payload);
            case 'DELETE':
                return await deleteUniversity(university_id);
            default:
                return formatResponse(405, { error: 'Method not allowed' });
        }
    } catch (error) {
        console.error('Error:', error);
        return formatResponse(500, { error: error.message });
    }
};

async function createUniversity(item) {
    if (!item.university_id) {
        item.university_id = randomUUID();
    }

    // Validate required fields
    if (!item.name || !item.domain) {
        return formatResponse(400, { error: 'Name and domain are required' });
    }

    const timestamp = new Date().toISOString();
    item.created_at = timestamp;
    item.updated_at = timestamp;

    // Set default values
    item.status = item.status || 'active';
    item.features = item.features || {
        pre_med: true,
        pre_dental: false,
        pre_pa: false,
        analytics: true,
        advisor_portal: true,
        announcements: true
    };
    item.settings = item.settings || {
        hour_goals: {
            shadowing: 0,
            volunteering: 0
        },
        gpa_requirements: {
            minimum: 3.5,
            competitive: 3.7
        },
        checklist_items: [
            'Meet with pre-health advisor',
            'Complete prerequisite courses',
            'Shadow healthcare professionals',
            'Volunteer in healthcare settings',
            'Take MCAT',
            'Submit applications'
        ]
    };

    await docClient.send(new PutCommand({
        TableName: tableName,
        Item: item,
        ConditionExpression: 'attribute_not_exists(university_id)'
    }));

    return formatResponse(201, { success: true, university: item });
}

async function getUniversity(university_id) {
    const response = await docClient.send(new GetCommand({
        TableName: tableName,
        Key: { university_id }
    }));

    if (!response.Item) {
        return formatResponse(404, { error: 'University not found' });
    }

    return formatResponse(200, response.Item);
}

async function getUniversityByDomain(domain) {
    const response = await docClient.send(new QueryCommand({
        TableName: tableName,
        IndexName: 'DomainIndex',
        KeyConditionExpression: 'domain = :domain',
        ExpressionAttributeValues: { ':domain': domain }
    }));

    if (!response.Items || response.Items.length === 0) {
        return formatResponse(404, { error: 'University not found' });
    }

    return formatResponse(200, response.Items[0]);
}

async function updateUniversity(university_id, attributes) {
    if (!university_id) {
        return formatResponse(400, { error: 'University ID is required' });
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
        Key: { university_id },
        UpdateExpression: updateExpression,
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: expressionAttributeValues,
        ReturnValues: 'ALL_NEW'
    }));

    return formatResponse(200, response.Attributes);
}

async function deleteUniversity(university_id) {
    if (!university_id) {
        return formatResponse(400, { error: 'University ID is required' });
    }

    await docClient.send(new DeleteCommand({
        TableName: tableName,
        Key: { university_id }
    }));

    return formatResponse(200, { success: true });
}

async function listUniversities() {
    const response = await docClient.send(new ScanCommand({
        TableName: tableName,
        FilterExpression: '#status = :status',
        ExpressionAttributeNames: { '#status': 'status' },
        ExpressionAttributeValues: { ':status': 'active' }
    }));

    return formatResponse(200, { items: response.Items || [] });
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
