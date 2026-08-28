import * as cdk from "aws-cdk-lib";
import * as rds from "aws-cdk-lib/aws-rds";
import * as ec2 from "aws-cdk-lib/aws-ec2";

import {Construct} from "constructs";
import {StackProps} from "../../config/interfaces/stack-properties";
import {Constants} from "../../config/constants";

export class RdsStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props: StackProps) {
        super(scope, id, props);

        const vpc = ec2.Vpc.fromLookup(this, `${Constants.PROJECTNAME}-vpcLookup-${props.stage}`, {
            vpcId: props.vpc.id
        })

        const privateSubnet1 = ec2.Subnet.fromSubnetId(
            this, `${Constants.PROJECTNAME}-privateSubnet1-${props.stage}`,
            props.vpc.privateSubnet1
        )

        const privateSubnet2 = ec2.Subnet.fromSubnetId(
            this, `${Constants.PROJECTNAME}-privateSubnet2-${props.stage}`,
            props.vpc.privateSubnet2
        )

        const dbSecurityGroup = ec2.SecurityGroup.fromSecurityGroupId(
            this,
            `${Constants.PROJECTNAME}-db-sg-${props.stage}`,
            cdk.Fn.importValue(`${Constants.PROJECTNAME}-db-sg-${props.stage}`)
        );

        const isProd = props.stage === 'prod';

        const db = new rds.DatabaseInstance(this, `${Constants.PROJECTNAME}-rds-${props.stage}`, {
            engine: rds.DatabaseInstanceEngine.postgres({
                version: rds.PostgresEngineVersion.VER_17
            }),
            vpc,
            vpcSubnets: {
                subnets: [privateSubnet1, privateSubnet2]
            },
            credentials: rds.Credentials.fromGeneratedSecret('clusteradmin', {
                secretName: `${Constants.PROJECTNAME}/rds/${props.stage}/credentials`
            }),
            instanceType: isProd
                ? ec2.InstanceType.of(ec2.InstanceClass.T4G, ec2.InstanceSize.MEDIUM)
                : ec2.InstanceType.of(ec2.InstanceClass.T4G, ec2.InstanceSize.MICRO),
            publiclyAccessible: false,
            multiAz: false,
            allocatedStorage: 20,
            storageType: rds.StorageType.GP3,
            deletionProtection: false,
            securityGroups: [dbSecurityGroup] // todo -> importar el sg del bastion host.
        });

        // if (isProd) {
        //     new rds.DatabaseInstanceReadReplica(this, `${Constants.PROJECTNAME}-rds-replica-${props.stage}`, {
        //         sourceDatabaseInstance: db,
        //         instanceType: ec2.InstanceType.of(
        //             ec2.InstanceClass.T4G,
        //             ec2.InstanceSize.MICRO
        //         ),
        //         vpc,
        //         vpcSubnets: {
        //             subnets: [privateSubnet1, privateSubnet2]
        //         },
        //
        //         publiclyAccessible: false
        //     });
        // }
    }
}