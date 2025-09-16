import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand, QueryCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { TextractClient, DetectDocumentTextCommand } from '@aws-sdk/client-textract';
import { v4 as uuidv4 } from 'uuid';

// Initialize AWS clients
const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);
const s3Client = new S3Client({});
const bedrockClient = new BedrockRuntimeClient({});
const textractClient = new TextractClient({});

// Environment variables
const TABLE_RFP_DOCUMENTS = process.env.TABLE_RFP_DOCUMENTS;
const TABLE_RFP_PROCESSES = process.env.TABLE_RFP_PROCESSES;
const TABLE_RFP_KNOWLEDGE_BASE = process.env.TABLE_RFP_KNOWLEDGE_BASE;
const TABLE_RFP_AUDIT_LOGS = process.env.TABLE_RFP_AUDIT_LOGS;
const S3_DOCUMENTS_BUCKET = process.env.S3_DOCUMENTS_BUCKET;

export const handler = async (event, context) => {
    console.log('RFP Processor Lambda invoked:', JSON.stringify(event, null, 2));

    try {
        const { httpMethod, path, pathParameters, body, queryStringParameters } = event;
        const action = determineAction(httpMethod, path);

        console.log(`Processing action: ${action}`);

        switch (action) {
            case 'upload_document':
                return await uploadDocument(JSON.parse(body || '{}'));

            case 'complete_upload':
                return await completeUpload(JSON.parse(body || '{}'));

            case 'download_response':
                return await downloadRfpResponse(pathParameters?.process_id);

            case 'process_document':
                return await processDocument(JSON.parse(body || '{}'));

            case 'get_status':
                return await getProcessStatus(pathParameters?.process_id);

            case 'get_result':
                return await getProcessResult(pathParameters?.process_id);

            case 'get_decision':
                return await getBidDecision(pathParameters?.process_id);

            case 'get_draft':
                return await getGeneratedDraft(pathParameters?.process_id);

            case 'get_compliance':
                return await getComplianceReview(pathParameters?.process_id);

            case 'health_check':
                return await healthCheck();

            case 'manage_knowledge_base':
                return await manageKnowledgeBase(httpMethod, body);

            default:
                return {
                    statusCode: 400,
                    body: JSON.stringify({ error: 'Invalid action' })
                };
        }
    } catch (error) {
        console.error('Error processing request:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({
                error: 'Internal server error',
                message: error.message
            })
        };
    }
};

function determineAction(httpMethod, path) {
    if (httpMethod === 'GET' && path === '/health') {
        return 'health_check';
    }
    if (httpMethod === 'POST' && path === '/rfp') {
        return 'upload_document';
    }
    if (httpMethod === 'POST' && path === '/rfp/complete-upload') {
        return 'complete_upload';
    }
    if (httpMethod === 'POST' && path === '/rfp/process') {
        return 'process_document';
    }
    if (httpMethod === 'GET' && path.includes('/rfp/status/')) {
        return 'get_status';
    }
    if (httpMethod === 'GET' && path.includes('/rfp/result/')) {
        return 'get_result';
    }
    if (httpMethod === 'GET' && path.includes('/rfp/decision/')) {
        return 'get_decision';
    }
    if (httpMethod === 'GET' && path.includes('/rfp/draft/')) {
        return 'get_draft';
    }
    if (httpMethod === 'GET' && path.includes('/rfp/compliance/')) {
        return 'get_compliance';
    }
    if (path.includes('/knowledge-base')) {
        return 'manage_knowledge_base';
    }
    return 'unknown';
}

async function getBusinessContext() {
    console.log('Retrieving business context from knowledge base');

    try {
        // Query knowledge base for business context data
        const businessData = await docClient.send(new ScanCommand({
            TableName: TABLE_RFP_KNOWLEDGE_BASE,
            FilterExpression: 'content_type = :type',
            ExpressionAttributeValues: {
                ':type': 'business_context'
            }
        }));

        // If no data in knowledge base, return default business context
        if (!businessData.Items || businessData.Items.length === 0) {
            console.log('No business context found in knowledge base, using defaults');
            return getDefaultBusinessContext();
        }

        // Combine all business context items
        const context = businessData.Items.reduce((acc, item) => {
            acc[item.content_id] = item.content_data;
            return acc;
        }, {});

        return formatBusinessContext(context);

    } catch (error) {
        console.error('Error retrieving business context:', error);
        return getDefaultBusinessContext();
    }
}

