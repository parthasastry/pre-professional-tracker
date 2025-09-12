#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { PreProfessionalTrackerStack } from '../lib/infra-stack';

const app = new cdk.App();

// Load environment variables
const env = {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || 'us-east-1',
};

new PreProfessionalTrackerStack(app, 'PreProfessionalTrackerStack', {
    env,
    description: 'Pre-Professional Tracker - University-centric student tracking platform',
    tags: {
        Project: 'PreProfessionalTracker',
        Environment: 'production',
        Owner: 'PreProfessionalTracker',
    },
});
