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
    BORSH = 2,
}

export interface IDataAccountData {
    data_type: number;
    data?: {
        len: number;
        data: Buffer;
    };
};
    
export interface IDataAccountState {
    data_status: DataStatusOption;
    serialization_status: SerializationStatusOption;
    authority: string;
    data_version: number;
    account_data: IDataAccountData;
};