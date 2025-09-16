# Healthcare UC RFP Generation System

An agentic AI system for automatically processing RFP documents, making bid/no-bid decisions, and generating first-draft responses using AWS Serverless architecture.

## Architecture Overview

This system uses a minimal, cost-effective architecture perfect for learning:

- **Single Lambda Function**: Handles all RFP processing steps
- **AWS Bedrock**: AI processing for decision support and content generation
- **DynamoDB**: Document and process storage
- **API Gateway**: RESTful API endpoints with Cognito authentication
- **Cognito**: User authentication and authorization
- **S3**: Document storage (for future file uploads)

## Project Structure

```
healthcare-uc-rfp-generation/
├── infra/                    # CDK Infrastructure
│   ├── lib/
│   │   ├── rfp-stack.ts      # Main RFP stack
│   │   ├── rfp-dynamodb.ts   # DynamoDB tables
│   │   ├── rfp-lambda.ts     # Lambda function
│   │   ├── rfp-apigateway.ts # API Gateway
│   │   └── s3-stack.ts       # S3 bucket
│   ├── bin/infra.ts          # CDK app entry point
│   └── package.json
├── backend/
│   └── lambda/
│       └── rfp-processor/    # Single Lambda function
│           ├── index.mjs     # Main handler
│           └── package.json
└── README.md
```

## Setup Instructions

### Prerequisites

- AWS CLI configured with appropriate permissions
- Node.js 18+ installed
- CDK CLI installed (`npm install -g aws-cdk`)

### 1. Install Dependencies

```bash
# Install infrastructure dependencies
cd infra
npm install

# Install Lambda dependencies
cd ../backend/lambda/rfp-processor
npm install
```

### 2. Configure Environment

```bash
# Copy environment template
cp infra/.env.example infra/.env

# Edit with your AWS account details
# CDK_DEFAULT_ACCOUNT=your-account-id
# CDK_DEFAULT_REGION=us-east-1
```

### 3. Deploy Infrastructure

```bash
cd infra

# Bootstrap CDK (first time only)
cdk bootstrap

# Deploy the stack
npm run deploy
```

### 4. Seed Knowledge Base

```bash
# Seed the knowledge base with business context data
cd scripts
npm install
node seed-knowledge-base.js
```

### 5. Test the System

```bash
# Test health endpoint
curl https://your-api-gateway-url/health

# Test knowledge base
curl -X GET https://your-api-gateway-url/knowledge-base

# Test document upload
curl -X POST https://your-api-gateway-url/rfp \
  -H "Content-Type: application/json" \
  -d '{
    "client_name": "Test Hospital",
    "region": "North America",
    "industry": "Healthcare",
    "file_name": "test-rfp.pdf",
    "content_type": "application/pdf"
  }'
```

## API Endpoints

### Core RFP Processing (🔒 Requires Auth)

- `POST /rfp` - Initiate RFP document upload (returns presigned URL)
- `POST /rfp/complete-upload` - Complete file upload and extract text
- `POST /rfp/process` - Start processing document
- `GET /rfp/status/{process_id}` - Check processing status
- `GET /rfp/result/{process_id}` - Get processing results

### Results (🔒 Requires Auth)

- `GET /rfp/decision/{process_id}` - Get bid/no-bid decision
- `GET /rfp/draft/{process_id}` - Get generated draft
- `GET /rfp/compliance/{process_id}` - Get compliance review
- `GET /rfp/download/{process_id}` - Download final RFP response file from S3

### Knowledge Base (🔒 Requires Auth)

- `GET /knowledge-base` - List all knowledge base content
- `POST /knowledge-base` - Add new business context or template content
- `PUT /knowledge-base` - Update existing content
- `DELETE /knowledge-base` - Delete content (requires content_id in body)

**Knowledge Base Content Types:**

