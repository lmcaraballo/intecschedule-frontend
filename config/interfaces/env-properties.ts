export interface EnvProperties {
    envType?: string;
    vpc?: {
        id: string;
        name?: string;
        publicSubnet1?: string;
        publicSubnet2?: string;
        privateSubnet1?: string;
        privateSubnet2?: string;
    };

    kms: {
        arn: string;
    };
}


