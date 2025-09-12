import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { randomUUID } from "crypto";

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);
const s3Client = new S3Client({});

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
        const { pdf_id } = pathParameters || {};

        if (httpMethod === 'POST') {
            const payload = JSON.parse(body);
            const result = await generatePDF(payload);
            return formatResponse(200, result);
        } else if (httpMethod === 'GET' && pdf_id) {
            const result = await getPDF(pdf_id);
            return formatResponse(200, result);
        } else {
            return formatResponse(405, { error: 'Method not allowed' });
        }
    } catch (error) {
        console.error('Error:', error);
        return formatResponse(500, { error: error.message });
    }
};

async function generatePDF(payload) {
    const { user_id, university_id, format = 'portfolio' } = payload;

    if (!user_id || !university_id) {
        return formatResponse(400, { error: 'user_id and university_id are required' });
    }

    // Get user data
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

    // Get experiences
    const experiencesResponse = await docClient.send(new QueryCommand({
        TableName: process.env.TABLE_EXPERIENCES,
        IndexName: 'UserIndex',
        KeyConditionExpression: 'user_id = :user_id',
        ExpressionAttributeValues: { ':user_id': user_id }
    }));

    // Get courses
    const coursesResponse = await docClient.send(new QueryCommand({
        TableName: process.env.TABLE_COURSES,
        IndexName: 'UserIndex',
        KeyConditionExpression: 'user_id = :user_id',
        ExpressionAttributeValues: { ':user_id': user_id }
    }));

    // Get checklist
    const checklistResponse = await docClient.send(new QueryCommand({
        TableName: process.env.TABLE_CHECKLIST,
        IndexName: 'UserIndex',
        KeyConditionExpression: 'user_id = :user_id',
        ExpressionAttributeValues: { ':user_id': user_id }
    }));

    // Generate PDF content
    const pdfContent = generatePDFContent({
        user,
        experiences: experiencesResponse.Items || [],
        courses: coursesResponse.Items || [],
        checklist: checklistResponse.Items || []
    });

    // Generate PDF ID and upload to S3
    const pdf_id = randomUUID();
    const fileName = `portfolio_${user_id}_${Date.now()}.pdf`;

    await s3Client.send(new PutObjectCommand({
        Bucket: process.env.S3_PDFS_BUCKET,
        Key: fileName,
        Body: pdfContent,
        ContentType: 'application/pdf'
    }));

    // Cache PDF info in DynamoDB
    await docClient.send(new PutCommand({
        TableName: process.env.TABLE_PDF_CACHE,
        Item: {
            user_id,
            pdf_id,
            file_name: fileName,
            created_at: new Date().toISOString(),
            expires_at: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60) // 7 days
        }
    }));

    return {
        pdf_id,
        file_name: fileName,
        download_url: `https://${process.env.S3_PDFS_BUCKET}.s3.amazonaws.com/${fileName}`,
        created_at: new Date().toISOString()
    };
}

async function getPDF(pdf_id) {
    const response = await docClient.send(new QueryCommand({
        TableName: process.env.TABLE_PDF_CACHE,
        KeyConditionExpression: 'pdf_id = :pdf_id',
        ExpressionAttributeValues: { ':pdf_id': pdf_id }
    }));

    const pdfInfo = response.Items?.[0];
    if (!pdfInfo) {
        return formatResponse(404, { error: 'PDF not found' });
    }

    return {
        pdf_id: pdfInfo.pdf_id,
        file_name: pdfInfo.file_name,
        download_url: `https://${process.env.S3_PDFS_BUCKET}.s3.amazonaws.com/${pdfInfo.file_name}`,
        created_at: pdfInfo.created_at
    };
}

