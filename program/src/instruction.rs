use borsh::{BorshDeserialize, BorshSerialize};
use shank::ShankInstruction;

use crate::state::{
    CloseAccountArgs, FinalizeAccountArgs, InitializeDataAccountArgs, UpdateDataAccountArgs,
    UpdateDataAccountDataArgs, UpdateDataAccountDataTypeArgs,
};

/// Instructions supported by the Data program.
#[derive(BorshSerialize, BorshDeserialize, Clone, ShankInstruction)]
pub enum DataAccountInstruction {
    /// This instruction initializes a data account that is accessible by the authority.
    /// If a data account was already initialized for given user, it returns Error
    #[account(0, signer, writable, name = "authority", desc = "Authority account")]
    #[account(1, signer, writable, name = "data", desc = "Data account")]
    #[account(2, name = "system_program", desc = "System program")]
    InitializeDataAccount(InitializeDataAccountArgs),

    /// This instruction updates the data of the data account corresponding to the authority
    /// Requires data account to be initialized previously
    #[account(0, signer, writable, name = "authority", desc = "Authority account")]
    #[account(1, signer, writable, name = "data", desc = "Data account")]
    #[account(2, name = "system_program", desc = "System program")]
    UpdateDataAccount(UpdateDataAccountArgs),

    /// This instruction updates the data type of the data account corresponding to the authority
    /// Requires data account to be initialized previously
    #[account(0, signer, name = "authority", desc = "Authority account")]
    #[account(1, writable, name = "data", desc = "Data account")]
    UpdateDataAccountDataType(UpdateDataAccountDataTypeArgs),

    /// This instruction updates the data stored in the data account corresponding to the authority
    /// Requires data account to be initialized previously
    #[account(0, signer, writable, name = "authority", desc = "Authority account")]
    #[account(1, signer, writable, name = "data", desc = "Data account")]
    #[account(2, name = "system_program", desc = "System program")]
    UpdateDataAccountData(UpdateDataAccountDataArgs),

    /// This instruction updates the data type of the data account corresponding to the authority
    /// Requires data account to be initialized previously
    #[account(0, signer, name = "authority", desc = "Authority account")]
    #[account(1, writable, name = "data", desc = "Data account")]
    FinalizeAccount(FinalizeAccountArgs),

    /// This instruction unlinks the data account corresponding to the authority
    /// Requires data account to be initialized previously
    #[account(0, writable, name = "authority", desc = "Authority account")]
    #[account(1, signer, writable, name = "data", desc = "Data account")]
    CloseAccount(CloseAccountArgs),
}
