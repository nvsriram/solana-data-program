use borsh::{BorshDeserialize, BorshSerialize};
use serde_json::Value;
use shank::ShankAccount;
use solana_program::pubkey::Pubkey;

pub const DATA_VERSION: u8 = 0;

#[derive(PartialEq, Debug, Clone, BorshDeserialize, BorshSerialize)]
pub enum DataTypeOption {
    CUSTOM = 0,
    JSON = 1,
}

#[derive(PartialEq, Debug, Clone, BorshDeserialize, BorshSerialize)]
pub enum DataStatusOption {
    UNINITIALIZED,
    INITIALIZED,
    UPDATED,
    COMMITTED,
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

impl DataAccountData {
    /// Verfies that the data conforms to the data_type
    pub fn verify(&self) -> SerializationStatusOption {
        if self.data.is_empty() || self.data_type == DataTypeOption::CUSTOM {
            return SerializationStatusOption::UNVERIFIED;
        }
        let data = &self.data;
        match self.data_type {
            DataTypeOption::JSON => {
                let deserialized: Result<Value, serde_json::Error> = serde_json::from_slice(&data);
                if deserialized.is_err() {
                    SerializationStatusOption::FAILED
                } else {
                    SerializationStatusOption::VERIFIED
                }
            }
            _ => SerializationStatusOption::FAILED,
        }
    }
}

#[derive(Debug, Clone, BorshDeserialize, BorshSerialize, ShankAccount)]
pub struct DataAccountState {
    data_status: DataStatusOption,
    serialization_status: SerializationStatusOption,
    authority: Pubkey,
    is_dynamic: bool,
    data_version: u8,
    account_data: DataAccountData,
}

impl DataAccountState {
    /// Default constructor
    pub fn new(
        data_status: DataStatusOption,
        serialization_status: SerializationStatusOption,
        authority: Pubkey,
        is_dynamic: bool,
        data_version: u8,
        account_data: DataAccountData,
    ) -> Self {
        DataAccountState {
            data_status,
            serialization_status,
            authority,
            is_dynamic,
            data_version,
            account_data,
        }
    }
    /// Constructor given account_data
    pub fn new_with_account_data(
        copy: Self,
        account_data: DataAccountData,
        commit_flag: bool,
        verify_flag: bool,
    ) -> Self {
        DataAccountState {
            data_status: if commit_flag {
                DataStatusOption::COMMITTED
            } else {
                DataStatusOption::UPDATED
            },
            serialization_status: if commit_flag && verify_flag {
                account_data.verify()
            } else if !commit_flag {
                copy.serialization_status
            } else {
                SerializationStatusOption::UNVERIFIED
            },
            account_data,
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
    /// Get the dynamic flag
    pub fn dynamic(&self) -> bool {
        self.is_dynamic
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
    pub authority: Pubkey,
    pub space: u64,
    pub is_dynamic: bool,
}

#[derive(Clone, BorshSerialize, BorshDeserialize)]
pub struct UpdateDataAccountArgs {
    pub data_type: DataTypeOption,
    pub data: Vec<u8>,
    pub offset: u64,
    pub remove_remaining: bool,
    pub commit_flag: bool,
    pub verify_flag: bool,
}

#[derive(Clone, BorshSerialize, BorshDeserialize)]
pub struct CloseDataAccountArgs {}
