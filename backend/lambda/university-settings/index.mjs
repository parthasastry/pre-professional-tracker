import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);
const tableName = process.env.TABLE_UNIVERSITY_SETTINGS;

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
        const { httpMethod, pathParameters, body } = event;
        const { university_id } = pathParameters || {};

        if (!university_id) {
            return formatResponse(400, { error: 'university_id is required' });
        }

        switch (httpMethod) {
            case 'GET':
                return await getUniversitySettings(university_id);
            case 'PUT':
                const payload = JSON.parse(body);
                return await updateUniversitySettings(university_id, payload);
            default:
                return formatResponse(405, { error: 'Method not allowed' });
        }
    } catch (error) {
        console.error('Error:', error);
        return formatResponse(500, { error: error.message });
    }
};

async function getUniversitySettings(university_id) {
    // Get all settings for the university
    const response = await docClient.send(new QueryCommand({
        TableName: tableName,
        KeyConditionExpression: 'university_id = :university_id',
        ExpressionAttributeValues: { ':university_id': university_id }
    }));

    const settings = response.Items || [];

    // Convert array of settings to object
    const settingsObject = settings.reduce((acc, setting) => {
        acc[setting.setting_key] = setting.setting_value;
        return acc;
    }, {});

    // Return default settings if none exist
    if (settings.length === 0) {
        return formatResponse(200, getDefaultSettings());
    }

    return formatResponse(200, settingsObject);
}

async function updateUniversitySettings(university_id, settings) {
    const timestamp = new Date().toISOString();
    const results = [];

    // Update each setting
    for (const [key, value] of Object.entries(settings)) {
        try {
            await docClient.send(new PutCommand({
                TableName: tableName,
                Item: {
                    university_id,
                    setting_key: key,
                    setting_value: value,
                    updated_at: timestamp
                }
            }));
            results.push({ key, success: true });
        } catch (error) {
            console.error(`Error updating setting ${key}:`, error);
            results.push({ key, success: false, error: error.message });
        }
    }

    return formatResponse(200, {
        success: true,
        updated_settings: results,
        updated_at: timestamp
    });
}

function getDefaultSettings() {
    return {
        hour_goals: {
            shadowing: 100,
            volunteering: 200
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
        ],
        features: {
            pre_med: true,
            pre_dental: false,
            pre_pa: false,
            analytics: true,
            advisor_portal: true,
            announcements: true
        },
        notifications: {
            email_reminders: true,
            weekly_summaries: true,
            milestone_celebrations: true
        },
        branding: {
            logo_url: '',
            primary_color: '#3498db',
            secondary_color: '#2c3e50'
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
