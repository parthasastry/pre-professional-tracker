import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, PutCommand, DeleteCommand, UpdateCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { randomUUID } from "crypto";

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);
const tableName = process.env.TABLE_SESSIONS;

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
        const { session_id, experience_id } = pathParameters || {};
        const { experience_id: queryExperienceId } = queryStringParameters || {};

        // Use experience_id from path parameters if available, otherwise from query string
        const finalExperienceId = experience_id || queryExperienceId;

        // Extract user_id from JWT token in the request context
        const userId = requestContext?.authorizer?.claims?.sub || requestContext?.authorizer?.claims?.user_id;
        const universityId = requestContext?.authorizer?.claims?.['custom:university_id'];

        if (!userId) {
            return formatResponse(401, { error: 'User ID not found in token' });
        }

        switch (httpMethod) {
            case 'GET':
                if (session_id) {
                    return await getSession(session_id, userId);
                } else if (finalExperienceId) {
                    return await listSessions(finalExperienceId);
                } else {
                    return await listUserSessions(userId);
                }
            case 'POST':
                return await createSession(payload, userId, universityId);
            case 'PUT':
                return await updateSession(session_id, payload, userId);
            case 'DELETE':
                return await deleteSession(session_id, userId);
            default:
                return formatResponse(405, { error: 'Method not allowed' });
        }
    } catch (error) {
        console.error('Error:', error);
        return formatResponse(500, { error: error.message });
    }
};

async function createSession(item, userId, universityId) {
    if (!item.session_id) {
        item.session_id = randomUUID();
    }
    if (!item.experience_id) {
        return formatResponse(400, { error: 'experience_id is required' });
    }

    // Validate required fields
    if (!item.date || !item.hours || item.hours <= 0) {
        return formatResponse(400, { error: 'date and hours (greater than 0) are required' });
    }

    // Validate date is not in the future
    if (new Date(item.date) > new Date()) {
        return formatResponse(400, { error: 'Session date cannot be in the future' });
    }

    const timestamp = new Date().toISOString();
    item.created_at = timestamp;
    item.updated_at = timestamp;
    item.user_id = userId;
    item.university_id = universityId;

    // Set default values
    item.notes = item.notes || '';
    item.supervisor = item.supervisor || '';
    item.location = item.location || '';

    await docClient.send(new PutCommand({
        TableName: tableName,
        Item: item,
        ConditionExpression: 'attribute_not_exists(session_id) AND attribute_not_exists(experience_id)'
    }));

    // Update the parent experience's total hours
    try {
        await updateExperienceTotalHours(item.experience_id, item.user_id, item.university_id);
    } catch (error) {
        console.warn('Failed to update experience total hours:', error);
        // Don't fail the session creation if experience update fails
    }

    return formatResponse(201, { success: true, session: item });
}

async function getSession(session_id, userId) {
    // First, we need to find the session by querying with GSI
    const response = await docClient.send(new QueryCommand({
        TableName: tableName,
        IndexName: 'UserIndex',
        KeyConditionExpression: 'user_id = :user_id',
        FilterExpression: 'session_id = :session_id',
        ExpressionAttributeValues: {
            ':user_id': userId,
            ':session_id': session_id
        }
    }));

    if (!response.Items || response.Items.length === 0) {
        return formatResponse(404, { error: 'Session not found' });
    }

    return formatResponse(200, response.Items[0]);
}

async function listSessions(experience_id) {
    const response = await docClient.send(new QueryCommand({
        TableName: tableName,
        KeyConditionExpression: 'experience_id = :experience_id',
        ExpressionAttributeValues: { ':experience_id': experience_id },
        ScanIndexForward: false // Sort by date descending
    }));

    return formatResponse(200, { items: response.Items || [] });
}

async function listUserSessions(userId) {
    const response = await docClient.send(new QueryCommand({
        TableName: tableName,
        IndexName: 'UserIndex',
        KeyConditionExpression: 'user_id = :user_id',
        ExpressionAttributeValues: { ':user_id': userId },
        ScanIndexForward: false // Sort by date descending
    }));

    return formatResponse(200, { items: response.Items || [] });
}

