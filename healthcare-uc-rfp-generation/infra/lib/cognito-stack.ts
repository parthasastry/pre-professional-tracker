import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as lambda from 'aws-cdk-lib/aws-lambda';

export interface CognitoConstructProps {
    postConfirmationLambda?: lambda.Function;
}

export class CognitoConstruct extends Construct {
    public readonly userPool: cognito.UserPool;
    public readonly userPoolClient: cognito.UserPoolClient;
    public readonly identityPool: cognito.CfnIdentityPool;

    constructor(scope: Construct, id: string, props?: CognitoConstructProps) {
        super(scope, id);

        // User Pool for authentication
        this.userPool = new cognito.UserPool(this, 'RfpUserPool', {
            userPoolName: 'healthcare-uc-rfp-users',
            selfSignUpEnabled: true,
            signInAliases: {
                email: true,
                username: true,
            },
            autoVerify: {
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
                organization: new cognito.StringAttribute({ minLen: 1, maxLen: 256, mutable: true }),
                role: new cognito.StringAttribute({ minLen: 1, maxLen: 50, mutable: true }),
                department: new cognito.StringAttribute({ minLen: 1, maxLen: 100, mutable: true }),
            },
            passwordPolicy: {
                minLength: 8,
                requireLowercase: true,
                requireUppercase: true,
                requireDigits: true,
                requireSymbols: true,
            },
            accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
            removalPolicy: cdk.RemovalPolicy.DESTROY, // For learning/demo purposes
        });

        // User Pool Client for web and mobile applications
        this.userPoolClient = new cognito.UserPoolClient(this, 'RfpUserPoolClient', {
            userPool: this.userPool,
            userPoolClientName: 'healthcare-uc-rfp-client',
            generateSecret: false, // For web applications
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
                    'http://localhost:5173/callback',
                    'https://*.amplifyapp.com/callback',
                    'https://*.vercel.app/callback',
                ],
                logoutUrls: [
                    'http://localhost:3000/logout',
                    'http://localhost:5173/logout',
                    'https://*.amplifyapp.com/logout',
                    'https://*.vercel.app/logout',
                ],
            },
            preventUserExistenceErrors: true,
            supportedIdentityProviders: [
                cognito.UserPoolClientIdentityProvider.COGNITO,
            ],
        });

        // Identity Pool for AWS resource access
        this.identityPool = new cognito.CfnIdentityPool(this, 'RfpIdentityPool', {
            identityPoolName: 'healthcare-uc-rfp-identity-pool',
            allowUnauthenticatedIdentities: false,
            cognitoIdentityProviders: [
                {
                    clientId: this.userPoolClient.userPoolClientId,
                    providerName: this.userPool.userPoolProviderName,
                },
            ],
        });

        // Post Confirmation Lambda Trigger (if provided)
        if (props?.postConfirmationLambda) {
            this.userPool.addTrigger(cognito.UserPoolOperation.POST_CONFIRMATION, props.postConfirmationLambda);

            // Grant Cognito permission to invoke the Lambda
            props.postConfirmationLambda.addPermission('CognitoInvokePermission', {
                principal: new cdk.aws_iam.ServicePrincipal('cognito-idp.amazonaws.com'),
                action: 'lambda:InvokeFunction',
                sourceArn: `arn:aws:cognito-idp:${cdk.Stack.of(this).region}:${cdk.Stack.of(this).account}:userpool/*`
            });
        }

        // User Pool Domain for hosted UI
        const userPoolDomain = this.userPool.addDomain('RfpUserPoolDomain', {
            cognitoDomain: {
                domainPrefix: `healthcare-uc-rfp-${cdk.Stack.of(this).account}`,
            },
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

        new cdk.CfnOutput(this, 'UserPoolDomain', {
            value: userPoolDomain.domainName,
            description: 'Cognito User Pool Domain',
        });

        new cdk.CfnOutput(this, 'UserPoolArn', {
            value: this.userPool.userPoolArn,
            description: 'Cognito User Pool ARN',
        });
    }
}
