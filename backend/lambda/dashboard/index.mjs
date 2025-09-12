import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

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
        const { queryStringParameters } = event;
        const { user_id, university_id } = queryStringParameters || {};

        if (!user_id || !university_id) {
            return formatResponse(400, { error: 'user_id and university_id are required' });
        }

        const dashboardData = await getDashboardData(user_id, university_id);
        return formatResponse(200, dashboardData);
    } catch (error) {
        console.error('Error:', error);
        return formatResponse(500, { error: error.message });
    }
};

async function getDashboardData(user_id, university_id) {
    // Get experiences data
    const experiencesResponse = await docClient.send(new QueryCommand({
        TableName: process.env.TABLE_EXPERIENCES,
        IndexName: 'UserIndex',
        KeyConditionExpression: 'user_id = :user_id',
        ExpressionAttributeValues: { ':user_id': user_id }
    }));

    // Get courses data
    const coursesResponse = await docClient.send(new QueryCommand({
        TableName: process.env.TABLE_COURSES,
        IndexName: 'UserIndex',
        KeyConditionExpression: 'user_id = :user_id',
        ExpressionAttributeValues: { ':user_id': user_id }
    }));

    // Get checklist data
    const checklistResponse = await docClient.send(new QueryCommand({
        TableName: process.env.TABLE_CHECKLIST,
        IndexName: 'UserIndex',
        KeyConditionExpression: 'user_id = :user_id',
        ExpressionAttributeValues: { ':user_id': user_id }
    }));

    // Calculate totals
    const experiences = experiencesResponse.Items || [];
    const courses = coursesResponse.Items || [];
    const checklistItems = checklistResponse.Items || [];

    // Calculate experience totals
    const shadowingHours = experiences
        .filter(exp => exp.category === 'shadowing')
        .reduce((total, exp) => total + (parseFloat(exp.hours) || 0), 0);

    const volunteeringHours = experiences
        .filter(exp => exp.category === 'volunteering')
        .reduce((total, exp) => total + (parseFloat(exp.hours) || 0), 0);

    // Calculate GPA
    const gpaData = calculateGPA(courses);

    // Calculate checklist progress
    const checklistProgress = calculateChecklistProgress(checklistItems);

    // Recent activity (last 5 items)
    const recentActivity = [
        ...experiences.slice(-3).map(exp => ({
            type: 'experience',
            title: exp.title,
            category: exp.category,
            date: exp.created_at,
            hours: exp.hours
        })),
        ...courses.slice(-2).map(course => ({
            type: 'course',
            title: course.course_name,
            grade: course.grade,
            date: course.created_at
        }))
    ].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5);

    return {
        user_id,
        university_id,
        totals: {
            shadowing_hours: shadowingHours,
            volunteering_hours: volunteeringHours,
            total_experiences: experiences.length,
            total_courses: courses.length
        },
        gpa: gpaData,
        checklist: checklistProgress,
        recent_activity: recentActivity,
        last_updated: new Date().toISOString()
    };
}

function calculateGPA(courses) {
    if (!courses || courses.length === 0) {
        return {
            cumulative: 0,
            science: 0,
            total_credits: 0,
            science_credits: 0
        };
    }

    const scienceCategories = ['biology', 'chemistry', 'physics', 'mathematics'];

    let totalPoints = 0;
    let totalCredits = 0;
    let sciencePoints = 0;
    let scienceCredits = 0;

    courses.forEach(course => {
        const credits = parseFloat(course.credits) || 0;
        const points = parseFloat(course.gpa_points) || 0;

        totalPoints += points;
        totalCredits += credits;

        if (scienceCategories.includes(course.category?.toLowerCase())) {
            sciencePoints += points;
            scienceCredits += credits;
        }
    });

    return {
        cumulative: totalCredits > 0 ? totalPoints / totalCredits : 0,
        science: scienceCredits > 0 ? sciencePoints / scienceCredits : 0,
        total_credits: totalCredits,
        science_credits: scienceCredits
    };
}

function calculateChecklistProgress(checklistItems) {
    if (!checklistItems || checklistItems.length === 0) {
        return {
            total: 0,
            completed: 0,
            in_progress: 0,
            not_started: 0,
            percentage: 0
        };
    }

    const completed = checklistItems.filter(item => item.status === 'done').length;
    const inProgress = checklistItems.filter(item => item.status === 'in_progress').length;
    const notStarted = checklistItems.filter(item => item.status === 'not_started').length;
    const total = checklistItems.length;

    return {
        total,
        completed,
        in_progress,
        not_started,
        percentage: total > 0 ? Math.round((completed / total) * 100) : 0
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
