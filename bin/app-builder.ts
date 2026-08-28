import {App, Stack} from "aws-cdk-lib";
import {AppEnvProperties, properties} from "../config/app-env-properties";
import {ComputeStack} from "../lib/compute/compute-stack";
import {Constants} from "../config/constants";
import {LayersStack} from "../lib/compute/layers-stack";
import {NetworkingStack} from "../lib/networking/networking-stack";
import {StackProps} from "../config/interfaces/stack-properties"
import {IntegrationStack} from "../lib/integration/integration-stack";
import {AuthorizationStack} from "../lib/authorization/authorization-stack";
import {StorageStack} from "../lib/storage/storage-stack";
import {RdsStack} from "../lib/database/rds-stack";
import {SecurityStack} from "../lib/security/security-stack";

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

    public addNetworkingStack(): this {
        const stackName: string = `${Constants.PROJECTNAME}-NetworkingStack-${this.appProperties.stage}`;

        if (this.stacks.has(stackName)) {
            return this;
        }

        const stack = new NetworkingStack(this.app, stackName, this.getBaseStackProps());

        this.stacks.set(stackName, stack);

        return this;
    }

    public addComputeStack(): this {
        const stackName: string = `${Constants.PROJECTNAME}-ComputeStack-${this.appProperties.envName}`;

        if (this.stacks.has(stackName)) {
            return this;
        }

        const stack = new ComputeStack(this.app, stackName, this.getBaseStackProps());

        this.stacks.set(stackName, stack);

        return this;
    }

    public addIntegrationStack(): this {
        const stackName: string = `${Constants.PROJECTNAME}-IntegrationStack-${this.appProperties.envName}`;

        if (this.stacks.has(stackName)) {
            return this;
        }

        const stack = new IntegrationStack(this.app, stackName, this.getBaseStackProps());

        this.stacks.set(stackName, stack);

        return this;
    }

    public addLayersStack(): this {
        const stackName: string = `${Constants.PROJECTNAME}-LayersStack-${this.appProperties.envName}`;

        if (this.stacks.has(stackName)) {
            return this;
        }

        const stack = new LayersStack(this.app, stackName, this.getBaseStackProps());

        this.stacks.set(stackName, stack);

        return this;
    }

    public addAuthorizationStack(): this {
        const stackName: string = `${Constants.PROJECTNAME}-AuthorizationStack-${this.appProperties.envName}`;

        if (this.stacks.has(stackName)) {
            return this;
        }

        const stack = new AuthorizationStack(this.app, stackName, this.getBaseStackProps());

        this.stacks.set(stackName, stack);

        return this;
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

    public addRdsStack(): this {
        const stackName: string = `${Constants.PROJECTNAME}-RdsStack-${this.appProperties.stage}`;

        if (this.stacks.has(stackName)) {
            return this;
        }

        const stack = new RdsStack(this.app, stackName, this.getBaseStackProps());

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