- `business_context` - Company capabilities, capacity, pricing, team info
- `templates` - RFP response templates for all sections (executive summary, company overview, solution, timeline, team, pricing)
- `compliance_rules` - Comprehensive compliance requirements (HIPAA, healthcare standards, risk management, timeline validation)
- `past_proposals` - Successful past proposal examples

### Audit Logs (🔒 Requires Auth)

- `GET /audit-logs` - List audit logs
- `GET /audit-logs/{process_id}` - Get logs for specific process

### System

- `GET /health` - Health check (no auth required)

## Agentic AI Workflow

### 1. Document Ingestion

- **Upload**: Client uploads RFP document via presigned S3 URL
- **Text Extraction**: AWS Textract extracts text from PDFs/images
- **Metadata Storage**: Document metadata stored in DynamoDB

### 2. Decision Making

- **Business Context**: AI analyzes RFP against company capabilities
- **Bid/No-Bid Decision**: Uses knowledge base for informed decisions
- **Reasoning**: Provides detailed reasoning based on business data

### 3. Draft Generation

- **Template-Based**: Uses professional response templates
- **Business Integration**: Incorporates actual company capabilities and experience
- **Personalization**: Tailors content to specific client requirements

### 4. Compliance Review

- **10-Point Checklist**: Comprehensive validation using compliance rules
- **Healthcare Standards**: Validates HIPAA, FDA, and industry requirements
- **Risk Assessment**: Checks timeline realism and capacity constraints
- **Quality Scoring**: Provides compliance score and recommendations

### 5. S3 Storage & Download

- **Response Storage**: Final RFP response stored as Markdown file in S3
- **Comprehensive Document**: Includes draft, compliance review, and metadata
- **Secure Download**: Presigned URLs for secure file access
- **Version Control**: Timestamped files for tracking different versions

### 6. Human Review

- **Final Approval**: Human review before client submission
- **Audit Trail**: Complete processing history and decisions logged

## Cost Estimation

**Monthly costs for learning/testing:**

- Lambda: $0 (free tier: 1M requests)
- DynamoDB: $0 (free tier: 25GB storage)
- API Gateway: $0 (free tier: 1M requests)
- Bedrock: ~$5-10 (pay-per-use)
- **Total: ~$5-10/month**

## Development Workflow

### Local Development

```bash
# Run Lambda locally with SAM
cd backend/lambda/rfp-processor
sam local start-api

# Test locally
curl http://localhost:3000/health
```

### Infrastructure Changes

```bash
cd infra
npm run build
npm run synth  # Preview changes
npm run deploy # Deploy changes
```

## Learning Objectives

This project demonstrates:

1. **Agentic AI Architecture**: Multi-step AI processing workflow
2. **AWS Serverless**: Lambda, DynamoDB, API Gateway integration
3. **AI Integration**: AWS Bedrock for LLM processing
4. **Cost Optimization**: Minimal architecture for learning
5. **Infrastructure as Code**: CDK for reproducible deployments

## Next Steps

1. **Add React Frontend**: Build UI for document upload and results
2. **File Upload**: Implement S3 file upload for PDF/DOCX processing
3. **Advanced AI**: Add more sophisticated decision logic
4. **Knowledge Base**: Build template and past proposal database
5. **Monitoring**: Add CloudWatch dashboards and alerts

## Troubleshooting

### Common Issues

1. **Bedrock Access**: Ensure your AWS account has Bedrock access enabled
2. **Permissions**: Check IAM roles have necessary permissions
3. **Region**: Ensure all services are in the same region
4. **Dependencies**: Run `npm install` in both infra/ and backend/ directories

### Useful Commands

```bash
# Check stack status
cdk list

# View stack outputs
aws cloudformation describe-stacks --stack-name HealthcareUcRfpGenerationStack

# Check Lambda logs
aws logs describe-log-groups --log-group-name-prefix /aws/lambda/healthcare-uc-rfp-processor
```

## Contributing

This is a learning project. Feel free to:

- Add new features
- Improve AI prompts
- Optimize costs
- Add tests
- Improve documentation
