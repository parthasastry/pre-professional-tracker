import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as path from 'path';

export interface LambdaConstructProps {
    universitiesTable: dynamodb.Table;
    usersTable: dynamodb.Table;
    experiencesTable: dynamodb.Table;
    coursesTable: dynamodb.Table;
    checklistTable: dynamodb.Table;
    analyticsTable: dynamodb.Table;
    pdfCacheTable: dynamodb.Table;
    universitySettingsTable: dynamodb.Table;
    advisorsTable: dynamodb.Table;
    announcementsTable: dynamodb.Table;
    pdfsBucket: s3.Bucket;
}

export class LambdaConstruct extends Construct {
    // Core CRUD Lambdas
    public readonly universitiesCRUDLambda: lambda.Function;
    public readonly usersCRUDLambda: lambda.Function;
    public readonly experiencesCRUDLambda: lambda.Function;
    public readonly coursesCRUDLambda: lambda.Function;
    public readonly checklistCRUDLambda: lambda.Function;

    // Specialized Lambdas
    public readonly dashboardLambda: lambda.Function;
    public readonly gpaCalculatorLambda: lambda.Function;
    public readonly pdfGeneratorLambda: lambda.Function;
    public readonly analyticsLambda: lambda.Function;
    public readonly notificationsLambda: lambda.Function;

    // University Management Lambdas
    public readonly universitySettingsLambda: lambda.Function;
    public readonly advisorsLambda: lambda.Function;
    public readonly announcementsLambda: lambda.Function;

