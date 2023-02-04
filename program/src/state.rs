use borsh::{BorshDeserialize, BorshSerialize};
use shank::ShankAccount;
use solana_program::pubkey::Pubkey;

pub const DATA_VERSION: u8 = 0;

#[derive(PartialEq, Debug, Clone, BorshDeserialize, BorshSerialize)]
pub enum DataTypeOption {
    CUSTOM = 0,
    JSON = 1,
    BORSH = 2,
}

#[derive(PartialEq, Debug, Clone, BorshDeserialize, BorshSerialize)]
pub enum DataStatusOption {
    UNINITIALIZED,
    INITIALIZED,
    UPDATED,
    FINALIZED,
}

#[derive(PartialEq, Debug, Clone, BorshDeserialize, BorshSerialize)]
pub enum SerializationStatusOption {
    UNVERIFIED,
    VERIFIED,
    FAILED,
}

#[derive(Debug, Clone, BorshDeserialize, BorshSerialize)]
pub struct DataAccountData {
    pub data_type: DataTypeOption,
    pub data: Vec<u8>,
}

#[derive(Debug, Clone, BorshDeserialize, BorshSerialize, ShankAccount)]
pub struct DataAccountState {
    data_status: DataStatusOption,
    serialization_status: SerializationStatusOption,
    authority: Pubkey,
    data_version: u8,
    account_data: DataAccountData,
}

impl DataAccountState {
    /// Default constructor
    pub fn new(
        data_status: DataStatusOption,
        serialization_status: SerializationStatusOption,
        authority: Pubkey,
        data_version: u8,
        account_data: DataAccountData,
    ) -> Self {
        DataAccountState {
            data_status,
            serialization_status,
            authority,
            data_version,
            account_data,
        }
    }
    /// Constructor given account_data
    pub fn new_with_account_data(copy: Self, account_data: DataAccountData) -> Self {
        DataAccountState {
            data_status: DataStatusOption::UPDATED,
            serialization_status: SerializationStatusOption::UNVERIFIED,
            account_data,
            ..copy
        }
    }
    /// Constructor given data_type
    pub fn new_with_data_type(copy: Self, data_type: DataTypeOption) -> Self {
        DataAccountState {
            data_status: DataStatusOption::UPDATED,
            serialization_status: SerializationStatusOption::UNVERIFIED,
            account_data: DataAccountData {
                data_type,
                ..copy.account_data
            },
            ..copy
        }
    }
    /// Constructor given data
    pub fn new_with_data(copy: Self, data: Vec<u8>) -> Self {
        DataAccountState {
            data_status: DataStatusOption::UPDATED,
            serialization_status: SerializationStatusOption::UNVERIFIED,
            account_data: DataAccountData {
                data,
                ..copy.account_data
            },
            ..copy
        }
    }
    /// Set data_status
    pub fn set_data_status(&mut self, data_status: DataStatusOption) {
        self.data_status = data_status;
    }
    /// Get the data_status
    pub fn data_status(&self) -> &DataStatusOption {
        &self.data_status
    }
    /// Set serialization_status
    pub fn set_serialization_status(&mut self, serialization_status: SerializationStatusOption) {
        self.serialization_status = serialization_status;
    }
    /// Get the serialization_status
    pub fn serialization_status(&self) -> &SerializationStatusOption {
        &self.serialization_status
    }
    /// Get the authority
    pub fn authority(&self) -> &Pubkey {
        &self.authority
    }
    /// Get the current data version
    pub fn version(&self) -> u8 {
        self.data_version
    }
    /// Get the reference to data structure
    pub fn data(&self) -> &DataAccountData {
        &self.account_data
    }
    /// Get the mutable reference to data structure
    pub fn data_mut(&mut self) -> &mut DataAccountData {
        &mut self.account_data
    }
}

#[derive(Clone, BorshSerialize, BorshDeserialize)]
pub struct InitializeDataAccountArgs {
    pub space: u64,
}

#[derive(Clone, BorshSerialize, BorshDeserialize)]
pub struct UpdateDataAccountArgs {
    pub data_type: DataTypeOption,
    pub data: Vec<u8>,
}

#[derive(Clone, BorshSerialize, BorshDeserialize)]
pub struct UpdateDataAccountDataTypeArgs {
    pub data_type: DataTypeOption,
}

#[derive(Clone, BorshSerialize, BorshDeserialize)]
pub struct UpdateDataAccountDataArgs {
    pub data: Vec<u8>,
}

#[derive(Clone, BorshSerialize, BorshDeserialize)]
pub struct FinalizeDataAccountArgs {
    pub verify_flag: bool,
}

#[derive(Clone, BorshSerialize, BorshDeserialize)]
pub struct CloseDataAccountArgs {}
