#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { CognitoOnlyStack } from './lib/cognito-only-stack';

const app = new cdk.App();

new CognitoOnlyStack(app, 'PreProfessionalTrackerCognitoStack', {
    env: {
        account: process.env.CDK_DEFAULT_ACCOUNT,
        region: process.env.CDK_DEFAULT_REGION || 'us-east-2',
    },
});

console.log('🚀 Cognito-only stack created!');
console.log('📝 To deploy: cdk deploy PreProfessionalTrackerCognitoStack');
