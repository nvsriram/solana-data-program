export interface IDataAccountData {
    data_type: number;
    data?: {
        len: number;
        data: Buffer;
    };
};
    
export interface IDataAccountState {
    is_initialized: boolean;
    authority: string;
    data_version: number;
    account_data: IDataAccountData;
};