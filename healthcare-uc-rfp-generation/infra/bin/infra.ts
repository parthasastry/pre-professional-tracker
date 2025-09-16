#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { HealthcareUcRfpGenerationStack } from '../lib/rfp-stack';

const app = new cdk.App();

new HealthcareUcRfpGenerationStack(app, 'HealthcareUcRfpGenerationStack', {
    env: {
        account: process.env.AWS_ACCOUNT_ID,
        region: process.env.AWS_REGION || 'us-east-1',
    },
    description: 'Healthcare UC RFP Generation System - Agentic AI for RFP Processing',
});

app.synth();
