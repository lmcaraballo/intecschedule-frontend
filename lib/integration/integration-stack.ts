import * as cdk from "aws-cdk-lib";
import {Construct} from "constructs";
import {StackProps} from "../../config/interfaces/stack-properties";
import * as apigateway from 'aws-cdk-lib/aws-apigateway'
import * as acm from 'aws-cdk-lib/aws-certificatemanager'
import {Constants} from "../../config/constants";
import path from "node:path";

export class IntegrationStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props: StackProps) {
        super(scope, id, props);

        const api = new apigateway.SpecRestApi(this, `${Constants.PROJECTNAME}-bnbdo-${props.envName}`, {
            apiDefinition: apigateway.ApiDefinition.fromAsset(path.join(__dirname, '../../src/api-contracts/openapi/openapi.bundled.yaml')),
            description: 'REST API for an application that manages property rentals and tenants.',
            restApiName: `${Constants.PROJECTNAME}-${props.envName}`,
            domainName: {
                domainName: `api.${props.envName}.bnbdo.com`,
                certificate: acm.Certificate.fromCertificateArn(
                    this,
                    'ApiCertificate',
                    props.certificateArn
                )
            },
            deployOptions: {
                stageName: props.envName,
                loggingLevel: apigateway.MethodLoggingLevel.ERROR,
                metricsEnabled: true
            },
            cloudWatchRole: true
        });

        const cfnStage = api.deploymentStage.node.defaultChild as apigateway.CfnStage;
        cfnStage.variables = {
            projectName: Constants.PROJECTNAME,
            apiStage: props.envName,
        };

        const apiKey = new apigateway.ApiKey(this, 'BnbdoApiKey', {
            apiKeyName: `${Constants.PROJECTNAME}-api-key-${props.envName}`,
            description: `bnbdo Api Key for environment: ${props.envName}`,
            enabled: true,
        });

        const usagePlan = new apigateway.UsagePlan(this, 'BnbdoUsagePlan', {
            name: `${Constants.PROJECTNAME}-usage-plan-${props.envName}`,
            description: `Usage Plan for bnbdo, environment: ${props.envName}`,
            apiStages: [
                {
                    api: api,
                    stage: api.deploymentStage,
                },

            ],
        });

        usagePlan.addApiKey(apiKey);

        new cdk.CfnOutput(this, 'ApiExecuteArn', {
            value: api.arnForExecuteApi(),
            exportName: `${Constants.PROJECTNAME}-apiArn-${props.envName}`,
        });

    }
}

// todo -> crear el cognito authorizer.
