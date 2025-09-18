import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand, PutCommand } from "@aws-sdk/lib-dynamodb";

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
        const { university_id, user_id, date_range } = queryStringParameters || {};

        if (!university_id) {
            return formatResponse(400, { error: 'university_id is required' });
        }

        const analyticsData = await generateAnalytics(university_id, user_id, date_range);
        return formatResponse(200, analyticsData);
    } catch (error) {
        console.error('Error:', error);
        return formatResponse(500, { error: error.message });
    }
};

async function generateAnalytics(university_id, user_id, date_range) {
    const analytics_id = `analytics_${university_id}_${Date.now()}`;
    const date = new Date().toISOString().split('T')[0];

    // Get all users in university
    const usersResponse = await docClient.send(new QueryCommand({
        TableName: process.env.TABLE_USERS,
        KeyConditionExpression: 'university_id = :university_id',
        ExpressionAttributeValues: { ':university_id': university_id }
    }));

    const users = usersResponse.Items || [];
    const students = users.filter(user => user.user_type === 'student');

    // Get experiences for all students
    const experiencesResponse = await docClient.send(new QueryCommand({
        TableName: process.env.TABLE_EXPERIENCES,
        KeyConditionExpression: 'university_id = :university_id',
        ExpressionAttributeValues: { ':university_id': university_id }
    }));

    // Get courses for all students
    const coursesResponse = await docClient.send(new QueryCommand({
        TableName: process.env.TABLE_COURSES,
        KeyConditionExpression: 'university_id = :university_id',
        ExpressionAttributeValues: { ':university_id': university_id }
    }));

    // Get checklist for all students
    const checklistResponse = await docClient.send(new QueryCommand({
        TableName: process.env.TABLE_CHECKLIST,
        KeyConditionExpression: 'university_id = :university_id',
        ExpressionAttributeValues: { ':university_id': university_id }
    }));

    const experiences = experiencesResponse.Items || [];
    const courses = coursesResponse.Items || [];
    const checklistItems = checklistResponse.Items || [];

    // Calculate university-wide statistics
    const stats = calculateUniversityStats(students, experiences, courses, checklistItems);

    // Store analytics in DynamoDB
    await docClient.send(new PutCommand({
        TableName: process.env.TABLE_ANALYTICS,
        Item: {
            university_id,
            analytics_id,
            date,
            stats,
            created_at: new Date().toISOString(),
            expires_at: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60) // 30 days
        }
    }));

    return {
        university_id,
        analytics_id,
        date,
        stats,
        generated_at: new Date().toISOString()
    };
}

function calculateUniversityStats(students, experiences, courses, checklistItems) {
    const totalStudents = students.length;
    const activeStudents = students.filter(student => student.status === 'active').length;

    // Experience statistics
    const shadowingHours = experiences
        .filter(exp => exp.category === 'shadowing')
        .reduce((total, exp) => total + (parseFloat(exp.total_hours) || 0), 0);

    const volunteeringHours = experiences
        .filter(exp => exp.category === 'volunteering')
        .reduce((total, exp) => total + (parseFloat(exp.total_hours) || 0), 0);

    const avgShadowingHours = totalStudents > 0 ? shadowingHours / totalStudents : 0;
    const avgVolunteeringHours = totalStudents > 0 ? volunteeringHours / totalStudents : 0;

    // GPA statistics
    const studentGPAs = students.map(student => {
        const studentCourses = courses.filter(course => course.user_id === student.user_id);
        const totalCredits = studentCourses.reduce((total, course) => total + (parseFloat(course.credits) || 0), 0);
        const totalPoints = studentCourses.reduce((total, course) => total + (parseFloat(course.gpa_points) || 0), 0);
        return totalCredits > 0 ? totalPoints / totalCredits : 0;
    }).filter(gpa => gpa > 0);

    const avgGPA = studentGPAs.length > 0 ? studentGPAs.reduce((sum, gpa) => sum + gpa, 0) / studentGPAs.length : 0;

    // Checklist completion statistics
    const checklistCompletion = students.map(student => {
        const studentChecklist = checklistItems.filter(item => item.user_id === student.user_id);
        const completed = studentChecklist.filter(item => item.status === 'done').length;
        const total = studentChecklist.length;
        return total > 0 ? (completed / total) * 100 : 0;
    });

    const avgChecklistCompletion = checklistCompletion.length > 0
        ? checklistCompletion.reduce((sum, completion) => sum + completion, 0) / checklistCompletion.length
        : 0;

    // Experience distribution
    const experienceDistribution = {
        shadowing: experiences.filter(exp => exp.category === 'shadowing').length,
        volunteering: experiences.filter(exp => exp.category === 'volunteering').length
    };

    // Course distribution by category
    const courseDistribution = courses.reduce((acc, course) => {
        const category = course.category || 'other';
        acc[category] = (acc[category] || 0) + 1;
        return acc;
    }, {});

    return {
        students: {
            total: totalStudents,
            active: activeStudents,
            inactive: totalStudents - activeStudents
        },
        experiences: {
            total_shadowing_hours: shadowingHours,
            total_volunteering_hours: volunteeringHours,
            avg_shadowing_hours: avgShadowingHours,
            avg_volunteering_hours: avgVolunteeringHours,
            distribution: experienceDistribution
        },
        academic: {
            avg_gpa: avgGPA,
            total_courses: courses.length,
            course_distribution: courseDistribution
        },
        progress: {
            avg_checklist_completion: avgChecklistCompletion,
            total_checklist_items: checklistItems.length
        }
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
