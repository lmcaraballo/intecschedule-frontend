import * as cdk from 'aws-cdk-lib/core';
import {Duration} from 'aws-cdk-lib/core';
import {Construct} from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as path from "node:path";
import * as fs from "node:fs";
import {Constants} from "../../config/constants";
import {StackProps} from "../../config/interfaces/stack-properties";
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';

export class ComputeStack extends cdk.Stack {
    public static readonly lambdaLayers: Record<string, any> = {
        'user_service': ['01-psycopg2-python314']
    }

    constructor(scope: Construct, id: string, props: StackProps) {
        super(scope, id, props);

        const projectPath = path.join(__dirname, '../../src/python/code');

        const services = fs.readdirSync(projectPath);

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

        const lambdaSg = ec2.SecurityGroup.fromSecurityGroupId(
            this, 'lambda-sg',
            cdk.Fn.importValue(`${Constants.PROJECTNAME}-lambda-sg-${props.stage}`)
        );

        const importedRoleArn = cdk.Fn.importValue(`${Constants.PROJECTNAME}-lambdaAuroraRoleArn-${props.envName}`);

        const role = iam.Role.fromRoleArn(this, 'ImportedLambdaAuroraRole', importedRoleArn);

        services.forEach((serviceDirName: string) => {
            const servicePath = path.join(projectPath, serviceDirName);

            if (fs.statSync(servicePath).isDirectory()) {
                if (fs.existsSync(path.join(servicePath, "app.py"))) {

                    const lambdaCode = lambda.Code.fromAsset(projectPath, {
                        exclude: services
                            .filter(s => s !== serviceDirName && s !== 'shared')
                            .flatMap(s => [s, `${s}/**`])
                    });

                    const layers = (ComputeStack.lambdaLayers[serviceDirName] || []).map((name: string) => {
                        const layerName = `${Constants.PROJECTNAME}-${name}-${props.envName}`;

                        return lambda.LayerVersion.fromLayerVersionAttributes(this, `${serviceDirName}-${name}`, {
                            layerVersionArn: `arn:aws:lambda:${this.region}:${this.account}:layer:${layerName}:1`,
                            compatibleRuntimes: [lambda.Runtime.PYTHON_3_14]
                        });

                    });

                    const lambdaFunction = new lambda.Function(this, `${Constants.PROJECTNAME}-${serviceDirName}-${props.envName}`, {
                        handler: `${serviceDirName}.app.handler`,
                        runtime: lambda.Runtime.PYTHON_3_14,
                        code: lambdaCode,
                        role: role,
                        architecture: lambda.Architecture.ARM_64,
                        memorySize: 256,
                        layers: layers,
                        timeout: Duration.seconds(30),
                        functionName: `${Constants.PROJECTNAME}-${serviceDirName}-${props.envName}`,
                        vpc: vpc,
                        securityGroups: [lambdaSg],
                        vpcSubnets: {
                            subnets: [privateSubnet1, privateSubnet2]
                        },
                        environment: {
                            'ENVIRONMENT': props.envName.toUpperCase()
                        },
                    });

                    lambdaFunction.addPermission(`${serviceDirName}-ApiGatewayInvoke`, {
                        principal: new iam.ServicePrincipal('apigateway.amazonaws.com'),
                        action: 'lambda:InvokeFunction',
                        sourceArn: cdk.Fn.importValue(`${Constants.PROJECTNAME}-apiArn-${props.envName}`),
                    });
                }
            }
        });
    }
}
