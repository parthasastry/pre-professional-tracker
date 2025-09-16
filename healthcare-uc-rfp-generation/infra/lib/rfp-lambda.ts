import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as path from 'path';

export interface RfpLambdaConstructProps {
    rfpDocumentsTable: dynamodb.Table;
    rfpProcessesTable: dynamodb.Table;
    rfpKnowledgeBaseTable: dynamodb.Table;
    rfpAuditLogsTable: dynamodb.Table;
    usersTable: dynamodb.Table;
    documentsBucket: s3.Bucket;
}

export class RfpLambdaConstruct extends Construct {
    public readonly rfpProcessorLambda: lambda.Function;
    public readonly postConfirmationLambda: lambda.Function;

    constructor(scope: Construct, id: string, props: RfpLambdaConstructProps) {
        super(scope, id);

        // RFP Processor Lambda - Single function handling all RFP processing
        this.rfpProcessorLambda = new lambda.Function(this, 'RfpProcessorLambda', {
            functionName: 'healthcare-uc-rfp-processor',
            description: 'Single Lambda function for RFP document ingestion, decision support, draft generation, and compliance review',
            runtime: lambda.Runtime.NODEJS_18_X,
            handler: 'index.handler',
            timeout: cdk.Duration.minutes(5), // Longer timeout for AI processing
            memorySize: 1024, // More memory for AI operations
            environment: {
                TABLE_RFP_DOCUMENTS: props.rfpDocumentsTable.tableName,
                TABLE_RFP_PROCESSES: props.rfpProcessesTable.tableName,
                TABLE_RFP_KNOWLEDGE_BASE: props.rfpKnowledgeBaseTable.tableName,
                TABLE_RFP_AUDIT_LOGS: props.rfpAuditLogsTable.tableName,
                TABLE_RFP_USERS: props.usersTable.tableName,
                S3_DOCUMENTS_BUCKET: props.documentsBucket.bucketName,
                REGION: cdk.Stack.of(this).region,
                AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1',
            },
            code: lambda.Code.fromAsset(path.join(__dirname, '../../backend/lambda/rfp-processor')),
        });

        // Post Confirmation Lambda - Cognito trigger for user creation
        this.postConfirmationLambda = new lambda.Function(this, 'PostConfirmationLambda', {
            functionName: 'healthcare-uc-rfp-post-confirmation',
            description: 'Cognito Post Confirmation trigger for user creation',
            runtime: lambda.Runtime.NODEJS_18_X,
            handler: 'index.handler',
            timeout: cdk.Duration.seconds(30),
            memorySize: 256,
            environment: {
                TABLE_USERS: props.usersTable.tableName,
                REGION: cdk.Stack.of(this).region,
                AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1',
            },
            code: lambda.Code.fromAsset(path.join(__dirname, '../../backend/lambda/cognito-triggers/post-confirmation')),
        });

        // DynamoDB permissions
        const dynamoDbPolicy = new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
                'dynamodb:GetItem',
                'dynamodb:PutItem',
                'dynamodb:UpdateItem',
                'dynamodb:DeleteItem',
                'dynamodb:Query',
                'dynamodb:Scan',
                'dynamodb:BatchGetItem',
                'dynamodb:BatchWriteItem',
            ],
            resources: [
                props.rfpDocumentsTable.tableArn,
                props.rfpProcessesTable.tableArn,
                props.rfpKnowledgeBaseTable.tableArn,
                props.rfpAuditLogsTable.tableArn,
                props.usersTable.tableArn,
                `${props.rfpDocumentsTable.tableArn}/index/*`,
                `${props.rfpProcessesTable.tableArn}/index/*`,
                `${props.rfpKnowledgeBaseTable.tableArn}/index/*`,
                `${props.rfpAuditLogsTable.tableArn}/index/*`,
                `${props.usersTable.tableArn}/index/*`,
            ],
        });

        // S3 permissions
        const s3Policy = new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
                's3:GetObject',
                's3:PutObject',
                's3:DeleteObject',
                's3:ListBucket',
            ],
            resources: [
                props.documentsBucket.bucketArn,
                `${props.documentsBucket.bucketArn}/*`,
            ],
        });

        // Bedrock permissions for AI processing
        const bedrockPolicy = new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
                'bedrock:InvokeModel',
                'bedrock:InvokeModelWithResponseStream',
            ],
            resources: [
                'arn:aws:bedrock:*::foundation-model/anthropic.claude-instant-v1',
                'arn:aws:bedrock:*::foundation-model/anthropic.claude-v2',
                'arn:aws:bedrock:*::foundation-model/amazon.titan-text-express-v1',
            ],
        });

        // Textract permissions for document processing
        const textractPolicy = new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
                'textract:DetectDocumentText',
                'textract:AnalyzeDocument',
                'textract:StartDocumentAnalysis',
                'textract:GetDocumentAnalysis',
            ],
            resources: ['*'],
        });

        // Apply all policies to the Lambda functions
        this.rfpProcessorLambda.addToRolePolicy(dynamoDbPolicy);
        this.rfpProcessorLambda.addToRolePolicy(s3Policy);
        this.rfpProcessorLambda.addToRolePolicy(bedrockPolicy);
        this.rfpProcessorLambda.addToRolePolicy(textractPolicy);

        // Apply DynamoDB policy to post confirmation Lambda
        this.postConfirmationLambda.addToRolePolicy(dynamoDbPolicy);
    }
}
