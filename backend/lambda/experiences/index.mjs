import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, PutCommand, DeleteCommand, UpdateCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { randomUUID } from "crypto";

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);
const tableName = process.env.TABLE_EXPERIENCES;
const userGoalsTable = process.env.TABLE_USER_GOALS;

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

    // Update goal progress after creating experience
    try {
        await updateGoalProgress(item.user_id, item.university_id);
    } catch (error) {
        console.warn('Failed to update goal progress:', error);
        // Don't fail the experience creation if goal update fails
    }

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

    // Update goal progress after updating experience
    try {
        await updateGoalProgress(user_id, response.Attributes.university_id);
    } catch (error) {
        console.warn('Failed to update goal progress:', error);
        // Don't fail the experience update if goal update fails
    }

    return formatResponse(200, response.Attributes);
}

async function deleteExperience(user_id, experience_id) {
    if (!user_id || !experience_id) {
        return formatResponse(400, { error: 'User ID and Experience ID are required' });
    }

    // Get the experience before deleting to get university_id
    const experience = await docClient.send(new GetCommand({
        TableName: tableName,
        Key: { user_id, experience_id }
    }));

    await docClient.send(new DeleteCommand({
        TableName: tableName,
        Key: { user_id, experience_id }
    }));

    // Update goal progress after deleting experience
    if (experience.Item) {
        try {
            await updateGoalProgress(user_id, experience.Item.university_id);
        } catch (error) {
            console.warn('Failed to update goal progress:', error);
            // Don't fail the experience deletion if goal update fails
        }
    }

    return formatResponse(200, { success: true });
}

async function updateGoalProgress(userId, universityId) {
    try {
        const currentYear = getCurrentAcademicYear();

        // Get user goals
        const goalsResponse = await docClient.send(new GetCommand({
            TableName: userGoalsTable,
            Key: { user_id: userId, academic_year: currentYear }
        }));

        if (!goalsResponse.Item) {
            // No goals exist, nothing to update
            return;
        }

        const goals = goalsResponse.Item.goals;
        const yearDates = getAcademicYearDates(currentYear);

        // Get experiences for the current academic year
        const experiencesResponse = await docClient.send(new QueryCommand({
            TableName: tableName,
            KeyConditionExpression: 'user_id = :user_id',
            FilterExpression: 'start_date >= :start_date AND start_date <= :end_date',
            ExpressionAttributeValues: {
                ':user_id': userId,
                ':start_date': yearDates.start_date,
                ':end_date': yearDates.end_date
            }
        }));

        const experiences = experiencesResponse.Items || [];

        // Calculate current hours for each category
        const updatedGoals = { ...goals };
        for (const [category, goal] of Object.entries(goals)) {
            const categoryExperiences = experiences.filter(exp => exp.category === category);
            const currentHours = categoryExperiences.reduce((sum, exp) => sum + (exp.hours || 0), 0);

            updatedGoals[category] = {
                ...goal,
                current_hours: currentHours
            };
        }

        // Update the goals with current progress
        await docClient.send(new UpdateCommand({
            TableName: userGoalsTable,
            Key: { user_id: userId, academic_year: currentYear },
            UpdateExpression: 'SET goals = :goals, updated_at = :updated_at',
            ExpressionAttributeValues: {
                ':goals': updatedGoals,
                ':updated_at': new Date().toISOString()
            }
        }));

    } catch (error) {
        console.error('Error updating goal progress:', error);
        throw error;
    }
}

function getCurrentAcademicYear() {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth(); // 0-11

    // Academic year runs Aug-May (August = 7)
    if (month >= 7) { // August onwards
        return `${year}-${year + 1}`;
    } else {
        return `${year - 1}-${year}`;
    }
}

function getAcademicYearDates(academicYear) {
    const [startYear, endYear] = academicYear.split('-');
    return {
        start_date: `${startYear}-08-01`,
        end_date: `${endYear}-05-31`
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
