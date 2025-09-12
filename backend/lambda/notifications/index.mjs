import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);
const sesClient = new SESClient({});

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
        const { httpMethod, body } = event;

        if (httpMethod === 'POST') {
            const payload = JSON.parse(body);
            const result = await sendNotification(payload);
            return formatResponse(200, result);
        } else {
            return formatResponse(405, { error: 'Method not allowed' });
        }
    } catch (error) {
        console.error('Error:', error);
        return formatResponse(500, { error: error.message });
    }
};

async function sendNotification(payload) {
    const { type, user_id, university_id, message, subject } = payload;

    if (!type || !user_id || !university_id) {
        return formatResponse(400, { error: 'type, user_id, and university_id are required' });
    }

    // Get user information
    const userResponse = await docClient.send(new QueryCommand({
        TableName: process.env.TABLE_USERS,
        IndexName: 'UserIndex',
        KeyConditionExpression: 'user_id = :user_id',
        ExpressionAttributeValues: { ':user_id': user_id }
    }));

    const user = userResponse.Items?.[0];
    if (!user) {
        return formatResponse(404, { error: 'User not found' });
    }

    // Get user's checklist items for reminders
    const checklistResponse = await docClient.send(new QueryCommand({
        TableName: process.env.TABLE_CHECKLIST,
        IndexName: 'UserIndex',
        KeyConditionExpression: 'user_id = :user_id',
        ExpressionAttributeValues: { ':user_id': user_id }
    }));

    const checklistItems = checklistResponse.Items || [];

    let emailSubject = subject || 'Pre-Professional Tracker Notification';
    let emailMessage = message || '';

    // Generate specific notification content based on type
    switch (type) {
        case 'checklist_reminder':
            emailSubject = 'Checklist Reminder - Pre-Professional Tracker';
            emailMessage = generateChecklistReminderMessage(user, checklistItems);
            break;
        case 'milestone_achievement':
            emailSubject = 'Milestone Achieved! - Pre-Professional Tracker';
            emailMessage = generateMilestoneMessage(user, payload.milestone);
            break;
        case 'weekly_summary':
            emailSubject = 'Weekly Summary - Pre-Professional Tracker';
            emailMessage = await generateWeeklySummary(user, university_id);
            break;
        case 'custom':
            // Use provided subject and message
            break;
        default:
            return formatResponse(400, { error: 'Invalid notification type' });
    }

    // Send email
    const emailParams = {
        Source: process.env.SES_FROM_EMAIL || 'noreply@preprofessionaltracker.com',
        Destination: {
            ToAddresses: [user.email]
        },
        Message: {
            Subject: {
                Data: emailSubject,
                Charset: 'UTF-8'
            },
            Body: {
                Html: {
                    Data: emailMessage,
                    Charset: 'UTF-8'
                }
            }
        }
    };

    try {
        await sesClient.send(new SendEmailCommand(emailParams));
        return {
            success: true,
            message: 'Notification sent successfully',
            user_id,
            type,
            sent_at: new Date().toISOString()
        };
    } catch (error) {
        console.error('SES Error:', error);
        return formatResponse(500, { error: 'Failed to send notification' });
    }
}

function generateChecklistReminderMessage(user, checklistItems) {
    const incompleteItems = checklistItems.filter(item => item.status !== 'done');
    const overdueItems = incompleteItems.filter(item =>
        item.due_date && new Date(item.due_date) < new Date()
    );

    let message = `
        <html>
        <body>
            <h2>Checklist Reminder</h2>
            <p>Hello ${user.given_name},</p>
            <p>Here's your current checklist status:</p>
            
            <h3>Incomplete Items (${incompleteItems.length})</h3>
            <ul>
                ${incompleteItems.map(item => `
                    <li>
                        <strong>${item.item}</strong>
                        ${item.due_date ? ` - Due: ${new Date(item.due_date).toLocaleDateString()}` : ''}
                        ${item.status === 'in_progress' ? ' (In Progress)' : ''}
                    </li>
                `).join('')}
            </ul>
            
            ${overdueItems.length > 0 ? `
                <h3>Overdue Items (${overdueItems.length})</h3>
                <ul>
                    ${overdueItems.map(item => `
                        <li style="color: red;">
                            <strong>${item.item}</strong> - Due: ${new Date(item.due_date).toLocaleDateString()}
                        </li>
                    `).join('')}
                </ul>
            ` : ''}
            
            <p>Keep up the great work!</p>
            <p>Best regards,<br>Pre-Professional Tracker Team</p>
        </body>
        </html>
    `;

    return message;
}

function generateMilestoneMessage(user, milestone) {
    return `
        <html>
        <body>
            <h2>🎉 Milestone Achieved!</h2>
            <p>Congratulations ${user.given_name}!</p>
            <p>You've achieved a new milestone: <strong>${milestone}</strong></p>
            <p>Keep up the excellent work on your pre-professional journey!</p>
            <p>Best regards,<br>Pre-Professional Tracker Team</p>
        </body>
        </html>
    `;
}

async function generateWeeklySummary(user, university_id) {
    // Get user's recent activity
    const experiencesResponse = await docClient.send(new QueryCommand({
        TableName: process.env.TABLE_EXPERIENCES,
        IndexName: 'UserIndex',
        KeyConditionExpression: 'user_id = :user_id',
        ExpressionAttributeValues: { ':user_id': user.user_id }
    }));

    const experiences = experiencesResponse.Items || [];
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const recentExperiences = experiences.filter(exp =>
        new Date(exp.created_at) > weekAgo
    );

    const shadowingHours = recentExperiences
        .filter(exp => exp.category === 'shadowing')
        .reduce((total, exp) => total + (parseFloat(exp.hours) || 0), 0);

    const volunteeringHours = recentExperiences
        .filter(exp => exp.category === 'volunteering')
        .reduce((total, exp) => total + (parseFloat(exp.hours) || 0), 0);

    return `
        <html>
        <body>
            <h2>Weekly Summary</h2>
            <p>Hello ${user.given_name},</p>
            <p>Here's your activity summary for the past week:</p>
            
            <h3>This Week's Progress</h3>
            <ul>
                <li>Shadowing Hours: ${shadowingHours}</li>
                <li>Volunteering Hours: ${volunteeringHours}</li>
                <li>New Experiences: ${recentExperiences.length}</li>
            </ul>
            
            ${recentExperiences.length > 0 ? `
                <h3>Recent Experiences</h3>
                <ul>
                    ${recentExperiences.map(exp => `
                        <li>
                            <strong>${exp.title}</strong> - ${exp.organization}
                            (${exp.hours} hours)
                        </li>
                    `).join('')}
                </ul>
            ` : ''}
            
            <p>Keep up the great work!</p>
            <p>Best regards,<br>Pre-Professional Tracker Team</p>
        </body>
        </html>
    `;
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
