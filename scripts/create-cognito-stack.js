import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

class CognitoOnlyStack extends cdk.Stack {
    public readonly userPool: cognito.UserPool;
    public readonly userPoolClient: cognito.UserPoolClient;
    public readonly identityPool: cognito.CfnIdentityPool;

    constructor(scope, id, props) {
        super(scope, id, props);

        // Create a simple Lambda function for post-confirmation
        const postConfirmationLambda = new lambda.Function(this, 'PostConfirmationLambda', {
            runtime: lambda.Runtime.NODEJS_18_X,
            handler: 'index.handler',
            code: lambda.Code.fromInline(`
                export const handler = async (event) => {
                    console.log('Post confirmation event:', JSON.stringify(event, null, 2));
                    
                    // For now, just return the event
                    return event;
                };
            `),
            environment: {
                TABLE_USERS: process.env.TABLE_USERS || 'pre_professional_tracker_users',
                TABLE_EXPERIENCES: process.env.TABLE_EXPERIENCES || 'pre_professional_tracker_experiences-v2',
                TABLE_COURSES: process.env.TABLE_COURSES || 'pre_professional_tracker_courses-v2',
                TABLE_CHECKLIST: process.env.TABLE_CHECKLIST || 'pre_professional_tracker_checklist-v2'
            }
        });

        // User Pool
        this.userPool = new cognito.UserPool(this, 'PreProfessionalTrackerUserPool', {
            userPoolName: 'pre-professional-tracker-users-v2',
            selfSignUpEnabled: true,
            signInAliases: {
                email: true,
            },
            standardAttributes: {
                email: {
                    required: true,
                    mutable: true,
                },
                givenName: {
                    required: true,
                    mutable: true,
                },
                familyName: {
                    required: true,
                    mutable: true,
                },
            },
            customAttributes: {
                university_id: new cognito.StringAttribute({
                    minLen: 1,
                    maxLen: 255,
                    mutable: true,
                }),
                user_type: new cognito.StringAttribute({
                    minLen: 1,
                    maxLen: 50,
                    mutable: true,
                }),
            },
            passwordPolicy: {
                minLength: 8,
                requireLowercase: true,
                requireUppercase: true,
                requireDigits: true,
                requireSymbols: true,
            },
            accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            lambdaTriggers: {
                postConfirmation: postConfirmationLambda,
            },
        });

        // User Pool Client
        this.userPoolClient = new cognito.UserPoolClient(this, 'PreProfessionalTrackerUserPoolClient', {
            userPool: this.userPool,
            userPoolClientName: 'pre-professional-tracker-client-v2',
            generateSecret: false,
            authFlows: {
                userSrp: true,
                userPassword: true,
            },
            oAuth: {
                flows: {
                    implicitCodeGrant: true,
                },
                scopes: [
                    cognito.OAuthScope.EMAIL,
                    cognito.OAuthScope.OPENID,
                    cognito.OAuthScope.PROFILE,
                ],
                callbackUrls: [
                    'http://localhost:5173/',
                    'https://localhost:5173/',
                ],
                logoutUrls: [
                    'http://localhost:5173/',
                    'https://localhost:5173/',
                ],
            },
            preventUserExistenceErrors: true,
        });

        // Identity Pool
        this.identityPool = new cognito.CfnIdentityPool(this, 'PreProfessionalTrackerIdentityPool', {
            identityPoolName: 'pre-professional-tracker-identity-v2',
            allowUnauthenticatedIdentities: false,
            cognitoIdentityProviders: [
                {
                    clientId: this.userPoolClient.userPoolClientId,
                    providerName: this.userPool.userPoolProviderName,
                },
            ],
        });

        // IAM Role for Authenticated Users
        const authenticatedRole = new iam.Role(this, 'CognitoDefaultAuthenticatedRole', {
            assumedBy: new iam.FederatedPrincipal(
                'cognito-identity.amazonaws.com',
                {
                    StringEquals: {
                        'cognito-identity.amazonaws.com:aud': this.identityPool.ref,
                    },
                    'ForAnyValue:StringLike': {
                        'cognito-identity.amazonaws.com:amr': 'authenticated',
                    },
                },
                'sts:AssumeRoleWithWebIdentity'
            ),
        });

        // Attach policies to authenticated role
        authenticatedRole.addToPolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
                'cognito-identity:GetId',
                'cognito-identity:GetCredentialsForIdentity',
            ],
            resources: ['*'],
        }));

        // Grant Lambda permissions
        postConfirmationLambda.addToRolePolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
                'dynamodb:PutItem',
                'dynamodb:GetItem',
                'dynamodb:UpdateItem',
                'dynamodb:DeleteItem',
                'dynamodb:Query',
                'dynamodb:Scan',
            ],
            resources: [
                `arn:aws:dynamodb:${this.region}:${this.account}:table/pre_professional_tracker_*`,
            ],
        }));

        postConfirmationLambda.addPermission('CognitoInvokePermission', {
            principal: new iam.ServicePrincipal('cognito-idp.amazonaws.com'),
            action: 'lambda:InvokeFunction',
            sourceArn: this.userPool.userPoolArn,
        });

        // Outputs
        new cdk.CfnOutput(this, 'UserPoolId', {
            value: this.userPool.userPoolId,
            description: 'Cognito User Pool ID',
        });

        new cdk.CfnOutput(this, 'UserPoolClientId', {
            value: this.userPoolClient.userPoolClientId,
            description: 'Cognito User Pool Client ID',
        });

        new cdk.CfnOutput(this, 'IdentityPoolId', {
            value: this.identityPool.ref,
            description: 'Cognito Identity Pool ID',
        });

        new cdk.CfnOutput(this, 'UserPoolArn', {
            value: this.userPool.userPoolArn,
            description: 'Cognito User Pool ARN',
        });
    }
}

const app = new cdk.App();
new CognitoOnlyStack(app, 'PreProfessionalTrackerCognitoStack', {
    env: {
        account: process.env.CDK_DEFAULT_ACCOUNT,
        region: process.env.CDK_DEFAULT_REGION || 'us-east-2',
    },
});

console.log('🚀 Cognito-only stack created!');
console.log('📝 To deploy: cdk deploy PreProfessionalTrackerCognitoStack');
