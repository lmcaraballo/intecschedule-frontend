import {App, Stack} from "aws-cdk-lib";
import {AppEnvProperties, properties} from "../config/app-env-properties";
import {Constants} from "../config/constants";
import {StackProps} from "../config/interfaces/stack-properties"
import {StorageStack} from "../lib/storage/storage-stack";
import {SecurityStack} from "../lib/security/security-stack";
import {CloudfrontStack} from "../lib/distribution/cloudfront-stack";

export class AppBuilder {
    private readonly app: App;
    private readonly appProperties: AppEnvProperties;
    private readonly stacks: Map<string, Stack> = new Map();

    constructor(app: App) {
        this.app = app;

        const env = app.node.tryGetContext('env');

        if (!env) {
            throw new Error(
                `[CDK] Deployment aborted: the "env" context parameter is required but was not provided. Please run the deployment with "--context env=<environment>".`
            );
        }

        if (!properties.has(env)) {
            throw new Error(
                `[CDK] Deployment aborted: the environment "${env}" is not configured. Valid environments are: ${Array.from(properties.keys()).join(', ')}.`
            );
        }

        this.appProperties = properties.get(env) as AppEnvProperties;

        const accountId = app.node.tryGetContext('accountId');

        if (!accountId) {
            throw new Error(
                `[CDK] Deployment aborted: the "accountId" context parameter is required but was not provided. Please run the deployment with "--context accountId=<your-account-id>".`
            );
        }

        if (accountId && accountId !== this.appProperties.accountId) {
            throw new Error(
                `[CDK] Deployment aborted: the provided account ID "${accountId}" does not match the expected account ID "${this.appProperties.accountId}" for environment "${env}". Please verify your AWS credentials and context parameters before deploying.`
            );
        }
    }

    private getBaseStackProps(): StackProps {
        return {
            ...this.appProperties,
            env: {
                account: this.appProperties.accountId,
                region: this.appProperties.region
            }
        };
    }


    public addStorageStack(): this {
        const stackName: string = `${Constants.PROJECTNAME}-StorageStack-${this.appProperties.envName}`;

        if (this.stacks.has(stackName)) {
            return this;
        }

        const stack = new StorageStack(this.app, stackName, this.getBaseStackProps());

        this.stacks.set(stackName, stack);

        return this;
    }

    public addCloudfrontStack(): this {
        const stackName: string = `${Constants.PROJECTNAME}-CloudfrontStack-${this.appProperties.envName}`;

        if (this.stacks.has(stackName)) {
            return this;
        }

        const stack = new CloudfrontStack(this.app, stackName, this.getBaseStackProps());

        this.stacks.set(stackName, stack);

        return this;
    }


    public addSecurityStack(): this {
        const stackName: string = `${Constants.PROJECTNAME}-SecurityStack-${this.appProperties.envName}`;

        if (this.stacks.has(stackName)) {
            return this;
        }

        const stack = new SecurityStack(this.app, stackName, this.getBaseStackProps());

        this.stacks.set(stackName, stack);

        return this;
    }

    public build(): App {
        return this.app;
    }
}