    constructor(scope: Construct, id: string, props: LambdaConstructProps) {
        super(scope, id);

        // Common Lambda configuration
        const commonLambdaProps = {
            runtime: lambda.Runtime.NODEJS_18_X,
            handler: 'index.handler',
            timeout: cdk.Duration.seconds(30),
            memorySize: 256,
            environment: {
                TABLE_UNIVERSITIES: props.universitiesTable.tableName,
                TABLE_USERS: props.usersTable.tableName,
                TABLE_EXPERIENCES: props.experiencesTable.tableName,
                TABLE_COURSES: props.coursesTable.tableName,
                TABLE_CHECKLIST: props.checklistTable.tableName,
                TABLE_ANALYTICS: props.analyticsTable.tableName,
                TABLE_PDF_CACHE: props.pdfCacheTable.tableName,
                TABLE_UNIVERSITY_SETTINGS: props.universitySettingsTable.tableName,
                TABLE_ADVISORS: props.advisorsTable.tableName,
                TABLE_ANNOUNCEMENTS: props.announcementsTable.tableName,
                S3_PDFS_BUCKET: props.pdfsBucket.bucketName,
                REGION: cdk.Stack.of(this).region,
            },
        };

        // Universities CRUD Lambda
        this.universitiesCRUDLambda = new lambda.Function(this, 'UniversitiesCRUDLambda', {
            ...commonLambdaProps,
            functionName: 'pre-professional-tracker-universities-crud',
            description: 'Handle university CRUD operations',
            code: lambda.Code.fromAsset(path.join(__dirname, '../../backend/lambda/universities')),
        });

        // Users CRUD Lambda
        this.usersCRUDLambda = new lambda.Function(this, 'UsersCRUDLambda', {
            ...commonLambdaProps,
            functionName: 'pre-professional-tracker-users-crud',
            description: 'Handle user CRUD operations',
            code: lambda.Code.fromAsset(path.join(__dirname, '../../backend/lambda/users')),
        });

        // Experiences CRUD Lambda
        this.experiencesCRUDLambda = new lambda.Function(this, 'ExperiencesCRUDLambda', {
            ...commonLambdaProps,
            functionName: 'pre-professional-tracker-experiences-crud',
            description: 'Handle experience CRUD operations',
            code: lambda.Code.fromAsset(path.join(__dirname, '../../backend/lambda/experiences')),
        });

        // Courses CRUD Lambda
        this.coursesCRUDLambda = new lambda.Function(this, 'CoursesCRUDLambda', {
            ...commonLambdaProps,
            functionName: 'pre-professional-tracker-courses-crud',
            description: 'Handle course CRUD operations',
            code: lambda.Code.fromAsset(path.join(__dirname, '../../backend/lambda/courses')),
        });

        // Checklist CRUD Lambda
        this.checklistCRUDLambda = new lambda.Function(this, 'ChecklistCRUDLambda', {
            ...commonLambdaProps,
            functionName: 'pre-professional-tracker-checklist-crud',
            description: 'Handle checklist CRUD operations',
            code: lambda.Code.fromAsset(path.join(__dirname, '../../backend/lambda/checklist')),
        });

        // Dashboard Lambda
        this.dashboardLambda = new lambda.Function(this, 'DashboardLambda', {
            ...commonLambdaProps,
            functionName: 'pre-professional-tracker-dashboard',
            description: 'Generate dashboard data and analytics',
            code: lambda.Code.fromAsset(path.join(__dirname, '../../backend/lambda/dashboard')),
        });

        // GPA Calculator Lambda
        this.gpaCalculatorLambda = new lambda.Function(this, 'GpaCalculatorLambda', {
            ...commonLambdaProps,
            functionName: 'pre-professional-tracker-gpa-calculator',
            description: 'Calculate GPA and prerequisite completion',
            code: lambda.Code.fromAsset(path.join(__dirname, '../../backend/lambda/gpa-calculator')),
        });

        // PDF Generator Lambda
        this.pdfGeneratorLambda = new lambda.Function(this, 'PdfGeneratorLambda', {
            ...commonLambdaProps,
            functionName: 'pre-professional-tracker-pdf-generator',
            description: 'Generate PDF portfolios for students',
            timeout: cdk.Duration.minutes(5),
            memorySize: 1024,
            code: lambda.Code.fromAsset(path.join(__dirname, '../../backend/lambda/pdf-generator')),
        });

        // Analytics Lambda
        this.analyticsLambda = new lambda.Function(this, 'AnalyticsLambda', {
            ...commonLambdaProps,
            functionName: 'pre-professional-tracker-analytics',
            description: 'Generate university and user analytics',
            code: lambda.Code.fromAsset(path.join(__dirname, '../../backend/lambda/analytics')),
        });

        // Notifications Lambda
        this.notificationsLambda = new lambda.Function(this, 'NotificationsLambda', {
            ...commonLambdaProps,
            functionName: 'pre-professional-tracker-notifications',
            description: 'Send email notifications and reminders',
            code: lambda.Code.fromAsset(path.join(__dirname, '../../backend/lambda/notifications')),
        });

        // University Settings Lambda
        this.universitySettingsLambda = new lambda.Function(this, 'UniversitySettingsLambda', {
            ...commonLambdaProps,
            functionName: 'pre-professional-tracker-university-settings',
            description: 'Manage university-specific settings and configurations',
            code: lambda.Code.fromAsset(path.join(__dirname, '../../backend/lambda/university-settings')),
        });

        // Advisors Lambda
        this.advisorsLambda = new lambda.Function(this, 'AdvisorsLambda', {
            ...commonLambdaProps,
            functionName: 'pre-professional-tracker-advisors',
            description: 'Manage university advisors and their students',
            code: lambda.Code.fromAsset(path.join(__dirname, '../../backend/lambda/advisors')),
        });

        // Announcements Lambda
        this.announcementsLambda = new lambda.Function(this, 'AnnouncementsLambda', {
            ...commonLambdaProps,
            functionName: 'pre-professional-tracker-announcements',
            description: 'Manage university announcements and communications',
            code: lambda.Code.fromAsset(path.join(__dirname, '../../backend/lambda/announcements')),
        });

        // Grant DynamoDB permissions to all Lambdas
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
                props.universitiesTable.tableArn,
                props.usersTable.tableArn,
                props.experiencesTable.tableArn,
                props.coursesTable.tableArn,
                props.checklistTable.tableArn,
                props.analyticsTable.tableArn,
                props.pdfCacheTable.tableArn,
                props.universitySettingsTable.tableArn,
                props.advisorsTable.tableArn,
                props.announcementsTable.tableArn,
                `${props.universitiesTable.tableArn}/index/*`,
                `${props.usersTable.tableArn}/index/*`,
                `${props.experiencesTable.tableArn}/index/*`,
                `${props.coursesTable.tableArn}/index/*`,
                `${props.checklistTable.tableArn}/index/*`,
                `${props.analyticsTable.tableArn}/index/*`,
                `${props.pdfCacheTable.tableArn}/index/*`,
                `${props.universitySettingsTable.tableArn}/index/*`,
                `${props.advisorsTable.tableArn}/index/*`,
                `${props.announcementsTable.tableArn}/index/*`,
            ],
        });

        // Grant S3 permissions to PDF generator
        const s3Policy = new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
                's3:GetObject',
                's3:PutObject',
                's3:DeleteObject',
                's3:ListBucket',
            ],
            resources: [
                props.pdfsBucket.bucketArn,
                `${props.pdfsBucket.bucketArn}/*`,
            ],
        });

        // Grant SES permissions to notifications Lambda
        const sesPolicy = new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
                'ses:SendEmail',
                'ses:SendRawEmail',
            ],
            resources: ['*'],
        });

        // Apply policies to functions
        const allLambdas = [
            this.universitiesCRUDLambda,
            this.usersCRUDLambda,
            this.experiencesCRUDLambda,
            this.coursesCRUDLambda,
            this.checklistCRUDLambda,
            this.dashboardLambda,
            this.gpaCalculatorLambda,
            this.analyticsLambda,
            this.universitySettingsLambda,
            this.advisorsLambda,
            this.announcementsLambda,
        ];

        allLambdas.forEach(lambdaFunction => {
            lambdaFunction.addToRolePolicy(dynamoDbPolicy);
        });

        // Add S3 permissions to PDF generator
        this.pdfGeneratorLambda.addToRolePolicy(s3Policy);

        // Add SES permissions to notifications
        this.notificationsLambda.addToRolePolicy(sesPolicy);

        // Grant DynamoDB stream permissions for analytics
        props.experiencesTable.grantStreamRead(this.analyticsLambda);
        props.coursesTable.grantStreamRead(this.analyticsLambda);
        props.checklistTable.grantStreamRead(this.analyticsLambda);
    }
}
