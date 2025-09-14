import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';

export interface UserPoolConstructProps {
    postConfirmationLambda: lambda.Function;
}

export class UserPoolConstruct extends Construct {
    public readonly userPool: cognito.UserPool;
    public readonly userPoolClient: cognito.UserPoolClient;
    public readonly identityPool: cognito.CfnIdentityPool;

    constructor(scope: Construct, id: string, props: UserPoolConstructProps) {
        super(scope, id);

        // User Pool
        this.userPool = new cognito.UserPool(this, 'PreProfessionalTrackerUserPool', {
            userPoolName: 'pre-professional-tracker-users',
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
            mfa: cognito.Mfa.OPTIONAL,
            mfaSecondFactor: {
                sms: true,
                otp: true,
            },
            deviceTracking: {
                challengeRequiredOnNewDevice: true,
                deviceOnlyRememberedOnUserPrompt: true,
            },
            lambdaTriggers: {
                postConfirmation: props.postConfirmationLambda,
            },
        });

        // User Pool Client
        this.userPoolClient = new cognito.UserPoolClient(this, 'PreProfessionalTrackerUserPoolClient', {
            userPool: this.userPool,
            userPoolClientName: 'pre-professional-tracker-client',
            generateSecret: false,
            authFlows: {
                userPassword: true,
                userSrp: true,
                adminUserPassword: true,
            },
            oAuth: {
                flows: {
                    authorizationCodeGrant: true,
                    implicitCodeGrant: true,
                },
                scopes: [
                    cognito.OAuthScope.EMAIL,
                    cognito.OAuthScope.OPENID,
                    cognito.OAuthScope.PROFILE,
                ],
                callbackUrls: [
                    'http://localhost:3000/callback',
                    'https://your-domain.com/callback',
                ],
                logoutUrls: [
                    'http://localhost:3000/logout',
                    'https://your-domain.com/logout',
                ],
            },
            refreshTokenValidity: cdk.Duration.days(30),
            accessTokenValidity: cdk.Duration.hours(1),
            idTokenValidity: cdk.Duration.hours(1),
        });

        // Identity Pool
        this.identityPool = new cognito.CfnIdentityPool(this, 'PreProfessionalTrackerIdentityPool', {
            identityPoolName: 'pre_professional_tracker_identity_pool',
            allowUnauthenticatedIdentities: false,
            cognitoIdentityProviders: [
                {
                    clientId: this.userPoolClient.userPoolClientId,
                    providerName: this.userPool.userPoolProviderName,
                },
            ],
        });

        // IAM Role for authenticated users
        const authenticatedRole = new iam.Role(this, 'PreProfessionalTrackerAuthenticatedRole', {
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

        // Grant permissions to DynamoDB tables
        authenticatedRole.addToPolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
                'dynamodb:GetItem',
                'dynamodb:PutItem',
                'dynamodb:UpdateItem',
                'dynamodb:DeleteItem',
                'dynamodb:Query',
                'dynamodb:Scan',
            ],
            resources: [
                'arn:aws:dynamodb:*:*:table/pre-professional-tracker-*',
            ],
        }));

        // Grant permissions to S3 for PDF storage
        authenticatedRole.addToPolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
                's3:GetObject',
                's3:PutObject',
                's3:DeleteObject',
            ],
            resources: [
                'arn:aws:s3:::pre-professional-tracker-pdfs/*',
            ],
        }));

        // Attach role to identity pool
        new cognito.CfnIdentityPoolRoleAttachment(this, 'PreProfessionalTrackerIdentityPoolRoleAttachment', {
            identityPoolId: this.identityPool.ref,
            roles: {
                authenticated: authenticatedRole.roleArn,
            },
        });

        // User Pool Domain
        const userPoolDomain = this.userPool.addDomain('PreProfessionalTrackerUserPoolDomain', {
            cognitoDomain: {
                domainPrefix: 'pre-professional-tracker',
            },
        });

        // Outputs
        new cdk.CfnOutput(this, 'UserPoolId', {
            value: this.userPool.userPoolId,
            description: 'User Pool ID',
        });

        new cdk.CfnOutput(this, 'UserPoolClientId', {
            value: this.userPoolClient.userPoolClientId,
            description: 'User Pool Client ID',
        });

        new cdk.CfnOutput(this, 'IdentityPoolId', {
            value: this.identityPool.ref,
            description: 'Identity Pool ID',
        });

        new cdk.CfnOutput(this, 'UserPoolDomain', {
            value: userPoolDomain.domainName,
            description: 'User Pool Domain',
        });
    }
}
