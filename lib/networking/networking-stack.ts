import * as cdk from 'aws-cdk-lib'
import * as ec2 from 'aws-cdk-lib/aws-ec2'
import {Construct} from "constructs";
import {StackProps} from "../../config/interfaces/stack-properties";
import {Constants} from "../../config/constants";

export class NetworkingStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props: StackProps) {
        super(scope, id, props);

        const vpc = ec2.Vpc.fromLookup(this, `${Constants.PROJECTNAME}-vpcLookup-${props.stage}`, {
            vpcId: props.vpc.id
        })

        const lambdaSg = new ec2.SecurityGroup(this, 'lambda-sg', {
            securityGroupName: `${Constants.PROJECTNAME}-lambda-sg-${props.stage}`,
            description: 'Security Group for Lambdas',
            vpc: vpc
        })

        const dbSecurityGroup = new ec2.SecurityGroup(this, `${Constants.PROJECTNAME}-privateSubnet2-${props.stage}`, {
            vpc,
            description: 'RDS security group',
            allowAllOutbound: true,
        });

        dbSecurityGroup.addIngressRule(
            lambdaSg,
            ec2.Port.tcp(5432),
            'Allow Postgres access from Lambda SG'
        );

        new cdk.CfnOutput(this, 'LambdaSgExport', {
            value: lambdaSg.securityGroupId,
            exportName: `${Constants.PROJECTNAME}-lambda-sg-${props.stage}`
        });

        new cdk.CfnOutput(this, 'DbSgExport', {
            value: dbSecurityGroup.securityGroupId,
            exportName: `${Constants.PROJECTNAME}-db-sg-${props.stage}`
        });
    }
}
