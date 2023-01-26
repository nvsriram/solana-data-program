use borsh::{maybestd::io::ErrorKind, BorshDeserialize, BorshSerialize};
use shank::ShankAccount;
use std::mem::size_of;

pub const METADATA_LENGTH: u64 = size_of::<DataAccountState>() as u64;

#[derive(Debug, Clone, BorshSerialize, PartialEq, Eq)]
pub struct DataAccountData {
    pub data_type: u8,
    pub data: Vec<u8>,
}

impl BorshDeserialize for DataAccountData {
    #[inline]
    fn deserialize(buf: &mut &[u8]) -> Result<Self, std::io::Error> {
        solana_program::msg!("Deserializing DataAccountData");
        let data_type = u8::deserialize(buf).map_err(|_| ErrorKind::Unsupported)?;
        solana_program::msg!("Data Type: {}", data_type);

        let len = u32::deserialize(buf).map_err(|_| ErrorKind::Unsupported)?;
        solana_program::msg!("Len: {}", data_type);

        if len == 0 {
            let capacity = buf.len();
            *buf = &buf[buf.len()..];
            Ok(DataAccountData {
                data_type,
                data: vec![0; capacity],
            })
        } else {
            // TODO(16): return capacity allocation when we can safely do that.
            let data = buf.to_vec().clone();
            Ok(DataAccountData { data_type, data })
        }
    }
}

#[derive(Debug, Clone, BorshDeserialize, BorshSerialize, ShankAccount)]
pub struct DataAccountState {
    is_initialized: bool,
    data_version: u8,
    account_data: DataAccountData,
}

impl DataAccountState {
    /// Constructor
    pub fn new(is_initialized: bool, data_version: u8, account_data: DataAccountData) -> Self {
        DataAccountState {
            is_initialized,
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
