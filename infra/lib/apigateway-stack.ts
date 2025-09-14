import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as lambda from 'aws-cdk-lib/aws-lambda';

export interface ApiGatewayConstructProps {
    userPool: cognito.UserPool;
    universitiesCRUDLambda: lambda.Function;
    usersCRUDLambda: lambda.Function;
    experiencesCRUDLambda: lambda.Function;
    coursesCRUDLambda: lambda.Function;
    checklistCRUDLambda: lambda.Function;
    dashboardLambda: lambda.Function;
    gpaCalculatorLambda: lambda.Function;
    pdfGeneratorLambda: lambda.Function;
    analyticsLambda: lambda.Function;
    notificationsLambda: lambda.Function;
    universitySettingsLambda: lambda.Function;
    advisorsLambda: lambda.Function;
    announcementsLambda: lambda.Function;
    stripeSubscriptionLambda: lambda.Function;
    stripeWebhookLambda: lambda.Function;
}

export class ApiGatewayConstruct extends Construct {
    public readonly api: apigateway.RestApi;

    constructor(scope: Construct, id: string, props: ApiGatewayConstructProps) {
        super(scope, id);

        // API Gateway
        this.api = new apigateway.RestApi(this, 'PreProfessionalTrackerApi', {
            restApiName: 'Pre-Professional Tracker API',
            description: 'API for Pre-Professional Tracker - University-centric student tracking platform',
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
                throttlingRateLimit: 1000,
                throttlingBurstLimit: 2000,
            },
        });

        // Cognito Authorizer
        const cognitoAuthorizer = new apigateway.CognitoUserPoolsAuthorizer(this, 'CognitoAuthorizer', {
            cognitoUserPools: [props.userPool],
            authorizerName: 'CognitoAuthorizer',
            identitySource: 'method.request.header.Authorization',
        });

        // Common Lambda Integration
        const createLambdaIntegration = (lambdaFunction: lambda.Function) =>
            new apigateway.LambdaIntegration(lambdaFunction, {
                requestTemplates: { 'application/json': '{ "statusCode": "200" }' },
            });

        // Helper function to add methods with authorization
        const addAuthorizedMethod = (resource: apigateway.Resource, method: string, integration: apigateway.LambdaIntegration) => {
            resource.addMethod(method, integration, {
                authorizer: cognitoAuthorizer
            });
        };

        // Universities API
        const universitiesApi = this.api.root.addResource('universities');
        // GET universities list should be public (needed for signup)
        universitiesApi.addMethod('GET', createLambdaIntegration(props.universitiesCRUDLambda));
        addAuthorizedMethod(universitiesApi, 'POST', createLambdaIntegration(props.universitiesCRUDLambda));

        const universityApi = universitiesApi.addResource('{university_id}');
        addAuthorizedMethod(universityApi, 'GET', createLambdaIntegration(props.universitiesCRUDLambda));
        addAuthorizedMethod(universityApi, 'PUT', createLambdaIntegration(props.universitiesCRUDLambda));
        addAuthorizedMethod(universityApi, 'DELETE', createLambdaIntegration(props.universitiesCRUDLambda));

        // Users API
        const usersApi = this.api.root.addResource('users');
        addAuthorizedMethod(usersApi, 'GET', createLambdaIntegration(props.usersCRUDLambda));
        addAuthorizedMethod(usersApi, 'POST', createLambdaIntegration(props.usersCRUDLambda));

        const userApi = usersApi.addResource('{user_id}');
        addAuthorizedMethod(userApi, 'GET', createLambdaIntegration(props.usersCRUDLambda));
        addAuthorizedMethod(userApi, 'PUT', createLambdaIntegration(props.usersCRUDLambda));
        addAuthorizedMethod(userApi, 'DELETE', createLambdaIntegration(props.usersCRUDLambda));

        // Experiences API
        const experiencesApi = this.api.root.addResource('experiences');
        addAuthorizedMethod(experiencesApi, 'GET', createLambdaIntegration(props.experiencesCRUDLambda));
        addAuthorizedMethod(experiencesApi, 'POST', createLambdaIntegration(props.experiencesCRUDLambda));

        const experienceApi = experiencesApi.addResource('{experience_id}');
        addAuthorizedMethod(experienceApi, 'GET', createLambdaIntegration(props.experiencesCRUDLambda));
        addAuthorizedMethod(experienceApi, 'PUT', createLambdaIntegration(props.experiencesCRUDLambda));
        addAuthorizedMethod(experienceApi, 'DELETE', createLambdaIntegration(props.experiencesCRUDLambda));

        // Courses API
        const coursesApi = this.api.root.addResource('courses');
        addAuthorizedMethod(coursesApi, 'GET', createLambdaIntegration(props.coursesCRUDLambda));
        addAuthorizedMethod(coursesApi, 'POST', createLambdaIntegration(props.coursesCRUDLambda));

        const courseApi = coursesApi.addResource('{course_id}');
        addAuthorizedMethod(courseApi, 'GET', createLambdaIntegration(props.coursesCRUDLambda));
        addAuthorizedMethod(courseApi, 'PUT', createLambdaIntegration(props.coursesCRUDLambda));
        addAuthorizedMethod(courseApi, 'DELETE', createLambdaIntegration(props.coursesCRUDLambda));

