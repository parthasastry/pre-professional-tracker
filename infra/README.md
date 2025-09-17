# Pre-Professional Tracker Infrastructure

This directory contains the AWS CDK infrastructure code for the Pre-Professional Tracker application.

## Architecture Overview

The infrastructure is built using AWS CDK and follows a serverless, university-centric architecture:

- **DynamoDB**: NoSQL database with single-table design
- **Lambda**: Serverless compute functions
- **API Gateway**: REST API with Cognito authentication
- **Cognito**: User authentication and authorization
- **S3**: File storage for PDFs and static assets
- **CloudFront**: CDN for content delivery

## Project Structure

```
infra/
├── bin/
│   └── infra.ts                 # CDK app entry point
├── lib/
│   ├── infra-stack.ts          # Main stack
│   ├── dynamodb-stack.ts       # DynamoDB tables
│   ├── cognito-stack.ts        # Cognito user pool
│   ├── lambda-stack.ts         # Lambda functions
│   ├── apigateway-stack.ts     # API Gateway
│   └── s3-stack.ts            # S3 buckets
├── package.json
├── tsconfig.json
├── cdk.json
└── env.example
```

## DynamoDB Schema

### Single-Table Design

The application uses a single-table design with the following key patterns:

- **Universities**: `UNIVERSITY#<university_id>`
- **Users**: `UNIVERSITY#<university_id>#USER#<user_id>`
- **Experiences**: `UNIVERSITY#<university_id>#EXPERIENCE#<experience_id>`
- **Courses**: `UNIVERSITY#<university_id>#COURSE#<course_id>`
- **Checklist**: `UNIVERSITY#<university_id>#CHECKLIST#<checklist_id>`

### Tables

1. **universities** - Core university data
2. **users** - Students and advisors
3. **experiences** - Shadowing and volunteering
4. **courses** - Academic tracking
5. **checklist** - Progress milestones
6. **analytics** - University analytics
7. **pdf_cache** - Cached PDF exports
8. **university_settings** - University configurations
9. **advisors** - University advisors
10. **announcements** - University communications

## Setup Instructions

### Prerequisites

1. Install AWS CDK:

   ```bash
   npm install -g aws-cdk
   ```

2. Install dependencies:

   ```bash
   cd infra
   npm install
   ```

3. Configure AWS credentials:
   ```bash
   aws configure
   ```

### Environment Configuration

1. Copy the example environment file:

   ```bash
   cp env.example .env
   ```

2. Update the `.env` file with your AWS account details and configuration.

### Deployment

1. Bootstrap CDK (first time only):

   ```bash
   cdk bootstrap
   ```

2. Deploy the infrastructure:

   ```bash
   cdk deploy
   ```

3. To destroy the infrastructure:
   ```bash
   cdk destroy
   ```

### Development

- Watch for changes: `npm run watch`
- Run tests: `npm test`
- Synthesize CloudFormation: `npm run synth`

## Lambda Functions

The following Lambda functions are deployed:

### Core CRUD Functions

- `universities-crud` - University management
- `users-crud` - User management
- `experiences-crud` - Experience logging
- `courses-crud` - Course tracking
- `checklist-crud` - Checklist management

### Specialized Functions

- `gpa-calculator` - GPA and prerequisite calculations
- `pdf-generator` - PDF portfolio generation
- `analytics` - University analytics
- `notifications` - Email notifications

### University Management

- `university-settings` - University configurations
- `advisors` - Advisor management
- `announcements` - Announcement system

## API Endpoints

The API Gateway provides the following endpoints:

- `GET/POST /universities` - University management
- `GET/POST /users` - User management
- `GET/POST /experiences` - Experience logging
- `GET/POST /courses` - Course tracking
- `GET/POST /checklist` - Checklist management
- `GET/POST /gpa` - GPA calculations
- `POST /pdf` - PDF generation
- `GET /analytics` - Analytics data
- `POST /notifications` - Send notifications

## Security

- All API endpoints require Cognito authentication
- DynamoDB access is restricted to Lambda functions
- S3 buckets have appropriate access controls
- CORS is configured for frontend access

## Monitoring

- CloudWatch logs for all Lambda functions
- DynamoDB metrics and alarms
- API Gateway monitoring
- S3 access logging

## Cost Optimization

- Pay-per-request DynamoDB billing
- Lambda functions with appropriate memory allocation
- S3 lifecycle policies for cost optimization
- CloudFront for efficient content delivery

## Troubleshooting

### Common Issues

1. **CDK Bootstrap Required**: Run `cdk bootstrap` if you get bootstrap errors
2. **Permissions**: Ensure your AWS credentials have sufficient permissions
3. **Region**: Make sure you're deploying to the correct region
4. **Dependencies**: Run `npm install` if you get module not found errors

### Useful Commands

- `cdk list` - List all stacks
- `cdk diff` - Show differences between deployed and current state
- `cdk synth` - Synthesize CloudFormation template
- `cdk doctor` - Check CDK environment
