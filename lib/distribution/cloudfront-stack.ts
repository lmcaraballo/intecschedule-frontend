import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import * as cdk from 'aws-cdk-lib'
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront'
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";
import {Construct} from "constructs";
import {StackProps} from "../../config/interfaces/stack-properties";
import {Constants} from "../../config/constants";


export class CloudfrontStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props: StackProps) {
        super(scope, id, props);

        const bucketArn = cdk.Fn.importValue(
            `${Constants.PROJECTNAME}-bucketArn-${props.envName}`
        );

        const bucket = s3.Bucket.fromBucketArn(
            this,
            'ImportedBucket',
            bucketArn
        );

        const origin = origins.S3BucketOrigin.withOriginAccessControl(bucket, {
            originPath: '/frontend/react'
        });

        const distribution = new cloudfront.Distribution(this, `${Constants.PROJECTNAME}-cloudfront-${props.envName}`, {
            defaultRootObject: 'index.html',
            defaultBehavior: {
                origin: origin,
                viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS
            }
        });

        new s3deploy.BucketDeployment(this, 'DeployReactApp', {
            sources: [
                s3deploy.Source.asset('src/react/dist'),
            ],
            destinationBucket: bucket,
            destinationKeyPrefix: 'frontend/react',
            distribution,
            distributionPaths: ['/*'],
            prune: true,
        });
    }
}
