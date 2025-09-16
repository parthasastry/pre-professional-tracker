import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as cognito from 'aws-cdk-lib/aws-cognito';

export interface RfpApiGatewayConstructProps {
    rfpProcessorLambda: lambda.Function;
    userPool: cognito.UserPool;
}

export class RfpApiGatewayConstruct extends Construct {
    public readonly api: apigateway.RestApi;

    constructor(scope: Construct, id: string, props: RfpApiGatewayConstructProps) {
        super(scope, id);

        // API Gateway for RFP processing
        this.api = new apigateway.RestApi(this, 'RfpApi', {
            restApiName: 'Healthcare UC RFP Generation API',
            description: 'API for Agentic RFP Generation System - Document processing, AI analysis, and proposal generation',
            defaultCorsPreflightOptions: {
                allowOrigins: [
                    'http://localhost:5173', // Vite dev server
                    'http://localhost:3000', // Fallback for other dev servers
                    'https://*.amplifyapp.com', // AWS Amplify production
                    'https://*.vercel.app', // Vercel production
                ],
                allowMethods: apigateway.Cors.ALL_METHODS,
                allowHeaders: [
                    'Content-Type',
                    'X-Amz-Date',
                    'Authorization',
                    'X-Api-Key',
                    'X-Amz-Security-Token',
                ],
            },
            deployOptions: {
                stageName: 'prod',
                throttlingRateLimit: 100, // Lower rate limit for learning
                throttlingBurstLimit: 200,
            },
        });

        // Cognito Authorizer
        const cognitoAuthorizer = new apigateway.CognitoUserPoolsAuthorizer(this, 'CognitoAuthorizer', {
            cognitoUserPools: [props.userPool],
            authorizerName: 'CognitoAuthorizer',
            identitySource: 'method.request.header.Authorization',
        });

        // Lambda Integration
        const rfpProcessorIntegration = new apigateway.LambdaIntegration(props.rfpProcessorLambda, {
            requestTemplates: { 'application/json': '{ "statusCode": "200" }' },
        });

        // Helper function to add methods with authorization
        const addAuthorizedMethod = (resource: apigateway.Resource, method: string, integration: apigateway.LambdaIntegration) => {
            resource.addMethod(method, integration, {
                authorizer: cognitoAuthorizer
            });
        };

        // RFP Upload API - Upload and start processing (requires auth)
        const rfpUploadApi = this.api.root.addResource('rfp');
        addAuthorizedMethod(rfpUploadApi, 'POST', rfpProcessorIntegration);

        // RFP Complete Upload API - Complete file upload and extract text (requires auth)
        const rfpCompleteUploadApi = rfpUploadApi.addResource('complete-upload');
        addAuthorizedMethod(rfpCompleteUploadApi, 'POST', rfpProcessorIntegration);

        // RFP Processing API - Process uploaded document (requires auth)
        const rfpProcessApi = rfpUploadApi.addResource('process');
        addAuthorizedMethod(rfpProcessApi, 'POST', rfpProcessorIntegration);

        // RFP Status API - Check processing status (requires auth)
        const rfpStatusApi = rfpUploadApi.addResource('status').addResource('{process_id}');
        addAuthorizedMethod(rfpStatusApi, 'GET', rfpProcessorIntegration);

        // RFP Result API - Get processing results (requires auth)
        const rfpResultApi = rfpUploadApi.addResource('result').addResource('{process_id}');
        addAuthorizedMethod(rfpResultApi, 'GET', rfpProcessorIntegration);

        // RFP Decision API - Get bid/no-bid decision (requires auth)
        const rfpDecisionApi = rfpUploadApi.addResource('decision').addResource('{process_id}');
        addAuthorizedMethod(rfpDecisionApi, 'GET', rfpProcessorIntegration);

        // RFP Draft API - Get generated draft (requires auth)
        const rfpDraftApi = rfpUploadApi.addResource('draft').addResource('{process_id}');
        addAuthorizedMethod(rfpDraftApi, 'GET', rfpProcessorIntegration);

        // RFP Compliance API - Get compliance review (requires auth)
        const rfpComplianceApi = rfpUploadApi.addResource('compliance').addResource('{process_id}');
        addAuthorizedMethod(rfpComplianceApi, 'GET', rfpProcessorIntegration);

        // RFP Download Response API - Download final response file (requires auth)
        const rfpDownloadApi = rfpUploadApi.addResource('download').addResource('{process_id}');
        addAuthorizedMethod(rfpDownloadApi, 'GET', rfpProcessorIntegration);

        // Knowledge Base API - Manage templates and past proposals (requires auth)
        const knowledgeBaseApi = this.api.root.addResource('knowledge-base');
        addAuthorizedMethod(knowledgeBaseApi, 'GET', rfpProcessorIntegration);
        addAuthorizedMethod(knowledgeBaseApi, 'POST', rfpProcessorIntegration);

        const knowledgeBaseItemApi = knowledgeBaseApi.addResource('{content_id}');
        addAuthorizedMethod(knowledgeBaseItemApi, 'GET', rfpProcessorIntegration);
        addAuthorizedMethod(knowledgeBaseItemApi, 'PUT', rfpProcessorIntegration);
        addAuthorizedMethod(knowledgeBaseItemApi, 'DELETE', rfpProcessorIntegration);

        // Audit Logs API - View processing history (requires auth)
        const auditLogsApi = this.api.root.addResource('audit-logs');
        addAuthorizedMethod(auditLogsApi, 'GET', rfpProcessorIntegration);

        const auditLogsProcessApi = auditLogsApi.addResource('{process_id}');
        addAuthorizedMethod(auditLogsProcessApi, 'GET', rfpProcessorIntegration);

        // Health Check API
        const healthApi = this.api.root.addResource('health');
        healthApi.addMethod('GET', new apigateway.MockIntegration({
            integrationResponses: [{
                statusCode: '200',
                responseTemplates: {
                    'application/json': JSON.stringify({
                        status: 'healthy',
                        timestamp: new Date().toISOString(),
                        service: 'healthcare-uc-rfp-generation-api',
                        version: '1.0.0',
                    }),
                },
            }],
            requestTemplates: {
                'application/json': '{"statusCode": 200}',
            },
        }), {
            methodResponses: [{ statusCode: '200' }],
        });

        // Outputs
        new cdk.CfnOutput(this, 'RfpApiGatewayUrl', {
            value: this.api.url,
            description: 'RFP API Gateway URL',
        });

        new cdk.CfnOutput(this, 'RfpApiGatewayId', {
            value: this.api.restApiId,
            description: 'RFP API Gateway ID',
        });
    }
}
