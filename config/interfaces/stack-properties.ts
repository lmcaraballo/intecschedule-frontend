import * as cdk from 'aws-cdk-lib/core';
import {AppEnvProperties} from "../app-env-properties";

export interface StackProps extends cdk.StackProps, AppEnvProperties {}