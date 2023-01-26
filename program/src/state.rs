use borsh::{BorshDeserialize, BorshSerialize};
use shank::ShankAccount;
use solana_program::pubkey::Pubkey;

pub const METADATA_LENGTH: u64 = 11;

#[derive(Debug, Clone, BorshDeserialize, BorshSerialize)]
pub struct DataAccountData {
    pub data_type: u8,
    pub data: Vec<u8>,
}

#[derive(Debug, Clone, BorshDeserialize, BorshSerialize, ShankAccount)]
pub struct DataAccountState {
    is_initialized: bool,
    authority: Pubkey,
    data_version: u8,
    account_data: DataAccountData,
}

impl DataAccountState {
    /// Default constructor
    pub fn new(
        is_initialized: bool,
        authority: Pubkey,
        data_version: u8,
        account_data: DataAccountData,
    ) -> Self {
        DataAccountState {
            is_initialized,
            authority,
            data_version,
            account_data,
        }
    }
    /// Constructor given account_data
    pub fn new_with_account_data(copy: Self, account_data: DataAccountData) -> Self {
        DataAccountState {
            account_data,
            ..copy
        }
    }
    /// Constructor given data_type
    pub fn new_with_data_type(copy: Self, data_type: u8) -> Self {
        DataAccountState {
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
            account_data: DataAccountData {
                data,
                ..copy.account_data
            },
            ..copy
        }
    }
    /// Signal initialized
    pub fn set_initialized(&mut self) {
        self.is_initialized = true;
    }
    /// Signal uninitialized
    pub fn reset_initialized(&mut self) {
        self.is_initialized = false;
    }
    /// Get the initialized flag
    pub fn initialized(&self) -> bool {
        self.is_initialized
    }
    /// Get the authority
    pub fn authority(&self) -> &Pubkey {
        &self.authority
    }
    /// Gets the current data version
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
    pub data_type: u8,
    pub data: Vec<u8>,
}

#[derive(Clone, BorshSerialize, BorshDeserialize)]
pub struct UpdateDataAccountDataTypeArgs {
    pub data_type: u8,
}

#[derive(Clone, BorshSerialize, BorshDeserialize)]
pub struct UpdateDataAccountDataArgs {
    pub data: Vec<u8>,
}

#[derive(Clone, BorshSerialize, BorshDeserialize)]
pub struct RemoveAccountArgs {}
