enum DataStatusOption {
    UNINITIALIZED,
    INITIALIZED,
    UPDATED,
    FINALIZED,
}

export interface IDataAccountData {
    data_type: number;
    data?: {
        len: number;
        data: Buffer;
    };
};
    
export interface IDataAccountState {
    status: DataStatusOption;
    authority: string;
    data_version: number;
    account_data: IDataAccountData;
};