enum DataStatusOption {
    UNINITIALIZED,
    INITIALIZED,
    UPDATED,
    FINALIZED,
}

enum SerializationStatusOption {
    UNVERIFIED,
    VERIFIED,
    FAILED,
}

export enum DataTypeOption {
    CUSTOM = 0,
    JSON = 1,
    IMG = 2
}

export interface IDataAccountDataLegacy {
    data_type: number;
    data?: {
        len: number;
        data: Buffer;
    };
};
    
export interface IDataAccountStateLegacy {
    data_status: DataStatusOption;
    serialization_status: SerializationStatusOption;
    authority: string;
    is_dynamic: boolean;
    data_version: number;
    account_data: IDataAccountDataLegacy;
};

export interface IDataAccountMeta {
    data_status: DataStatusOption;
    serialization_status: SerializationStatusOption;
    authority: string;
    is_dynamic: boolean;
    data_version: number;
    data_type: number;
    bump_seed: number;
}

export interface IDataAccount {
    meta: IDataAccountMeta;
    data?: Buffer;
}