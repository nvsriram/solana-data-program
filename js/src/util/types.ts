export enum DataStatusOption {
  UNINITIALIZED,
  INITIALIZED,
  FINALIZED,
}

export enum SerializationStatusOption {
  UNVERIFIED,
  VERIFIED,
  FAILED,
}

export enum DataTypeOption {
  CUSTOM = 0,
  JSON = 1,
  IMG = 2,
  HTML = 3,
}

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
