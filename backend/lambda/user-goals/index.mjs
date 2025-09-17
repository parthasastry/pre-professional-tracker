import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { randomUUID } from "crypto";

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);
const tableName = process.env.TABLE_USER_GOALS;

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
        const { user_id, academic_year } = pathParameters || {};
        const { university_id } = queryStringParameters || {};

        // Extract user_id from JWT token if not in path
        const userId = user_id || event.requestContext?.authorizer?.claims?.sub;
        const universityId = university_id || event.requestContext?.authorizer?.claims?.['custom:university_id'];

        if (!userId) {
            return formatResponse(401, { error: 'User ID not found in token' });
        }

        // University ID is only required for POST operations (creating/updating goals)
        if (httpMethod === 'POST' && !universityId) {
            return formatResponse(400, { error: 'University ID is required' });
        }

        switch (httpMethod) {
            case 'GET':
                if (academic_year) {
                    return await getUserGoals(userId, academic_year);
                } else {
                    // Get current academic year goals
                    const currentYear = getCurrentAcademicYear();
                    return await getUserGoals(userId, currentYear);
                }
            case 'POST':
                return await createOrUpdateUserGoals(userId, universityId, payload);
            case 'PUT':
                if (!academic_year) {
                    return formatResponse(400, { error: 'Academic year is required for updates' });
                }
                return await updateUserGoals(userId, academic_year, payload);
            default:
                return formatResponse(405, { error: 'Method not allowed' });
        }
    } catch (error) {
        console.error('Error:', error);
        return formatResponse(500, { error: error.message });
    }
};

async function getUserGoals(userId, academicYear) {
    try {
        const response = await docClient.send(new GetCommand({
            TableName: tableName,
            Key: { user_id: userId, academic_year: academicYear }
        }));

        if (!response.Item) {
            // Return default goals if none exist
            return formatResponse(200, {
                user_id: userId,
                academic_year: academicYear,
                goals: getDefaultGoals(),
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            });
        }

        return formatResponse(200, response.Item);
    } catch (error) {
        console.error('Error getting user goals:', error);
        return formatResponse(500, { error: 'Failed to get user goals' });
    }
}

async function createOrUpdateUserGoals(userId, universityId, payload) {
    try {
        const academicYear = payload.academic_year || getCurrentAcademicYear();
        const timestamp = new Date().toISOString();

        // Get existing goals or create new ones
        const existingGoals = await getUserGoals(userId, academicYear);
        const existingData = existingGoals.statusCode === 200 ? JSON.parse(existingGoals.body) : null;

        // Merge with existing goals
        const goals = {
            ...getDefaultGoals(),
            ...(existingData?.goals || {}),
            ...(payload.goals || {})
        };

        // Validate goals
        const validation = validateGoals(goals);
        if (!validation.valid) {
            return formatResponse(400, { error: validation.message });
        }

        const goalItem = {
            user_id: userId,
            university_id: universityId,
            academic_year: academicYear,
            goals: goals,
            created_at: existingData?.created_at || timestamp,
            updated_at: timestamp
        };

        await docClient.send(new PutCommand({
            TableName: tableName,
            Item: goalItem
        }));

        return formatResponse(200, {
            success: true,
            goals: goalItem,
            message: 'Goals updated successfully'
        });
    } catch (error) {
        console.error('Error creating/updating user goals:', error);
        return formatResponse(500, { error: 'Failed to create/update user goals' });
    }
}

async function updateUserGoals(userId, academicYear, payload) {
    try {
        const timestamp = new Date().toISOString();

        // Get existing goals
        const existingResponse = await docClient.send(new GetCommand({
            TableName: tableName,
            Key: { user_id: userId, academic_year: academicYear }
        }));

        if (!existingResponse.Item) {
            return formatResponse(404, { error: 'Goals not found for this academic year' });
        }

        const existingGoals = existingResponse.Item.goals;
        const updatedGoals = {
            ...existingGoals,
            ...(payload.goals || {})
        };

        // Validate updated goals
        const validation = validateGoals(updatedGoals);
        if (!validation.valid) {
            return formatResponse(400, { error: validation.message });
        }

        // Update specific fields
        const updateExpression = 'SET goals = :goals, updated_at = :updated_at';
        const expressionAttributeValues = {
            ':goals': updatedGoals,
            ':updated_at': timestamp
        };

        const response = await docClient.send(new UpdateCommand({
            TableName: tableName,
            Key: { user_id: userId, academic_year: academicYear },
            UpdateExpression: updateExpression,
            ExpressionAttributeValues: expressionAttributeValues,
            ReturnValues: 'ALL_NEW'
        }));

        return formatResponse(200, {
            success: true,
            goals: response.Attributes,
            message: 'Goals updated successfully'
        });
    } catch (error) {
        console.error('Error updating user goals:', error);
        return formatResponse(500, { error: 'Failed to update user goals' });
    }
}

function getDefaultGoals() {
    const currentYear = getCurrentAcademicYear();
    const yearDates = getAcademicYearDates(currentYear);

    return {
        shadowing: {
            target_hours: 0,
            current_hours: 0,
            start_date: yearDates.start_date,
            end_date: yearDates.end_date,
            is_custom: false,
            created_at: new Date().toISOString()
        },
        volunteering: {
            target_hours: 0,
            current_hours: 0,
            start_date: yearDates.start_date,
            end_date: yearDates.end_date,
            is_custom: false,
            created_at: new Date().toISOString()
        }
    };
}

function validateGoals(goals) {
    const requiredCategories = ['shadowing', 'volunteering'];

    for (const category of requiredCategories) {
        if (!goals[category]) {
            return { valid: false, message: `${category} goals are required` };
        }

        const goal = goals[category];
        if (typeof goal.target_hours !== 'number' || goal.target_hours < 0) {
            return { valid: false, message: `${category} target_hours must be a positive number` };
        }

        if (typeof goal.current_hours !== 'number' || goal.current_hours < 0) {
            return { valid: false, message: `${category} current_hours must be a positive number` };
        }

        if (!goal.start_date || !goal.end_date) {
            return { valid: false, message: `${category} start_date and end_date are required` };
        }

        if (new Date(goal.start_date) >= new Date(goal.end_date)) {
            return { valid: false, message: `${category} start_date must be before end_date` };
        }
    }

    return { valid: true };
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