async function getDefaultBusinessContext() {
    return {
        serviceRegions: ['North America', 'Europe', 'Asia Pacific'],
        currentCapacity: 'Available - 2 projects can start in Q1 2024',
        healthcareExperience: '15+ years, 200+ healthcare IT implementations',
        typicalTimeline: '6-12 months for healthcare IT projects',
        minimumProjectSize: '$500K',
        currentWorkload: '60% capacity utilization',
        specialties: ['EHR Implementation', 'Patient Portals', 'Data Analytics', 'HIPAA Compliance'],
        teamSize: '25 healthcare IT specialists',
        certifications: ['Epic Certified', 'Cerner Certified', 'HIPAA Compliant']
    };
}

function formatBusinessContext(contextData) {
    return {
        serviceRegions: contextData.service_regions?.value || ['North America', 'Europe'],
        currentCapacity: contextData.current_capacity?.value || 'Available',
        healthcareExperience: contextData.healthcare_experience?.value || '10+ years',
        typicalTimeline: contextData.typical_timeline?.value || '6-12 months',
        minimumProjectSize: contextData.minimum_project_size?.value || '$500K',
        currentWorkload: contextData.current_workload?.value || 'Moderate',
        specialties: contextData.specialties?.value || ['EHR Implementation'],
        teamSize: contextData.team_size?.value || '20 specialists',
        certifications: contextData.certifications?.value || ['Healthcare IT Certified']
    };
}

async function getResponseTemplates() {
    console.log('Retrieving response templates from knowledge base');

    try {
        // Query knowledge base for template content
        const templateData = await docClient.send(new ScanCommand({
            TableName: TABLE_RFP_KNOWLEDGE_BASE,
            FilterExpression: 'content_type = :type',
            ExpressionAttributeValues: {
                ':type': 'templates'
            }
        }));

        // If no templates found, return default templates
        if (!templateData.Items || templateData.Items.length === 0) {
            console.log('No templates found in knowledge base, using defaults');
            return getDefaultTemplates();
        }

        // Combine all template items
        const templates = templateData.Items.map(item =>
            `## ${item.title}\n${item.content_data?.content || item.description}`
        ).join('\n\n');

        return templates || getDefaultTemplates();

    } catch (error) {
        console.error('Error retrieving response templates:', error);
        return getDefaultTemplates();
    }
}

async function getDefaultTemplates() {
    return `
## Executive Summary Template
We are a leading healthcare IT consulting firm with [EXPERIENCE] years of experience in [SPECIALTIES]. Our team of [TEAM_SIZE] certified professionals has successfully implemented [CERTIFICATIONS] solutions for healthcare organizations across [SERVICE_REGIONS].

## Company Overview Template
Our company specializes in [SPECIALTIES] with deep expertise in healthcare regulations and compliance. We maintain [CERTIFICATIONS] certifications and have a proven track record of delivering projects within [TYPICAL_TIMELINE] timelines.

## Proposed Solution Template
Based on your requirements, we propose a comprehensive solution that leverages our expertise in [SPECIALTIES]. Our approach includes [SPECIFIC_SOLUTION_COMPONENTS] tailored to your organization's needs.

## Timeline Template
Our typical implementation timeline of [TYPICAL_TIMELINE] ensures thorough planning and execution. Key milestones include [MILESTONE_1], [MILESTONE_2], and [MILESTONE_3].

## Team Qualifications Template
Our team of [TEAM_SIZE] includes [CERTIFICATIONS] certified professionals with extensive experience in healthcare IT implementations. Key team members include [TEAM_ROLES_AND_EXPERIENCE].

## Pricing Structure Template
Our pricing is competitive and based on project scope and complexity. We provide transparent pricing with clear deliverables and milestones. Minimum project engagement is [MINIMUM_PROJECT_SIZE].
    `;
}

async function getComplianceRules() {
    console.log('Retrieving compliance rules from knowledge base');

    try {
        // Query knowledge base for compliance rules
        const complianceData = await docClient.send(new ScanCommand({
            TableName: TABLE_RFP_KNOWLEDGE_BASE,
            FilterExpression: 'content_type = :type',
            ExpressionAttributeValues: {
                ':type': 'compliance_rules'
            }
        }));

        // If no compliance rules found, return default rules
        if (!complianceData.Items || complianceData.Items.length === 0) {
            console.log('No compliance rules found in knowledge base, using defaults');
            return getDefaultComplianceRules();
        }

        // Combine all compliance rule items
        const rules = complianceData.Items.map(item =>
            `## ${item.title}\n${item.content_data?.content || item.description}`
        ).join('\n\n');

        return rules || getDefaultComplianceRules();

    } catch (error) {
        console.error('Error retrieving compliance rules:', error);
        return getDefaultComplianceRules();
    }
}

