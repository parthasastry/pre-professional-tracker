import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

export class S3Construct extends Construct {
    public readonly documentsBucket: s3.Bucket;

    constructor(scope: Construct, id: string) {
        super(scope, id);

        // Documents Bucket - Store RFP documents and generated proposals
        this.documentsBucket = new s3.Bucket(this, 'DocumentsBucket', {
            bucketName: process.env.S3_RFP_DOCUMENTS_BUCKET,
            versioned: true,
            blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
            encryption: s3.BucketEncryption.S3_MANAGED,
            lifecycleRules: [
                {
                    id: 'DeleteIncompleteMultipartUploads',
                    abortIncompleteMultipartUploadAfter: cdk.Duration.days(1),
                },
                {
                    id: 'ArchiveOldVersions',
                    noncurrentVersionExpiration: cdk.Duration.days(90),
                },
            ],
            removalPolicy: cdk.RemovalPolicy.DESTROY, // For learning/demo purposes
        });
    }
}
