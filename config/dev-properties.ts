import {AppEnvProperties} from "./app-env-properties";

export const devProperties: AppEnvProperties = {
    accountId: '357871639512',
    region: 'us-east-1',
    envName: 'dev',
    stage: 'noprod',
    certificateArn: 'arn:aws:acm:us-east-1:357871639512:certificate/071b9782-eb4f-426b-96fb-df7fba401816',
    vpc: {
        id: 'vpc-05e93b8d0d196dcec',
        name: 'bnbdo-vpc-noprod',
        publicSubnet1: 'subnet-0632996232fc6a05c',
        publicSubnet2: 'subnet-0651fb87bec514a6b',
        privateSubnet1: 'subnet-050ec9e73af496304',
        privateSubnet2: 'subnet-051aadff3be1698ef'
    },

    kms: {
        arn: ''
    }
}