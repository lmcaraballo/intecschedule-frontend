import * as cdk from "aws-cdk-lib";
import {Construct} from "constructs";
import {StackProps} from "../../config/interfaces/stack-properties";
import {Constants} from "../../config/constants";
import * as s3 from "aws-cdk-lib/aws-s3"

export class StorageStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props: StackProps) {
        super(scope, id, props);

        const bucket = new s3.Bucket(this, `${Constants.PROJECTNAME}-bucket-${props.envName}`, {
            bucketName: `${Constants.PROJECTNAME}-${props.envName}`,
            versioned: true,
            encryption: s3.BucketEncryption.S3_MANAGED,
            publicReadAccess: true,
            blockPublicAccess: new s3.BlockPublicAccess({
                blockPublicAcls: false,
                blockPublicPolicy: false,
                ignorePublicAcls: false,
                restrictPublicBuckets: false,
            }),
            removalPolicy: cdk.RemovalPolicy.DESTROY,
        });

        new cdk.CfnOutput(this, `${Constants.PROJECTNAME}-bucketArnOutput-${props.envName}`, {
            value: bucket.bucketArn,
            description: "ARN del bucket S3",
            exportName: `${Constants.PROJECTNAME}-bucketArn-${props.envName}`
        });

    }
}
