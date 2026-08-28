import {AppEnvProperties} from "./app-env-properties";

export const proProperties: AppEnvProperties = {
    accountId: '',
    region: 'us-east-1',
    envName: 'pro',
    stage: 'prod',
    certificateArn: '',
    vpc: {
        id: '',
        name: '',
        publicSubnet1: '',
        publicSubnet2: '',
        privateSubnet1: '',
        privateSubnet2: ''
    },

    kms: {
        arn: ''
    }
}