import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

export class RfpDatabaseConstruct extends Construct {
    // Core RFP tables
    public readonly rfpDocumentsTable: dynamodb.Table;
    public readonly rfpProcessesTable: dynamodb.Table;
    public readonly rfpKnowledgeBaseTable: dynamodb.Table;
    public readonly rfpAuditLogsTable: dynamodb.Table;
    public readonly usersTable: dynamodb.Table;

    constructor(scope: Construct, id: string) {
        super(scope, id);

        // RFP Documents Table - Raw RFP documents and metadata
        this.rfpDocumentsTable = new dynamodb.Table(this, 'RfpDocumentsTable', {
            tableName: process.env.TABLE_RFP_DOCUMENTS || 'healthcare-uc-rfp-documents',
            partitionKey: { name: 'document_id', type: dynamodb.AttributeType.STRING },
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
            pointInTimeRecovery: true,
        });

        // RFP Processes Table - Processing status and results
        this.rfpProcessesTable = new dynamodb.Table(this, 'RfpProcessesTable', {
            tableName: process.env.TABLE_RFP_PROCESSES || 'healthcare-uc-rfp-processes',
            partitionKey: { name: 'process_id', type: dynamodb.AttributeType.STRING },
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
            pointInTimeRecovery: true,
        });


        // RFP Knowledge Base Table - Templates and past proposals
        this.rfpKnowledgeBaseTable = new dynamodb.Table(this, 'RfpKnowledgeBaseTable', {
            tableName: process.env.TABLE_RFP_KNOWLEDGE_BASE || 'healthcare-uc-rfp-knowledge-base',
            partitionKey: { name: 'content_id', type: dynamodb.AttributeType.STRING },
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
            pointInTimeRecovery: true,
        });

        // RFP Audit Logs Table - Processing history and decisions
        this.rfpAuditLogsTable = new dynamodb.Table(this, 'RfpAuditLogsTable', {
            tableName: process.env.TABLE_RFP_AUDIT_LOGS || 'healthcare-uc-rfp-audit-logs',
            partitionKey: { name: 'log_id', type: dynamodb.AttributeType.STRING },
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
            timeToLiveAttribute: 'expires_at',
        });

        // Users Table - User management and authentication
        this.usersTable = new dynamodb.Table(this, 'UsersTable', {
            tableName: process.env.TABLE_RFP_USERS || 'healthcare-uc-rfp-users',
            partitionKey: { name: 'user_id', type: dynamodb.AttributeType.STRING },
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
            pointInTimeRecovery: true,
        });
    }
}
