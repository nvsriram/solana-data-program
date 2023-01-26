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
    /// Constructor
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
pub struct UpdateDataAccountTypeArgs {
    pub data_type: u8,
}

#[derive(Clone, BorshSerialize, BorshDeserialize)]
pub struct UpdateDataAccountDataArgs {
    pub data: Vec<u8>,
}

#[derive(Clone, BorshSerialize, BorshDeserialize)]
pub struct RemoveAccountArgs {}
