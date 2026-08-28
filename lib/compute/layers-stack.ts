import * as cdk from 'aws-cdk-lib'
import {Construct} from "constructs";
import {StackProps} from "../../config/interfaces/stack-properties";
import * as lambda from 'aws-cdk-lib/aws-lambda'
import {Constants} from "../../config/constants";
import * as path from "node:path";

const LAYERS_PATH: string = 'src/python/layers'

export class LayersStack extends cdk.Stack {

    public static readonly layers: Array<Record<string, any>> = [
        {
            'name': '01-psycopg2-python314',
            'description': 'Layer for Psycopg2 in AWS Lambdas Python',
            'compatibleRuntimes': [lambda.Runtime.PYTHON_3_14]
        }
    ]


    constructor(scope: Construct, id: string, props: StackProps) {
        super(scope, id, props);

        for (const layer of LayersStack.layers) {

            const fullLayerName: string = `${Constants.PROJECTNAME}-${layer["name"]}-${props.envName}`

            const layerVersion = new lambda.LayerVersion(this, layer['name'], {
                compatibleRuntimes: layer["compatibleRuntimes"],
                description: layer["description"],
                layerVersionName: fullLayerName,
                code: lambda.Code.fromAsset(path.resolve(__dirname, '../../', LAYERS_PATH))
            })

            const exportName = `${this.stackName}-${layer["name"]}-lambda-layer`

            new cdk.CfnOutput(this, exportName, {
                value: layerVersion.layerVersionArn,
                description: layer["description"],
                exportName: exportName,
            })
        }
    }
}