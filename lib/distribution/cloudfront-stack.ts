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

        new cloudfront.Distribution(this, `${Constants.PROJECTNAME}-cloudfront-${props.envName}`, {
            defaultRootObject: 'frontend/react/index.html',
            defaultBehavior: {
                origin: origins.S3BucketOrigin.withOriginAccessControl(bucket)
            }
        });
    }
}
