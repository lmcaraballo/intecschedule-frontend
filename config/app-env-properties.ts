import {EnvProperties} from "./interfaces/env-properties";
import {devProperties} from "./dev-properties";
import {preProperties} from "./pre-properties";
import {proProperties} from "./pro-properties";

export interface AppEnvProperties extends EnvProperties {
    accountId: string;
    region: string;
    envName: string;
    stage: string;
    certificateArn: string,
    vpc?: {
        id: string,
        name: string,
        privateSubnet1: string,
        privateSubnet2: string,
        publicSubnet1: string,
        publicSubnet2: string
    };
    vpcDR?: {
        id: string,
        name: string,
        availabilityZones: string[],
        privateSubnet1: string,
        privateSubnet2: string,
        publicSubnet1: string,
        publicSubnet2: string
    };
}

export const properties: Map<string, any> = new Map<string, any>([
    ['dev', devProperties],
    ['pre', preProperties],
    ['pro', proProperties]
]);