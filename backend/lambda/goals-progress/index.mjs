import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);
const userGoalsTable = process.env.TABLE_USER_GOALS;
const experiencesTable = process.env.TABLE_EXPERIENCES;

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

        // University ID is only required for POST operations (bulk calculations)
        if (httpMethod === 'POST' && !universityId) {
            return formatResponse(400, { error: 'University ID is required' });
        }

        switch (httpMethod) {
            case 'GET':
                if (academic_year) {
                    return await getGoalsProgress(userId, academic_year);
                } else {
                    // Get current academic year progress
                    const currentYear = getCurrentAcademicYear();
                    return await getGoalsProgress(userId, currentYear);
                }
            case 'POST':
                // Bulk calculate progress for multiple users
                return await calculateBulkProgress(payload);
            default:
                return formatResponse(405, { error: 'Method not allowed' });
        }
    } catch (error) {
        console.error('Error:', error);
        return formatResponse(500, { error: error.message });
    }
};

async function getGoalsProgress(userId, academicYear) {
    try {
        // Get user goals
        const goalsResponse = await docClient.send(new GetCommand({
            TableName: userGoalsTable,
            Key: { user_id: userId, academic_year: academicYear }
        }));

        if (!goalsResponse.Item) {
            // Return default progress if no goals exist
            return formatResponse(200, {
                user_id: userId,
                academic_year: academicYear,
                progress: getDefaultProgress(),
                last_calculated: new Date().toISOString()
            });
        }

        const goals = goalsResponse.Item.goals;

        // Get experiences for the academic year
        const experiences = await getExperiencesForAcademicYear(userId, academicYear);

        // Calculate progress
        const progress = calculateProgress(goals, experiences, academicYear);

        return formatResponse(200, {
            user_id: userId,
            academic_year: academicYear,
            goals: goals,
            progress: progress,
            experiences_count: experiences.length,
            last_calculated: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error getting goals progress:', error);
        return formatResponse(500, { error: 'Failed to get goals progress' });
    }
}

async function calculateBulkProgress(payload) {
    try {
        const { user_ids, academic_year } = payload;

        if (!user_ids || !Array.isArray(user_ids)) {
            return formatResponse(400, { error: 'user_ids array is required' });
        }

        const targetYear = academic_year || getCurrentAcademicYear();
        const results = [];

        for (const userId of user_ids) {
            try {
                const progressData = await getGoalsProgress(userId, targetYear);
                results.push({
                    user_id: userId,
                    success: true,
                    data: JSON.parse(progressData.body)
                });
            } catch (error) {
                results.push({
                    user_id: userId,
                    success: false,
                    error: error.message
                });
            }
        }

        return formatResponse(200, {
            academic_year: targetYear,
            results: results,
            calculated_at: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error calculating bulk progress:', error);
        return formatResponse(500, { error: 'Failed to calculate bulk progress' });
    }
}

async function getExperiencesForAcademicYear(userId, academicYear) {
    try {
        const yearDates = getAcademicYearDates(academicYear);

        const response = await docClient.send(new QueryCommand({
            TableName: experiencesTable,
            KeyConditionExpression: 'user_id = :user_id',
            FilterExpression: 'start_date >= :start_date AND start_date <= :end_date',
            ExpressionAttributeValues: {
                ':user_id': userId,
                ':start_date': yearDates.start_date,
                ':end_date': yearDates.end_date
            }
        }));

        return response.Items || [];
    } catch (error) {
        console.error('Error getting experiences:', error);
        return [];
    }
}

function calculateProgress(goals, experiences, academicYear) {
    const yearDates = getAcademicYearDates(academicYear);
    const now = new Date();
    const yearStart = new Date(yearDates.start_date);
    const yearEnd = new Date(yearDates.end_date);

    // Calculate time progress through the academic year
    const totalDays = (yearEnd - yearStart) / (1000 * 60 * 60 * 24);
    const daysElapsed = Math.max(0, (now - yearStart) / (1000 * 60 * 60 * 24));
    const timeProgress = Math.min(100, (daysElapsed / totalDays) * 100);

    const progress = {};

    // Calculate progress for each goal category
    for (const [category, goal] of Object.entries(goals)) {
        const categoryExperiences = experiences.filter(exp => exp.category === category);
        const currentHours = categoryExperiences.reduce((sum, exp) => sum + (exp.hours || 0), 0);
        const targetHours = goal.target_hours || 0;
        const percentage = targetHours > 0 ? Math.min(100, (currentHours / targetHours) * 100) : 0;
        const remaining = Math.max(0, targetHours - currentHours);
        const isComplete = currentHours >= targetHours;

        // Calculate if on track based on time progress
        const expectedHours = (timeProgress / 100) * targetHours;
        const isOnTrack = currentHours >= expectedHours * 0.8; // 80% tolerance

        // Calculate pace needed to reach goal
        const daysRemaining = Math.max(0, (yearEnd - now) / (1000 * 60 * 60 * 24));
        const hoursNeeded = remaining;
        const dailyPace = daysRemaining > 0 ? hoursNeeded / daysRemaining : 0;

        progress[category] = {
            target_hours: targetHours,
            current_hours: currentHours,
            percentage: Math.round(percentage * 100) / 100,
            remaining_hours: remaining,
            is_complete: isComplete,
            is_on_track: isOnTrack,
            time_progress: Math.round(timeProgress * 100) / 100,
            daily_pace_needed: Math.round(dailyPace * 100) / 100,
            experiences_count: categoryExperiences.length,
            last_experience: categoryExperiences.length > 0
                ? categoryExperiences.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0].created_at
                : null
        };
    }

    // Overall progress summary
    const totalTarget = Object.values(goals).reduce((sum, goal) => sum + (goal.target_hours || 0), 0);
    const totalCurrent = Object.values(progress).reduce((sum, prog) => sum + prog.current_hours, 0);
    const overallPercentage = totalTarget > 0 ? (totalCurrent / totalTarget) * 100 : 0;

    progress.overall = {
        total_target_hours: totalTarget,
        total_current_hours: totalCurrent,
        overall_percentage: Math.round(overallPercentage * 100) / 100,
        is_on_track: Object.values(progress).every(prog => prog.is_on_track),
        academic_year: academicYear,
        year_start: yearDates.start_date,
        year_end: yearDates.end_date
    };

    return progress;
}

function getDefaultProgress() {
    return {
        shadowing: {
            target_hours: 0,
            current_hours: 0,
            percentage: 0,
            remaining_hours: 0,
            is_complete: false,
            is_on_track: true,
            time_progress: 0,
            daily_pace_needed: 0,
            experiences_count: 0,
            last_experience: null
        },
        volunteering: {
            target_hours: 0,
            current_hours: 0,
            percentage: 0,
            remaining_hours: 0,
            is_complete: false,
            is_on_track: true,
            time_progress: 0,
            daily_pace_needed: 0,
            experiences_count: 0,
            last_experience: null
        },
        overall: {
            total_target_hours: 0,
            total_current_hours: 0,
            overall_percentage: 0,
            is_on_track: true,
            academic_year: getCurrentAcademicYear(),
            year_start: getAcademicYearDates(getCurrentAcademicYear()).start_date,
            year_end: getAcademicYearDates(getCurrentAcademicYear()).end_date
        }
    };
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