async function getDefaultComplianceRules() {
    return `
## Healthcare Compliance Rules

### HIPAA Compliance
- Must mention HIPAA compliance in healthcare solutions
- Ensure patient data protection and privacy measures
- Include data encryption and access controls
- Reference HIPAA Business Associate Agreements (BAAs)

### FDA Regulations (if applicable)
- For medical device software: FDA 21 CFR Part 820
- For clinical decision support: FDA guidance compliance
- Quality system requirements and documentation

### Healthcare Industry Standards
- HL7 FHIR for data interoperability
- ICD-10 coding standards
- CPT coding for billing systems
- Meaningful Use requirements (if applicable)

### Professional Standards
- Use proper healthcare terminology
- Maintain professional tone throughout
- Include relevant certifications and credentials
- Reference industry best practices

### Regional Compliance
- Only promise services in regions we actually serve
- Include local healthcare regulations where applicable
- Consider time zone and language requirements

### Risk Management
- Address potential implementation risks
- Include mitigation strategies
- Mention disaster recovery and business continuity
- Include change management processes

### Timeline and Capacity
- Ensure realistic timelines based on our capabilities
- Don't overcommit on delivery dates
- Include buffer time for unexpected issues
- Align with our typical project timeline

### Pricing Compliance
- Meet minimum project size requirements
- Provide transparent pricing structure
- Include all necessary components in pricing
- Align with our pricing guidelines
    `;
}

function calculateComplianceScore(review) {
    // Simple scoring based on pass/fail indicators in the review
    const passCount = (review.match(/✅/g) || []).length;
    const failCount = (review.match(/❌/g) || []).length;
    const totalChecks = passCount + failCount;

    if (totalChecks === 0) return 0;
    return Math.round((passCount / totalChecks) * 100);
}

async function storeRfpResponseInS3(documentId, draft, compliance) {
    console.log('Storing RFP response in S3 for document:', documentId);

    try {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const responseKey = `rfp-responses/${documentId}/${documentId}-response-${timestamp}.md`;

        // Create comprehensive response document
        const responseContent = `# RFP Response - ${documentId}

## Generated On
${new Date().toISOString()}

## Compliance Status
**Status**: ${compliance.status.toUpperCase()}
**Compliance Score**: ${compliance.compliance_score}%
**Issues Found**: ${compliance.issues}
**Recommendations**: ${compliance.recommendations}

---

## Generated RFP Response

${draft.draft}

---

## Compliance Review Details

${compliance.review}

---

## Metadata
- **Word Count**: ${draft.word_count}
- **Generated At**: ${draft.timestamp}
- **Compliance Review At**: ${compliance.timestamp}
`;

        // Upload to S3
        await s3Client.send(new PutObjectCommand({
            Bucket: BUCKET_RFP_DOCUMENTS,
            Key: responseKey,
            Body: responseContent,
            ContentType: 'text/markdown',
            Metadata: {
                document_id: documentId,
                compliance_status: compliance.status,
                compliance_score: compliance.compliance_score.toString(),
                generated_at: draft.timestamp,
                reviewed_at: compliance.timestamp
            }
        }));

        console.log('RFP response stored in S3:', responseKey);
        return responseKey;

    } catch (error) {
        console.error('Error storing RFP response in S3:', error);
        throw error;
    }
}

