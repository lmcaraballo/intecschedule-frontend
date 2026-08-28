import * as cdk from "aws-cdk-lib";
import {Construct} from "constructs";
import {StackProps} from "../../config/interfaces/stack-properties";

export class SecurityStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props: StackProps) {
        super(scope, id, props);


    }
}