async function updateSession(session_id, attributes, userId) {
    if (!session_id) {
        return formatResponse(400, { error: 'Session ID is required' });
    }

    // First, find the session by querying with GSI to get experience_id
    const sessionQuery = await docClient.send(new QueryCommand({
        TableName: tableName,
        IndexName: 'UserIndex',
        KeyConditionExpression: 'user_id = :user_id',
        FilterExpression: 'session_id = :session_id',
        ExpressionAttributeValues: {
            ':user_id': userId,
            ':session_id': session_id
        }
    }));

    if (!sessionQuery.Items || sessionQuery.Items.length === 0) {
        return formatResponse(404, { error: 'Session not found' });
    }

    const session = sessionQuery.Items[0];
    console.log('Found session to update:', session);

    if (session.user_id !== userId) {
        return formatResponse(403, { error: 'Not authorized to update this session' });
    }

    // Remove key attributes that cannot be updated
    const { session_id: _, experience_id: __, user_id: ___, university_id: ____, ...updateAttributes } = attributes;

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

    console.log('Updating session with expression:', updateExpression);
    console.log('Update attributes:', updateAttributes);

    const response = await docClient.send(new UpdateCommand({
        TableName: tableName,
        Key: { experience_id: session.experience_id, session_id: session_id },
        UpdateExpression: updateExpression,
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: expressionAttributeValues,
        ReturnValues: 'ALL_NEW'
    }));

    console.log('Session updated successfully:', response.Attributes);

    // Update the parent experience's total hours
    try {
        await updateExperienceTotalHours(session.experience_id, session.user_id, session.university_id);
        console.log('Experience total hours updated after session update');
    } catch (error) {
        console.warn('Failed to update experience total hours:', error);
        // Don't fail the session update if experience update fails
    }

    return formatResponse(200, response.Attributes);
}

async function deleteSession(session_id, userId) {
    if (!session_id) {
        return formatResponse(400, { error: 'Session ID is required' });
    }

    // First, find the session by querying with GSI to get experience_id
    const sessionQuery = await docClient.send(new QueryCommand({
        TableName: tableName,
        IndexName: 'UserIndex',
        KeyConditionExpression: 'user_id = :user_id',
        FilterExpression: 'session_id = :session_id',
        ExpressionAttributeValues: {
            ':user_id': userId,
            ':session_id': session_id
        }
    }));

    if (!sessionQuery.Items || sessionQuery.Items.length === 0) {
        return formatResponse(404, { error: 'Session not found' });
    }

    const session = sessionQuery.Items[0];
    console.log('Found session to delete:', session);

    // Delete the session
    await docClient.send(new DeleteCommand({
        TableName: tableName,
        Key: { experience_id: session.experience_id, session_id: session_id }
    }));

    console.log('Session deleted from database');

    // Update the parent experience's total hours
    try {
        await updateExperienceTotalHours(session.experience_id, session.user_id, session.university_id);
        console.log('Experience total hours updated');
    } catch (error) {
        console.warn('Failed to update experience total hours:', error);
        // Don't fail the session deletion if experience update fails
    }

    return formatResponse(200, { success: true });
}

async function updateExperienceTotalHours(experience_id, user_id, university_id) {
    try {
        console.log(`Updating experience total hours for experience_id: ${experience_id}, user_id: ${user_id}`);

        // Get all sessions for this experience
        const sessionsResponse = await docClient.send(new QueryCommand({
            TableName: tableName,
            KeyConditionExpression: 'experience_id = :experience_id',
            ExpressionAttributeValues: { ':experience_id': experience_id }
        }));

        const sessions = sessionsResponse.Items || [];
        const totalHours = sessions.reduce((sum, session) => sum + (session.hours || 0), 0);
        const sessionCount = sessions.length;

        console.log(`Found ${sessions.length} sessions, total hours: ${totalHours}`);

        // Update the experience record with calculated totals
        await docClient.send(new UpdateCommand({
            TableName: process.env.TABLE_EXPERIENCES,
            Key: { user_id: user_id, experience_id: experience_id },
            UpdateExpression: 'SET total_hours = :total_hours, session_count = :session_count, updated_at = :updated_at',
            ExpressionAttributeValues: {
                ':total_hours': totalHours,
                ':session_count': sessionCount,
                ':updated_at': new Date().toISOString()
            }
        }));

        console.log(`Updated experience ${experience_id} with total_hours: ${totalHours}, session_count: ${sessionCount}`);

    } catch (error) {
        console.error('Error updating experience total hours:', error);
        throw error;
    }
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