async function manageKnowledgeBase(httpMethod, body) {
    console.log('Managing knowledge base:', httpMethod);

    try {
        if (httpMethod === 'GET') {
            // List all knowledge base content
            const result = await docClient.send(new ScanCommand({
                TableName: TABLE_RFP_KNOWLEDGE_BASE
            }));

            return {
                statusCode: 200,
                body: JSON.stringify({
                    items: result.Items || [],
                    count: result.Items?.length || 0
                })
            };

        } else if (httpMethod === 'POST') {
            // Add new knowledge base content
            const data = JSON.parse(body || '{}');
            const contentId = data.content_id || uuidv4();
            const timestamp = new Date().toISOString();

            const knowledgeItem = {
                content_id: contentId,
                content_type: data.content_type || 'business_context',
                title: data.title || 'Knowledge Base Item',
                content_data: data.content_data || {},
                description: data.description || '',
                industry: data.industry || 'Healthcare',
                created_at: timestamp,
                updated_at: timestamp,
                created_by: data.created_by || 'system'
            };

            await docClient.send(new PutCommand({
                TableName: TABLE_RFP_KNOWLEDGE_BASE,
                Item: knowledgeItem
            }));

            return {
                statusCode: 200,
                body: JSON.stringify({
                    message: 'Knowledge base item added successfully',
                    content_id: contentId
                })
            };

        } else if (httpMethod === 'PUT') {
            // Update knowledge base content
            const data = JSON.parse(body || '{}');

            if (!data.content_id) {
                return {
                    statusCode: 400,
                    body: JSON.stringify({ error: 'content_id is required for updates' })
                };
            }

            await docClient.send(new PutCommand({
                TableName: TABLE_RFP_KNOWLEDGE_BASE,
                Item: {
                    content_id: data.content_id,
                    ...data,
                    updated_at: new Date().toISOString()
                }
            }));

            return {
                statusCode: 200,
                body: JSON.stringify({
                    message: 'Knowledge base item updated successfully',
                    content_id: data.content_id
                })
            };

        } else if (httpMethod === 'DELETE') {
            // Delete knowledge base content
            const data = JSON.parse(body || '{}');

            if (!data.content_id) {
                return {
                    statusCode: 400,
                    body: JSON.stringify({ error: 'content_id is required for deletion' })
                };
            }

            await docClient.send(new PutCommand({
                TableName: TABLE_RFP_KNOWLEDGE_BASE,
                Key: { content_id: data.content_id }
            }));

            return {
                statusCode: 200,
                body: JSON.stringify({
                    message: 'Knowledge base item deleted successfully',
                    content_id: data.content_id
                })
            };
        }

    } catch (error) {
        console.error('Error managing knowledge base:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({
                error: 'Failed to manage knowledge base',
                message: error.message
            })
        };
    }
}

async function extractTextFromS3(bucket, key) {
    console.log(`Extracting text from S3: ${bucket}/${key}`);

    try {
        // Use Textract to extract text from the document
        const response = await textractClient.send(new DetectDocumentTextCommand({
            Document: {
                S3Object: {
                    Bucket: bucket,
                    Name: key
                }
            }
        }));

        // Extract text blocks and combine them
        let extractedText = '';
        if (response.Blocks) {
            const textBlocks = response.Blocks
                .filter(block => block.BlockType === 'LINE')
                .map(block => block.Text)
                .filter(text => text);

            extractedText = textBlocks.join('\n');
        }

        console.log(`Extracted ${extractedText.length} characters from document`);
        return extractedText;

    } catch (error) {
        console.error('Error extracting text with Textract:', error);

        // Fallback: try to read as plain text if Textract fails
        try {
            const response = await s3Client.send(new GetObjectCommand({
                Bucket: bucket,
                Key: key
            }));

            const content = await response.Body.transformToString();
            return content;
        } catch (fallbackError) {
            console.error('Fallback text extraction also failed:', fallbackError);
            throw new Error('Failed to extract text from document');
        }
    }
}

async function uploadDocument(data) {
    console.log('Uploading document:', data);

    const documentId = uuidv4();
    const timestamp = new Date().toISOString();

    // Create S3 key for file storage
    const fileExtension = data.file_name ? data.file_name.split('.').pop() : 'txt';
    const s3Key = `documents/${documentId}/original.${fileExtension}`;

    // Generate presigned URL for file upload
    const presignedUrl = await getSignedUrl(s3Client, new PutObjectCommand({
        Bucket: S3_DOCUMENTS_BUCKET,
        Key: s3Key,
        ContentType: data.content_type || 'application/octet-stream',
    }), { expiresIn: 3600 }); // 1 hour expiry

    // Store document metadata in DynamoDB
    const documentRecord = {
        document_id: documentId,
        client_name: data.client_name || 'Unknown Client',
        region: data.region || 'Unknown Region',
        industry: data.industry || 'Healthcare',
        status: 'pending_upload',
        created_at: timestamp,
        updated_at: timestamp,
        file_type: data.file_type || 'document',
        file_name: data.file_name || 'document',
        content_type: data.content_type || 'application/octet-stream',
        file_size: data.file_size || 0,
        s3_key: s3Key,
        s3_bucket: S3_DOCUMENTS_BUCKET,
        content: data.content || '', // Optional text content
    };

    await docClient.send(new PutCommand({
        TableName: TABLE_RFP_DOCUMENTS,
        Item: documentRecord
    }));

    // Log the action
    await logAction(documentId, 'document_upload_initiated', 'Document upload initiated with presigned URL', {
        document_id: documentId,
        s3_key: s3Key,
        file_name: data.file_name
    });

    return {
        statusCode: 200,
        body: JSON.stringify({
            message: 'Document upload initiated successfully',
            document_id: documentId,
            status: 'pending_upload',
            upload_url: presignedUrl,
            expires_in: 3600,
            s3_key: s3Key
        })
    };
}

