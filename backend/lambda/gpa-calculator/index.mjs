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
        const { httpMethod, body, queryStringParameters } = event;
        const { user_id, university_id } = queryStringParameters || {};

        if (!user_id || !university_id) {
            return formatResponse(400, { error: 'user_id and university_id are required' });
        }

        if (httpMethod === 'GET') {
            const gpaData = await calculateGPA(user_id, university_id);
            return formatResponse(200, gpaData);
        } else if (httpMethod === 'POST') {
            const payload = JSON.parse(body);
            const gpaData = await calculateGPAByCourses(payload.courses);
            return formatResponse(200, gpaData);
        } else {
            return formatResponse(405, { error: 'Method not allowed' });
        }
    } catch (error) {
        console.error('Error:', error);
        return formatResponse(500, { error: error.message });
    }
};

async function calculateGPA(user_id, university_id) {
    // Get all courses for the user
    const coursesResponse = await docClient.send(new QueryCommand({
        TableName: process.env.TABLE_COURSES,
        KeyConditionExpression: 'user_id = :user_id',
        ExpressionAttributeValues: { ':user_id': user_id }
    }));

    const courses = coursesResponse.Items || [];
    return calculateGPAByCourses(courses);
}

function calculateGPAByCourses(courses) {
    if (!courses || courses.length === 0) {
        return {
            cumulative: 0,
            science: 0,
            total_credits: 0,
            science_credits: 0,
            prerequisite_status: {},
            breakdown: {
                by_semester: {},
                by_category: {}
            }
        };
    }

    const scienceCategories = ['biology', 'chemistry', 'physics', 'mathematics'];
    const prerequisiteCourses = {
        'biology': ['General Biology I', 'General Biology II', 'Cell Biology', 'Genetics'],
        'chemistry': ['General Chemistry I', 'General Chemistry II', 'Organic Chemistry I', 'Organic Chemistry II'],
        'physics': ['Physics I', 'Physics II'],
        'mathematics': ['Calculus I', 'Calculus II', 'Statistics'],
        'english': ['English Composition I', 'English Composition II']
    };

    let totalPoints = 0;
    let totalCredits = 0;
    let sciencePoints = 0;
    let scienceCredits = 0;

    const bySemester = {};
    const byCategory = {};

    courses.forEach(course => {
        const credits = parseFloat(course.credits) || 0;
        const points = parseFloat(course.gpa_points) || 0;
        const semester = course.semester_year || 'Unknown';
        const category = course.category || 'other';

        totalPoints += points;
        totalCredits += credits;

        // Track by semester
        if (!bySemester[semester]) {
            bySemester[semester] = { points: 0, credits: 0, courses: [] };
        }
        bySemester[semester].points += points;
        bySemester[semester].credits += credits;
        bySemester[semester].courses.push(course);

        // Track by category
        if (!byCategory[category]) {
            byCategory[category] = { points: 0, credits: 0, courses: [] };
        }
        byCategory[category].points += points;
        byCategory[category].credits += credits;
        byCategory[category].courses.push(course);

        if (scienceCategories.includes(category.toLowerCase())) {
            sciencePoints += points;
            scienceCredits += credits;
        }
    });

    // Calculate prerequisite status
    const prerequisiteStatus = {};
    Object.keys(prerequisiteCourses).forEach(subject => {
        prerequisiteStatus[subject] = {
            required: prerequisiteCourses[subject],
            completed: [],
            missing: [],
            status: 'incomplete'
        };

        prerequisiteCourses[subject].forEach(requiredCourse => {
            const completed = courses.find(course =>
                course.course_name.toLowerCase().includes(requiredCourse.toLowerCase()) ||
                requiredCourse.toLowerCase().includes(course.course_name.toLowerCase())
            );

            if (completed) {
                prerequisiteStatus[subject].completed.push({
                    course: completed.course_name,
                    grade: completed.grade,
                    credits: completed.credits
                });
            } else {
                prerequisiteStatus[subject].missing.push(requiredCourse);
            }
        });

        // Determine status
        const completionRate = prerequisiteStatus[subject].completed.length / prerequisiteCourses[subject].length;
        if (completionRate === 1) {
            prerequisiteStatus[subject].status = 'complete';
        } else if (completionRate > 0) {
            prerequisiteStatus[subject].status = 'in_progress';
        } else {
            prerequisiteStatus[subject].status = 'not_started';
        }
    });

    // Calculate semester GPAs
    Object.keys(bySemester).forEach(semester => {
        const semesterData = bySemester[semester];
        bySemester[semester].gpa = semesterData.credits > 0 ? semesterData.points / semesterData.credits : 0;
    });

    // Calculate category GPAs
    Object.keys(byCategory).forEach(category => {
        const categoryData = byCategory[category];
        byCategory[category].gpa = categoryData.credits > 0 ? categoryData.points / categoryData.credits : 0;
    });

    return {
        cumulative: totalCredits > 0 ? totalPoints / totalCredits : 0,
        science: scienceCredits > 0 ? sciencePoints / scienceCredits : 0,
        total_credits: totalCredits,
        science_credits: scienceCredits,
        prerequisite_status: prerequisiteStatus,
        breakdown: {
            by_semester: bySemester,
            by_category: byCategory
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
