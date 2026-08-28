import {AppBuilder} from "./app-builder";
import * as cdk from 'aws-cdk-lib';

const builder = new AppBuilder(new cdk.App())

const app = builder
    .addCloudfrontStack()
    .addStorageStack()
    .addSecurityStack()
    .build();