async function completeUpload(data) {
    console.log('Completing file upload:', data);

    const { document_id } = data;

    if (!document_id) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: 'document_id is required' })
        };
    }

    try {
        // Get document record from DynamoDB
        const documentResult = await docClient.send(new GetCommand({
            TableName: TABLE_RFP_DOCUMENTS,
            Key: { document_id: document_id }
        }));

        if (!documentResult.Item) {
            return {
                statusCode: 404,
                body: JSON.stringify({ error: 'Document not found' })
            };
        }

        const document = documentResult.Item;

        // Extract text from uploaded file using Textract
        let extractedText = '';
        if (document.s3_key) {
            try {
                extractedText = await extractTextFromS3(document.s3_bucket, document.s3_key);
            } catch (error) {
                console.error('Error extracting text:', error);
                extractedText = 'Error extracting text from document';
            }
        }

        // Update document record with extracted text and status
        const updatedRecord = {
            ...document,
            status: 'uploaded',
            content: extractedText || document.content,
            updated_at: new Date().toISOString(),
            text_extraction_completed: true
        };

        await docClient.send(new PutCommand({
            TableName: TABLE_RFP_DOCUMENTS,
            Item: updatedRecord
        }));

        // Log the action
        await logAction(document_id, 'document_upload_completed', 'File upload completed and text extracted', {
            document_id: document_id,
            text_length: extractedText.length,
            s3_key: document.s3_key
        });

        return {
            statusCode: 200,
            body: JSON.stringify({
                message: 'File upload completed successfully',
                document_id: document_id,
                status: 'uploaded',
                content: extractedText,
                text_length: extractedText.length
            })
        };

    } catch (error) {
        console.error('Error completing upload:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({
                error: 'Failed to complete upload',
                message: error.message
            })
        };
    }
}

async function processDocument(data) {
    console.log('Processing document:', data);

    const processId = uuidv4();
    const documentId = data.document_id;
    const timestamp = new Date().toISOString();

    // Get document from database
    const documentResult = await docClient.send(new GetCommand({
        TableName: TABLE_RFP_DOCUMENTS,
        Key: { document_id: documentId }
    }));

    if (!documentResult.Item) {
        throw new Error('Document not found');
    }

    const document = documentResult.Item;

    // Create process record
    const processRecord = {
        process_id: processId,
        document_id: documentId,
        status: 'processing',
        created_at: timestamp,
        updated_at: timestamp,
        steps: {
            ingestion: { status: 'completed', timestamp },
            decision: { status: 'in_progress', timestamp },
            generation: { status: 'pending', timestamp: null },
            compliance: { status: 'pending', timestamp: null }
        }
    };

    await docClient.send(new PutCommand({
        TableName: TABLE_RFP_PROCESSES,
        Item: processRecord
    }));

    // Start processing steps
    try {
        // Step 1: Make bid decision
        const decision = await makeBidDecision(document);

        // Update process with decision
        processRecord.steps.decision = {
            status: 'completed',
            timestamp: new Date().toISOString(),
            result: decision
        };
        processRecord.status = 'decision_completed';

        await docClient.send(new PutCommand({
            TableName: TABLE_RFP_PROCESSES,
            Item: processRecord
        }));

        await logAction(processId, 'decision_completed', 'Bid decision completed', decision);

        // If decision is BID, continue with draft generation
        if (decision.decision === 'BID') {
            processRecord.steps.generation = { status: 'in_progress', timestamp: new Date().toISOString() };

            const draft = await generateDraft(document, decision);

            processRecord.steps.generation = {
                status: 'completed',
                timestamp: new Date().toISOString(),
                result: draft
            };
            processRecord.steps.compliance = { status: 'in_progress', timestamp: new Date().toISOString() };

            const compliance = await reviewCompliance(draft, document);

            // Store the final RFP response in S3
            const s3ResponseKey = await storeRfpResponseInS3(document.document_id, draft, compliance);

            processRecord.steps.compliance = {
                status: 'completed',
                timestamp: new Date().toISOString(),
                result: compliance
            };
            processRecord.s3_response_key = s3ResponseKey;
            processRecord.status = 'completed';

            await docClient.send(new PutCommand({
                TableName: TABLE_RFP_PROCESSES,
                Item: processRecord
            }));

            await logAction(processId, 'processing_completed', 'All processing steps completed', { draft, compliance });
        } else {
            processRecord.status = 'completed';
            await docClient.send(new PutCommand({
                TableName: TABLE_RFP_PROCESSES,
                Item: processRecord
            }));
        }

        return {
            statusCode: 200,
            body: JSON.stringify({
                message: 'Processing started successfully',
                process_id: processId,
                status: 'processing'
            })
        };

    } catch (error) {
        console.error('Error in processing:', error);

        // Update process with error
        processRecord.status = 'failed';
        processRecord.error = error.message;
        processRecord.updated_at = new Date().toISOString();

        await docClient.send(new PutCommand({
            TableName: TABLE_RFP_PROCESSES,
            Item: processRecord
        }));

        await logAction(processId, 'processing_failed', 'Processing failed', { error: error.message });

        throw error;
    }
}

