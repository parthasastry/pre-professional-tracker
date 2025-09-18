import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, PutCommand, DeleteCommand, UpdateCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { randomUUID } from "crypto";

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);
const tableName = process.env.TABLE_COURSES;

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
        const { course_id } = pathParameters || {};
        const semester = queryStringParameters?.semester;

        // Extract user_id from JWT token in the request context
        const userId = requestContext?.authorizer?.claims?.sub || requestContext?.authorizer?.claims?.user_id;
        const universityId = requestContext?.authorizer?.claims?.['custom:university_id'];

        if (!userId) {
            return formatResponse(401, { error: 'User ID not found in token' });
        }

        switch (httpMethod) {
            case 'GET':
                if (course_id) {
                    return await getCourse(userId, course_id);
                } else {
                    return await listCourses(universityId, userId, semester);
                }
            case 'POST':
                // Add user_id and university_id to the payload
                payload.user_id = userId;
                payload.university_id = universityId;
                return await createCourse(payload);
            case 'PUT':
                return await updateCourse(userId, course_id, payload);
            case 'DELETE':
                return await deleteCourse(userId, course_id);
            default:
                return formatResponse(405, { error: 'Method not allowed' });
        }
    } catch (error) {
        console.error('Error:', error);
        return formatResponse(500, { error: error.message });
    }
};

async function createCourse(item) {
    if (!item.course_id) {
        item.course_id = randomUUID();
    }
    if (!item.university_id) {
        return formatResponse(400, { error: 'university_id is required' });
    }

    // Validate required fields
    if (!item.user_id || !item.course_name || !item.credits || !item.grade) {
        return formatResponse(400, { error: 'user_id, course_name, credits, and grade are required' });
    }

    const timestamp = new Date().toISOString();
    item.created_at = timestamp;
    item.updated_at = timestamp;

    // Set default values
    item.category = item.category || 'non-science';
    item.semester_year = item.semester_year || `${item.semester || 'Fall'}_${item.year || new Date().getFullYear()}`;
    item.status = item.status || 'completed';

    // Calculate GPA points
    item.gpa_points = calculateGPAPoints(item.grade, item.credits);

    await docClient.send(new PutCommand({
        TableName: tableName,
        Item: item,
        ConditionExpression: 'attribute_not_exists(course_id)'
    }));

    return formatResponse(201, { success: true, course: item });
}

async function getCourse(user_id, course_id) {
    const response = await docClient.send(new GetCommand({
        TableName: tableName,
        Key: { user_id, course_id }
    }));

    if (!response.Item) {
        return formatResponse(404, { error: 'Course not found' });
    }

    return formatResponse(200, response.Item);
}

async function listCourses(university_id, userId, semester) {
    let queryParams = {
        TableName: tableName,
        KeyConditionExpression: 'user_id = :user_id',
        ExpressionAttributeValues: { ':user_id': userId }
    };

    // Filter by semester if specified
    if (semester) {
        queryParams.IndexName = 'SemesterIndex';
        queryParams.KeyConditionExpression = 'user_id = :user_id AND semester_year = :semester_year';
        queryParams.ExpressionAttributeValues[':semester_year'] = semester;
    }

    const response = await docClient.send(new QueryCommand(queryParams));

    return formatResponse(200, { courses: response.Items || [] });
}

async function updateCourse(user_id, course_id, attributes) {
    if (!user_id || !course_id) {
        return formatResponse(400, { error: 'User ID and Course ID are required' });
    }

    // Add updated timestamp
    attributes.updated_at = new Date().toISOString();

    // Recalculate GPA points if grade or credits changed
    if (attributes.grade || attributes.credits) {
        try {
            const currentItem = await docClient.send(new GetCommand({
                TableName: tableName,
                Key: { user_id, course_id }
            }));

            if (currentItem.Item) {
                const grade = attributes.grade || currentItem.Item.grade;
                const credits = attributes.credits || currentItem.Item.credits;
                attributes.gpa_points = calculateGPAPoints(grade, credits);
            }
        } catch (error) {
            console.error('Error getting current item for GPA calculation:', error);
        }
    }

    // Build update expression with proper handling of reserved words
    const updateExpressions = [];
    const expressionAttributeNames = {};
    const expressionAttributeValues = {};

    // Use a counter to ensure unique attribute names
    let attrCounter = 0;

    Object.entries(attributes).forEach(([key, value]) => {
        // Skip null/undefined values
        if (value === null || value === undefined) {
            return;
        }

        const attrName = `#attr${attrCounter}`;
        const attrValue = `:val${attrCounter}`;

        expressionAttributeNames[attrName] = key;
        expressionAttributeValues[attrValue] = value;
        updateExpressions.push(`${attrName} = ${attrValue}`);

        attrCounter++;
    });

    if (updateExpressions.length === 0) {
        return formatResponse(400, { error: 'No valid attributes to update' });
    }

    const updateExpression = `SET ${updateExpressions.join(', ')}`;

    try {
        // First check if the course exists
        const existingCourse = await docClient.send(new GetCommand({
            TableName: tableName,
            Key: { user_id, course_id }
        }));

        if (!existingCourse.Item) {
            return formatResponse(404, { error: 'Course not found' });
        }

        const response = await docClient.send(new UpdateCommand({
            TableName: tableName,
            Key: { user_id, course_id },
            UpdateExpression: updateExpression,
            ExpressionAttributeNames: expressionAttributeNames,
            ExpressionAttributeValues: expressionAttributeValues,
            ReturnValues: 'ALL_NEW'
        }));

        return formatResponse(200, response.Attributes);
    } catch (error) {
        console.error('Update failed:', error);
        return formatResponse(500, {
            error: 'Failed to update course',
            details: error.message
        });
    }
}

async function deleteCourse(user_id, course_id) {
    if (!user_id || !course_id) {
        return formatResponse(400, { error: 'User ID and Course ID are required' });
    }

    await docClient.send(new DeleteCommand({
        TableName: tableName,
        Key: { user_id, course_id }
    }));

    return formatResponse(200, { success: true });
}

function calculateGPAPoints(grade, credits) {
    const gradePoints = {
        'A+': 4.0, 'A': 4.0, 'A-': 3.7,
        'B+': 3.3, 'B': 3.0, 'B-': 2.7,
        'C+': 2.3, 'C': 2.0, 'C-': 1.7,
        'D+': 1.3, 'D': 1.0, 'D-': 0.7,
        'F': 0.0
    };

    const points = gradePoints[grade.toUpperCase()] || 0;
    return points * parseFloat(credits);
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