        // Checklist API
        const checklistApi = this.api.root.addResource('checklist');
        addAuthorizedMethod(checklistApi, 'GET', createLambdaIntegration(props.checklistCRUDLambda));
        addAuthorizedMethod(checklistApi, 'POST', createLambdaIntegration(props.checklistCRUDLambda));

        const checklistItemApi = checklistApi.addResource('{checklist_id}');
        addAuthorizedMethod(checklistItemApi, 'GET', createLambdaIntegration(props.checklistCRUDLambda));
        addAuthorizedMethod(checklistItemApi, 'PUT', createLambdaIntegration(props.checklistCRUDLambda));
        addAuthorizedMethod(checklistItemApi, 'DELETE', createLambdaIntegration(props.checklistCRUDLambda));

        // Dashboard API
        const dashboardApi = this.api.root.addResource('dashboard');
        addAuthorizedMethod(dashboardApi, 'GET', createLambdaIntegration(props.dashboardLambda));

        // GPA Calculator API
        const gpaApi = this.api.root.addResource('gpa');
        addAuthorizedMethod(gpaApi, 'GET', createLambdaIntegration(props.gpaCalculatorLambda));
        addAuthorizedMethod(gpaApi, 'POST', createLambdaIntegration(props.gpaCalculatorLambda));

        // PDF Generator API
        const pdfApi = this.api.root.addResource('pdf');
        addAuthorizedMethod(pdfApi, 'POST', createLambdaIntegration(props.pdfGeneratorLambda));

        const pdfDownloadApi = pdfApi.addResource('{pdf_id}');
        addAuthorizedMethod(pdfDownloadApi, 'GET', createLambdaIntegration(props.pdfGeneratorLambda));

        // Analytics API
        const analyticsApi = this.api.root.addResource('analytics');
        addAuthorizedMethod(analyticsApi, 'GET', createLambdaIntegration(props.analyticsLambda));

        // Notifications API
        const notificationsApi = this.api.root.addResource('notifications');
        addAuthorizedMethod(notificationsApi, 'POST', createLambdaIntegration(props.notificationsLambda));

        // University Settings API
        const universitySettingsApi = this.api.root.addResource('university-settings');
        addAuthorizedMethod(universitySettingsApi, 'GET', createLambdaIntegration(props.universitySettingsLambda));
        addAuthorizedMethod(universitySettingsApi, 'PUT', createLambdaIntegration(props.universitySettingsLambda));

        // Advisors API
        const advisorsApi = this.api.root.addResource('advisors');
        addAuthorizedMethod(advisorsApi, 'GET', createLambdaIntegration(props.advisorsLambda));
        addAuthorizedMethod(advisorsApi, 'POST', createLambdaIntegration(props.advisorsLambda));

        const advisorApi = advisorsApi.addResource('{advisor_id}');
        addAuthorizedMethod(advisorApi, 'GET', createLambdaIntegration(props.advisorsLambda));
        addAuthorizedMethod(advisorApi, 'PUT', createLambdaIntegration(props.advisorsLambda));
        addAuthorizedMethod(advisorApi, 'DELETE', createLambdaIntegration(props.advisorsLambda));

        // Announcements API
        const announcementsApi = this.api.root.addResource('announcements');
        addAuthorizedMethod(announcementsApi, 'GET', createLambdaIntegration(props.announcementsLambda));
        addAuthorizedMethod(announcementsApi, 'POST', createLambdaIntegration(props.announcementsLambda));

        const announcementApi = announcementsApi.addResource('{announcement_id}');
        addAuthorizedMethod(announcementApi, 'GET', createLambdaIntegration(props.announcementsLambda));
        addAuthorizedMethod(announcementApi, 'PUT', createLambdaIntegration(props.announcementsLambda));
        addAuthorizedMethod(announcementApi, 'DELETE', createLambdaIntegration(props.announcementsLambda));

        // Stripe Subscription API
        const stripeApi = this.api.root.addResource('stripe');
        const subscriptionApi = stripeApi.addResource('subscription');
        const subscriptionUserApi = subscriptionApi.addResource('{user_id}').addResource('{university_id}');

        addAuthorizedMethod(subscriptionUserApi, 'GET', createLambdaIntegration(props.stripeSubscriptionLambda));
        addAuthorizedMethod(subscriptionUserApi, 'POST', createLambdaIntegration(props.stripeSubscriptionLambda));

        // Stripe Plans API (no authentication required for public plans)
        const plansApi = stripeApi.addResource('plans');
        plansApi.addMethod('GET', createLambdaIntegration(props.stripeSubscriptionLambda));

        // Stripe Webhook API (no authentication required)
        const webhookApi = this.api.root.addResource('stripe-webhook');
        webhookApi.addMethod('POST', createLambdaIntegration(props.stripeWebhookLambda));

        // Health Check API
        const healthApi = this.api.root.addResource('health');
        healthApi.addMethod('GET', new apigateway.MockIntegration({
            integrationResponses: [{
                statusCode: '200',
                responseTemplates: {
                    'application/json': JSON.stringify({
                        status: 'healthy',
                        timestamp: new Date().toISOString(),
                        service: 'pre-professional-tracker-api',
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
        new cdk.CfnOutput(this, 'ApiGatewayUrl', {
            value: this.api.url,
            description: 'API Gateway URL',
        });

        new cdk.CfnOutput(this, 'ApiGatewayId', {
            value: this.api.restApiId,
            description: 'API Gateway ID',
        });
    }
}