async function makeBidDecision(document) {
    console.log('Making bid decision for document:', document.document_id);

    // Get business context from knowledge base
    const businessContext = await getBusinessContext();

    const prompt = `Analyze this RFP and recommend bid or no-bid using the provided business context:

CLIENT RFP:
Client: ${document.client_name}
Region: ${document.region}
Industry: ${document.industry}
Content: ${document.content.substring(0, 2000)}...

OUR BUSINESS CONTEXT:
Service Regions: ${businessContext.serviceRegions.join(', ')}
Current Capacity: ${businessContext.currentCapacity}
Healthcare Experience: ${businessContext.healthcareExperience}
Typical Timeline: ${businessContext.typicalTimeline}
Minimum Project Size: ${businessContext.minimumProjectSize}
Current Workload: ${businessContext.currentWorkload}
Specialties: ${businessContext.specialties.join(', ')}
Team Size: ${businessContext.teamSize}
Certifications: ${businessContext.certifications.join(', ')}

DECISION CRITERIA:
1. Regional Coverage: Can we serve this region based on our service regions?
2. Capacity: Do we have availability based on current workload and capacity?
3. Expertise: Do we have relevant healthcare experience and certifications?
4. Timeline: Is the project timeline realistic given our typical timelines?
5. Profitability: Does this meet our minimum project size requirements?

Make your decision based on the ACTUAL business data provided above.
Respond with: BID or NO_BID and brief reasoning citing specific business context factors.`;

    try {
        const response = await bedrockClient.send(new InvokeModelCommand({
            modelId: 'anthropic.claude-instant-v1',
            body: JSON.stringify({
                prompt: prompt,
                max_tokens_to_sample: 300,
                temperature: 0.1
            })
        }));

        const result = JSON.parse(new TextDecoder().decode(response.body));
        const decision = result.completion;

        return {
            decision: decision.includes('BID') ? 'BID' : 'NO_BID',
            reasoning: decision,
            confidence: 0.8, // Simple confidence for learning
            timestamp: new Date().toISOString()
        };
    } catch (error) {
        console.error('Error making bid decision:', error);
        // Fallback to simple rule-based decision
        return {
            decision: document.region === 'North America' ? 'BID' : 'NO_BID',
            reasoning: `Rule-based decision: ${document.region === 'North America' ? 'Serving North America region' : 'Not serving this region'}`,
            confidence: 0.6,
            timestamp: new Date().toISOString()
        };
    }
}

async function generateDraft(document, decision) {
    console.log('Generating draft for document:', document.document_id);

    // Get business context and templates from knowledge base
    const businessContext = await getBusinessContext();
    const templates = await getResponseTemplates();

    const prompt = `Generate a professional RFP response draft using the provided business context and templates:

CLIENT RFP:
Client: ${document.client_name}
Region: ${document.region}
Industry: ${document.industry}
Requirements: ${document.content.substring(0, 3000)}...

OUR BUSINESS CONTEXT:
Service Regions: ${businessContext.serviceRegions.join(', ')}
Healthcare Experience: ${businessContext.healthcareExperience}
Team Size: ${businessContext.teamSize}
Specialties: ${businessContext.specialties.join(', ')}
Certifications: ${businessContext.certifications.join(', ')}
Typical Timeline: ${businessContext.typicalTimeline}

RESPONSE TEMPLATES:
${templates}

DECISION REASONING:
${decision.reasoning}

REQUIRED SECTIONS:
1. Executive Summary - Highlight our healthcare expertise and relevant experience
2. Company Overview - Emphasize our ${businessContext.specialties.join(', ')} capabilities
3. Proposed Solution - Tailor to specific requirements using our expertise
4. Timeline and Milestones - Based on our typical ${businessContext.typicalTimeline} timeline
5. Pricing Structure - Professional and competitive based on project scope
6. Team Qualifications - Highlight ${businessContext.teamSize} and ${businessContext.certifications.join(', ')}
7. References and Case Studies - Include relevant healthcare implementations

Use the business context data to personalize the response. Make it specific to our actual capabilities and experience.
Keep it professional, concise, and healthcare-focused.`;

    try {
        const response = await bedrockClient.send(new InvokeModelCommand({
            modelId: 'anthropic.claude-instant-v1',
            body: JSON.stringify({
                prompt: prompt,
                max_tokens_to_sample: 2000,
                temperature: 0.3
            })
        }));

        const result = JSON.parse(new TextDecoder().decode(response.body));

        return {
            draft: result.completion,
            timestamp: new Date().toISOString(),
            word_count: result.completion.split(' ').length
        };
    } catch (error) {
        console.error('Error generating draft:', error);
        return {
            draft: 'Error generating draft. Please try again.',
            timestamp: new Date().toISOString(),
            error: error.message
        };
    }
}

