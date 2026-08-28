import {AppEnvProperties} from "./app-env-properties";

export const preProperties: AppEnvProperties = {
    accountId: '',
    region: 'us-east-1',
    envName: 'pre',
    stage: 'noprod',
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