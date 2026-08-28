import * as cdk from "aws-cdk-lib";
import {Construct} from "constructs";
import * as iam from "aws-cdk-lib/aws-iam";
import {StackProps} from "../../config/interfaces/stack-properties";
import {Constants} from "../../config/constants";

export class AuthorizationStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props: StackProps) {
        super(scope, id, props);

        const policyNetworkInterface = new iam.ManagedPolicy(this, `${Constants.PROJECTNAME}-network-interface-policy-${props.envName}`, {
            managedPolicyName: `${Constants.PROJECTNAME}-network-interface-policy-${props.envName}`,
            statements: [
                new iam.PolicyStatement({
                    effect: iam.Effect.ALLOW,
                    actions: [
                        'ec2:CreateNetworkInterface',
                        'ec2:DescribeNetworkInterfaces',
                        'ec2:DeleteNetworkInterface'
                    ],
                    resources: ['*']
                })
            ]
        });

        const policyParameterStoreRead = new iam.ManagedPolicy(this, `${Constants.PROJECTNAME}-ssm-parameter-policy-${props.envName}`, {
            managedPolicyName: `${Constants.PROJECTNAME}-ssm-parameter-policy-${props.envName}`,
            statements: [
                new iam.PolicyStatement({
                    effect: iam.Effect.ALLOW,
                    actions: [
                        'ssm:GetParameters',
                        'ssm:GetParameter',
                        'ssm:PutParameter'
                    ],
                    resources: ['*']
                })
            ]
        });

        const policyCloudwatchLogWrite = new iam.ManagedPolicy(this, `${Constants.PROJECTNAME}-cloudwatch-logs-policy-${props.envName}`, {
            managedPolicyName: `${Constants.PROJECTNAME}-cloudwatch-logs-policy-${props.envName}`,
            statements: [
                new iam.PolicyStatement({
                    effect: iam.Effect.ALLOW,
                    actions: [
                        'logs:DeleteSubscriptionFilter',
                        'logs:DeleteLogStream',
                        'logs:CreateExportTask',
                        'logs:DeleteResourcePolicy',
                        'logs:CreateLogStream',
                        'logs:DeleteMetricFilter',
                        'logs:TagLogGroup',
                        'logs:CancelExportTask',
                        'logs:DeleteRetentionPolicy',
                        'logs:DeleteLogDelivery',
                        'logs:AssociateKmsKey',
                        'logs:PutDestination',
                        'logs:DisassociateKmsKey',
                        'logs:UntagLogGroup',
                        'logs:DeleteLogGroup',
                        'logs:PutDestinationPolicy',
                        'logs:DeleteDestination',
                        'logs:PutLogEvents',
                        'logs:CreateLogGroup',
                        'logs:PutMetricFilter',
                        'logs:CreateLogDelivery',
                        'logs:PutResourcePolicy',
                        'logs:UpdateLogDelivery',
                        'logs:PutSubscriptionFilter',
                        'logs:PutRetentionPolicy'
                    ],
                    resources: ['*']
                })
            ]
        });

        const policyS3FullAccess = new iam.ManagedPolicy(this, `${Constants.PROJECTNAME}-s3-full-access-policy-${props.envName}`, {
            managedPolicyName: `${Constants.PROJECTNAME}-s3-full-access-policy-${props.envName}`,
            statements: [
                new iam.PolicyStatement({
                    effect: iam.Effect.ALLOW,
                    actions: [
                        's3:GetObject',
                        's3:PutObject',
                        's3:ListBucket',
                        's3:DeleteObject',
                        's3:PutObjectAcl'
                    ],
                    resources: ['*']
                })
            ]
        })

        const policyKmsGetDecryptValue = new iam.ManagedPolicy(this, `${Constants.PROJECTNAME}-kms-decrypt-policy-${props.envName}`, {
            managedPolicyName: `${Constants.PROJECTNAME}-kms-decrypt-policy-${props.envName}`,
            statements: [
                new iam.PolicyStatement({
                    effect: iam.Effect.ALLOW,
                    actions: [
                        'kms:ListKeys',
                        'kms:Decrypt',
                        'kms:GenerateDataKey'
                    ],
                    resources: ['*']
                })
            ]
        });

        const policySecretsManagerReadWrite: iam.IManagedPolicy = iam
            .ManagedPolicy
            .fromAwsManagedPolicyName('SecretsManagerReadWrite');


        const roleLambdaAurora = new iam.Role(this, "Role", {
            roleName: `${Constants.PROJECTNAME}-lambdaAuroraRole-${props.envName}`,
            assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
            description: 'IAM role for lambda for DB access & s3'
        })

        roleLambdaAurora.addManagedPolicy(policyNetworkInterface);
        roleLambdaAurora.addManagedPolicy(policySecretsManagerReadWrite);
        roleLambdaAurora.addManagedPolicy(policyParameterStoreRead);
        roleLambdaAurora.addManagedPolicy(policyCloudwatchLogWrite);
        roleLambdaAurora.addManagedPolicy(policyKmsGetDecryptValue);
        roleLambdaAurora.addManagedPolicy(policyS3FullAccess);

        new cdk.CfnOutput(this, `${Constants.PROJECTNAME}-lambdaAuroraRoleArn-${props.envName}`, {
            value: roleLambdaAurora.roleArn,
            description: 'Role for lambda to access to DB & s3',
            exportName: `${Constants.PROJECTNAME}-lambdaAuroraRoleArn-${props.envName}`
        })
    }
}