async function reviewCompliance(draft, document) {
    console.log('Reviewing compliance for draft');

    // Get compliance rules and business context from knowledge base
    const complianceRules = await getComplianceRules();
    const businessContext = await getBusinessContext();

    const prompt = `Review this RFP response for compliance issues using the provided rules and context:

RFP RESPONSE TO REVIEW:
${draft.draft}

CLIENT CONTEXT:
Client: ${document.client_name}
Region: ${document.region}
Industry: ${document.industry}

COMPLIANCE RULES:
${complianceRules}

BUSINESS CONTEXT:
Service Regions: ${businessContext.serviceRegions.join(', ')}
Certifications: ${businessContext.certifications.join(', ')}
Specialties: ${businessContext.specialties.join(', ')}
Team Size: ${businessContext.teamSize}

COMPLIANCE CHECKLIST:
1. **Healthcare Compliance**: HIPAA, FDA, and industry regulations mentioned
2. **Professional Standards**: Healthcare terminology and professional tone
3. **Certification Claims**: Only claim certifications we actually have
4. **Regional Coverage**: Only promise services in regions we serve
5. **Timeline Realism**: Timeline aligns with our typical ${businessContext.typicalTimeline} timeline
6. **Pricing Consistency**: Pricing aligns with our minimum ${businessContext.minimumProjectSize} threshold
7. **Section Completeness**: All required sections present and complete
8. **Technical Accuracy**: Healthcare IT terminology used correctly
9. **Regulatory Compliance**: Mentions relevant healthcare regulations
10. **Risk Management**: Addresses potential risks and mitigation

Provide a detailed compliance review with:
- ✅ PASS or ❌ FAIL for each checklist item
- Specific issues found with line references
- Recommendations for improvement
- Overall compliance status

Format your response as:
STATUS: [COMPLIANT/NEEDS_REVIEW/FAILED]
ISSUES: [List specific issues or "None"]
RECOMMENDATIONS: [Specific improvement suggestions or "None"]`;

    try {
        const response = await bedrockClient.send(new InvokeModelCommand({
            modelId: 'anthropic.claude-instant-v1',
            body: JSON.stringify({
                prompt: prompt,
                max_tokens_to_sample: 1000,
                temperature: 0.1
            })
        }));

        const result = JSON.parse(new TextDecoder().decode(response.body));
        const review = result.completion;

        // Parse the structured response
        const statusMatch = review.match(/STATUS:\s*(\w+)/i);
        const issuesMatch = review.match(/ISSUES:\s*([^]*?)(?=RECOMMENDATIONS:|$)/s);
        const recommendationsMatch = review.match(/RECOMMENDATIONS:\s*([^]*?)$/s);

        const status = statusMatch ? statusMatch[1].toLowerCase() : 'needs_review';
        const issues = issuesMatch ? issuesMatch[1].trim() : 'Unable to parse issues';
        const recommendations = recommendationsMatch ? recommendationsMatch[1].trim() : 'Unable to parse recommendations';

        return {
            review: review,
            status: status,
            issues: issues,
            recommendations: recommendations,
            timestamp: new Date().toISOString(),
            compliance_score: calculateComplianceScore(review)
        };
    } catch (error) {
        console.error('Error reviewing compliance:', error);
        return {
            review: 'Error reviewing compliance. Please check manually.',
            status: 'error',
            issues: 'System error during compliance review',
            recommendations: 'Manual review required',
            timestamp: new Date().toISOString(),
            error: error.message,
            compliance_score: 0
        };
    }
}

