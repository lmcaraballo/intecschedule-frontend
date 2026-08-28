import * as cdk from "aws-cdk-lib";
import * as ssm from 'aws-cdk-lib/aws-ssm';
import {Construct} from "constructs";
import {StackProps} from "../../config/interfaces/stack-properties";

export class SecurityStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props: StackProps) {
        super(scope, id, props);

        new ssm.StringParameter(this, 'ApiKeyParameter', {
            parameterName: `/bnbdo/${props.envName}/api-key`,
            stringValue: '-',
            description: `API Key for bnbdo (${props.envName})`,
            tier: ssm.ParameterTier.STANDARD,
        });

    }
}