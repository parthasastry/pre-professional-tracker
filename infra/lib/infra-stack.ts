import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { UserPoolConstruct } from './cognito-stack';
import { DatabaseConstruct } from './dynamodb-stack';
import { LambdaConstruct } from './lambda-stack';
import { ApiGatewayConstruct } from './apigateway-stack';
import { S3Construct } from './s3-stack';

export class PreProfessionalTrackerStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        // Create all constructs
        const database = new DatabaseConstruct(this, 'DatabaseConstruct');
        const s3 = new S3Construct(this, 'S3Construct');

        const lambdas = new LambdaConstruct(this, 'Lambdas', {
            universitiesTable: database.universitiesTable,
            usersTable: database.usersTable,
            experiencesTable: database.experiencesTable,
            coursesTable: database.coursesTable,
            checklistTable: database.checklistTable,
            analyticsTable: database.analyticsTable,
            pdfCacheTable: database.pdfCacheTable,
            universitySettingsTable: database.universitySettingsTable,
            advisorsTable: database.advisorsTable,
            announcementsTable: database.announcementsTable,
            userGoalsTable: database.userGoalsTable,
            pdfsBucket: s3.pdfsBucket,
        });

        const userPool = new UserPoolConstruct(this, 'UserPoolConstruct', {
            postConfirmationLambda: lambdas.postConfirmationLambda,
        });

        new ApiGatewayConstruct(this, 'ApiGateway', {
            userPool: userPool.userPool,
            universitiesCRUDLambda: lambdas.universitiesCRUDLambda,
            usersCRUDLambda: lambdas.usersCRUDLambda,
            experiencesCRUDLambda: lambdas.experiencesCRUDLambda,
            coursesCRUDLambda: lambdas.coursesCRUDLambda,
            checklistCRUDLambda: lambdas.checklistCRUDLambda,
            gpaCalculatorLambda: lambdas.gpaCalculatorLambda,
            pdfGeneratorLambda: lambdas.pdfGeneratorLambda,
            analyticsLambda: lambdas.analyticsLambda,
            notificationsLambda: lambdas.notificationsLambda,
            universitySettingsLambda: lambdas.universitySettingsLambda,
            advisorsLambda: lambdas.advisorsLambda,
            announcementsLambda: lambdas.announcementsLambda,
            stripeSubscriptionLambda: lambdas.stripeSubscriptionLambda,
            stripeWebhookLambda: lambdas.stripeWebhookLambda,
            userGoalsLambda: lambdas.userGoalsLambda,
            goalsProgressLambda: lambdas.goalsProgressLambda,
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