async function downloadRfpResponse(processId) {
    console.log('Downloading RFP response for process:', processId);

    try {
        // Get process record to find S3 key
        const processResult = await docClient.send(new GetCommand({
            TableName: TABLE_RFP_PROCESSES,
            Key: { process_id: processId }
        }));

        if (!processResult.Item) {
            return {
                statusCode: 404,
                body: JSON.stringify({ error: 'Process not found' })
            };
        }

        const s3ResponseKey = processResult.Item.s3_response_key;
        if (!s3ResponseKey) {
            return {
                statusCode: 404,
                body: JSON.stringify({ error: 'RFP response not found. Process may not be completed yet.' })
            };
        }

        // Generate presigned URL for S3 download
        const downloadUrl = await getSignedUrl(s3Client, new GetObjectCommand({
            Bucket: BUCKET_RFP_DOCUMENTS,
            Key: s3ResponseKey
        }), { expiresIn: 3600 }); // 1 hour expiry

        return {
            statusCode: 200,
            body: JSON.stringify({
                download_url: downloadUrl,
                s3_key: s3ResponseKey,
                process_id: processId,
                expires_in: 3600
            })
        };

    } catch (error) {
        console.error('Error downloading RFP response:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Failed to generate download URL' })
        };
    }
}

async function getProcessStatus(processId) {
    console.log('Getting process status for:', processId);

    const result = await docClient.send(new GetCommand({
        TableName: TABLE_RFP_PROCESSES,
        Key: { process_id: processId }
    }));

    if (!result.Item) {
        return {
            statusCode: 404,
            body: JSON.stringify({ error: 'Process not found' })
        };
    }

    return {
        statusCode: 200,
        body: JSON.stringify(result.Item)
    };
}

async function getProcessResult(processId) {
    console.log('Getting process result for:', processId);

    const result = await docClient.send(new GetCommand({
        TableName: TABLE_RFP_PROCESSES,
        Key: { process_id: processId }
    }));

    if (!result.Item) {
        return {
            statusCode: 404,
            body: JSON.stringify({ error: 'Process not found' })
        };
    }

    return {
        statusCode: 200,
        body: JSON.stringify({
            process_id: processId,
            status: result.Item.status,
            steps: result.Item.steps,
            created_at: result.Item.created_at,
            updated_at: result.Item.updated_at
        })
    };
}

async function getBidDecision(processId) {
    const result = await getProcessResult(processId);

    if (result.statusCode !== 200) {
        return result;
    }

    const processData = JSON.parse(result.body);
    const decision = processData.steps?.decision?.result;

    if (!decision) {
        return {
            statusCode: 404,
            body: JSON.stringify({ error: 'Decision not found' })
        };
    }

    return {
        statusCode: 200,
        body: JSON.stringify(decision)
    };
}

async function getGeneratedDraft(processId) {
    const result = await getProcessResult(processId);

    if (result.statusCode !== 200) {
        return result;
    }

    const processData = JSON.parse(result.body);
    const draft = processData.steps?.generation?.result;

    if (!draft) {
        return {
            statusCode: 404,
            body: JSON.stringify({ error: 'Draft not found' })
        };
    }

    return {
        statusCode: 200,
        body: JSON.stringify(draft)
    };
}

async function getComplianceReview(processId) {
    const result = await getProcessResult(processId);

    if (result.statusCode !== 200) {
        return result;
    }

    const processData = JSON.parse(result.body);
    const compliance = processData.steps?.compliance?.result;

    if (!compliance) {
        return {
            statusCode: 404,
            body: JSON.stringify({ error: 'Compliance review not found' })
        };
    }

    return {
        statusCode: 200,
        body: JSON.stringify(compliance)
    };
}

async function healthCheck() {
    return {
        statusCode: 200,
        body: JSON.stringify({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            service: 'healthcare-uc-rfp-processor',
            version: '1.0.0'
        })
    };
}

async function logAction(processId, actionType, description, data) {
    const logId = uuidv4();
    const timestamp = new Date().toISOString();

    const logRecord = {
        log_id: logId,
        process_id: processId,
        action_type: actionType,
        description: description,
        data: data,
        timestamp: timestamp,
        expires_at: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60) // 30 days TTL
    };

    try {
        await docClient.send(new PutCommand({
            TableName: TABLE_RFP_AUDIT_LOGS,
            Item: logRecord
        }));
        console.log('Action logged:', actionType);
    } catch (error) {
        console.error('Error logging action:', error);
    }
}
