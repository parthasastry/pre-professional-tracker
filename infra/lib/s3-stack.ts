import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as iam from 'aws-cdk-lib/aws-iam';

export class S3Construct extends Construct {
    public readonly pdfsBucket: s3.Bucket;

    constructor(scope: Construct, id: string) {
        super(scope, id);

        // PDF Storage Bucket
        this.pdfsBucket = new s3.Bucket(this, 'PdfsBucket', {
            bucketName: process.env.S3_PDFS_BUCKET || 'pre-professional-tracker-pdfs',
            versioned: true,
            encryption: s3.BucketEncryption.S3_MANAGED,
            blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
            lifecycleRules: [
                {
                    id: 'DeleteIncompleteMultipartUploads',
                    abortIncompleteMultipartUploadAfter: cdk.Duration.days(1),
                },
                {
                    id: 'DeleteOldVersions',
                    noncurrentVersionExpiration: cdk.Duration.days(30),
                },
            ],
            cors: [
                {
                    allowedMethods: [s3.HttpMethods.GET, s3.HttpMethods.PUT, s3.HttpMethods.POST],
                    allowedOrigins: ['*'],
                    allowedHeaders: ['*'],
                    maxAge: 3000,
                },
            ],
        });

        // IAM Policy for Lambda functions to access S3
        const s3AccessPolicy = new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
                's3:GetObject',
                's3:PutObject',
                's3:DeleteObject',
                's3:ListBucket',
            ],
            resources: [
                this.pdfsBucket.bucketArn,
                `${this.pdfsBucket.bucketArn}/*`,
            ],
        });

        // Outputs
        new cdk.CfnOutput(this, 'PdfsBucketName', {
            value: this.pdfsBucket.bucketName,
            description: 'PDF Storage Bucket Name',
        });
    }
}