function generatePDFContent(data) {
    const { user, experiences, courses, checklist } = data;

    // Calculate totals
    const shadowingHours = experiences
        .filter(exp => exp.category === 'shadowing')
        .reduce((total, exp) => total + (parseFloat(exp.hours) || 0), 0);

    const volunteeringHours = experiences
        .filter(exp => exp.category === 'volunteering')
        .reduce((total, exp) => total + (parseFloat(exp.hours) || 0), 0);

    // Calculate GPA
    const totalCredits = courses.reduce((total, course) => total + (parseFloat(course.credits) || 0), 0);
    const totalPoints = courses.reduce((total, course) => total + (parseFloat(course.gpa_points) || 0), 0);
    const gpa = totalCredits > 0 ? totalPoints / totalCredits : 0;

    // Generate HTML content (simplified for this example)
    const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Pre-Professional Portfolio - ${user.given_name} ${user.family_name}</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 40px; }
                .header { text-align: center; margin-bottom: 30px; }
                .section { margin-bottom: 25px; }
                .section h2 { color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 5px; }
                .summary { display: flex; justify-content: space-around; background: #f8f9fa; padding: 20px; border-radius: 5px; }
                .summary-item { text-align: center; }
                .summary-value { font-size: 24px; font-weight: bold; color: #2c3e50; }
                .summary-label { color: #7f8c8d; }
                table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                th { background-color: #f2f2f2; }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>Pre-Professional Portfolio</h1>
                <h2>${user.given_name} ${user.family_name}</h2>
                <p>University: ${user.university_name || 'N/A'}</p>
                <p>Graduation Year: ${user.graduation_year || 'N/A'}</p>
            </div>

            <div class="section">
                <h2>Summary</h2>
                <div class="summary">
                    <div class="summary-item">
                        <div class="summary-value">${shadowingHours}</div>
                        <div class="summary-label">Shadowing Hours</div>
                    </div>
                    <div class="summary-item">
                        <div class="summary-value">${volunteeringHours}</div>
                        <div class="summary-label">Volunteering Hours</div>
                    </div>
                    <div class="summary-item">
                        <div class="summary-value">${gpa.toFixed(2)}</div>
                        <div class="summary-label">GPA</div>
                    </div>
                    <div class="summary-item">
                        <div class="summary-value">${experiences.length}</div>
                        <div class="summary-label">Total Experiences</div>
                    </div>
                </div>
            </div>

            <div class="section">
                <h2>Experiences</h2>
                <table>
                    <tr>
                        <th>Title</th>
                        <th>Organization</th>
                        <th>Category</th>
                        <th>Hours</th>
                        <th>Date</th>
                    </tr>
                    ${experiences.map(exp => `
                        <tr>
                            <td>${exp.title}</td>
                            <td>${exp.organization}</td>
                            <td>${exp.category}</td>
                            <td>${exp.hours}</td>
                            <td>${new Date(exp.created_at).toLocaleDateString()}</td>
                        </tr>
                    `).join('')}
                </table>
            </div>

            <div class="section">
                <h2>Academic Record</h2>
                <table>
                    <tr>
                        <th>Course</th>
                        <th>Credits</th>
                        <th>Grade</th>
                        <th>Category</th>
                    </tr>
                    ${courses.map(course => `
                        <tr>
                            <td>${course.course_name}</td>
                            <td>${course.credits}</td>
                            <td>${course.grade}</td>
                            <td>${course.category}</td>
                        </tr>
                    `).join('')}
                </table>
            </div>

            <div class="section">
                <h2>Progress Checklist</h2>
                <table>
                    <tr>
                        <th>Item</th>
                        <th>Status</th>
                        <th>Due Date</th>
                    </tr>
                    ${checklist.map(item => `
                        <tr>
                            <td>${item.item}</td>
                            <td>${item.status}</td>
                            <td>${item.due_date ? new Date(item.due_date).toLocaleDateString() : 'N/A'}</td>
                        </tr>
                    `).join('')}
                </table>
            </div>
        </body>
        </html>
    `;

    // In a real implementation, you would use a library like Puppeteer to convert HTML to PDF
    // For now, we'll return the HTML content as a placeholder
    return Buffer.from(htmlContent, 'utf8');
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
