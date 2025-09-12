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
        const { httpMethod, pathParameters, body, queryStringParameters } = event;
        const payload = body ? JSON.parse(body) : {};
        const { course_id, university_id } = pathParameters || {};
        const userId = queryStringParameters?.user_id;
        const semester = queryStringParameters?.semester;

        switch (httpMethod) {
            case 'GET':
                if (course_id && university_id) {
                    return await getCourse(course_id, university_id);
                } else if (university_id) {
                    return await listCourses(university_id, userId, semester);
                } else {
                    return formatResponse(400, { error: 'university_id required' });
                }
            case 'POST':
                return await createCourse(payload);
            case 'PUT':
                return await updateCourse(course_id, university_id, payload);
            case 'DELETE':
                return await deleteCourse(course_id, university_id);
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
        ConditionExpression: 'attribute_not_exists(course_id) AND attribute_not_exists(university_id)'
    }));

    return formatResponse(201, { success: true, course: item });
}

async function getCourse(course_id, university_id) {
    const response = await docClient.send(new GetCommand({
        TableName: tableName,
        Key: { course_id, university_id }
    }));

    if (!response.Item) {
        return formatResponse(404, { error: 'Course not found' });
    }

    return formatResponse(200, response.Item);
}

async function listCourses(university_id, userId, semester) {
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

        // Filter by semester if specified
        if (semester) {
            queryParams.KeyConditionExpression = 'user_id = :user_id AND semester_year = :semester';
            queryParams.ExpressionAttributeValues[':semester'] = semester;
        }
    }

    const response = await docClient.send(new QueryCommand(queryParams));

    return formatResponse(200, { items: response.Items || [] });
}

async function updateCourse(course_id, university_id, attributes) {
    if (!course_id || !university_id) {
        return formatResponse(400, { error: 'Course ID and University ID are required' });
    }

    attributes.updated_at = new Date().toISOString();

    // Recalculate GPA points if grade or credits changed
    if (attributes.grade || attributes.credits) {
        const currentItem = await docClient.send(new GetCommand({
            TableName: tableName,
            Key: { course_id, university_id }
        }));

        if (currentItem.Item) {
            const grade = attributes.grade || currentItem.Item.grade;
            const credits = attributes.credits || currentItem.Item.credits;
            attributes.gpa_points = calculateGPAPoints(grade, credits);
        }
    }

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
        Key: { course_id, university_id },
        UpdateExpression: updateExpression,
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: expressionAttributeValues,
        ReturnValues: 'ALL_NEW'
    }));

    return formatResponse(200, response.Attributes);
}

async function deleteCourse(course_id, university_id) {
    if (!course_id || !university_id) {
        return formatResponse(400, { error: 'Course ID and University ID are required' });
    }

    await docClient.send(new DeleteCommand({
        TableName: tableName,
        Key: { course_id, university_id }
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
