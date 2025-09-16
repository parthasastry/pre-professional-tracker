import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { RfpDatabaseConstruct } from './rfp-dynamodb';
import { RfpLambdaConstruct } from './rfp-lambda';
import { RfpApiGatewayConstruct } from './rfp-apigateway';
import { CognitoConstruct } from './cognito-stack';
import { S3Construct } from './s3-stack';

export class HealthcareUcRfpGenerationStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        // Create all constructs
        const database = new RfpDatabaseConstruct(this, 'RfpDatabaseConstruct');
        const s3 = new S3Construct(this, 'S3Construct');

        const lambdas = new RfpLambdaConstruct(this, 'RfpLambdas', {
            rfpDocumentsTable: database.rfpDocumentsTable,
            rfpProcessesTable: database.rfpProcessesTable,
            rfpKnowledgeBaseTable: database.rfpKnowledgeBaseTable,
            rfpAuditLogsTable: database.rfpAuditLogsTable,
            usersTable: database.usersTable,
            documentsBucket: s3.documentsBucket,
        });

        const cognito = new CognitoConstruct(this, 'CognitoConstruct', {
            postConfirmationLambda: lambdas.postConfirmationLambda,
        });

        new RfpApiGatewayConstruct(this, 'RfpApiGateway', {
            rfpProcessorLambda: lambdas.rfpProcessorLambda,
            userPool: cognito.userPool,
        });

        // Outputs
        new cdk.CfnOutput(this, 'StackName', {
            value: this.stackName,
            description: 'Stack Name',
        });

        new cdk.CfnOutput(this, 'Region', {
            value: this.region,
            description: 'AWS Region',
        });

        new cdk.CfnOutput(this, 'Account', {
            value: this.account,
            description: 'AWS Account',
        });
    }
}
