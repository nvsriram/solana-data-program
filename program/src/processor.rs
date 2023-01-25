use borsh::{BorshDeserialize, BorshSerialize};
use solana_program::{
    account_info::{next_account_info, AccountInfo},
    entrypoint::ProgramResult,
    msg,
    program::invoke,
    program_error::ProgramError,
    pubkey::Pubkey,
    system_instruction,
    system_program::ID as SYSTEM_PROGRAM_ID,
    sysvar::{rent::Rent, Sysvar},
};

use crate::{
    error::DataAccountError,
    instruction::DataAccountInstruction,
    state::{DataAccountData, DataAccountState, METADATA_LENGTH},
};

pub struct Processor {}

impl Processor {
    pub fn process_instruction(
        _program_id: &Pubkey,
        accounts: &[AccountInfo],
        instruction_data: &[u8],
    ) -> ProgramResult {
        let instruction = DataAccountInstruction::try_from_slice(instruction_data)
            .map_err(|_| ProgramError::InvalidInstructionData)?;

        match instruction {
            DataAccountInstruction::InitializeDataAccount(args) => {
                msg!("Instruction: InitializeDataAccount");

                let accounts_iter = &mut accounts.iter();
                let authority = next_account_info(accounts_iter)?;
                let data_account = next_account_info(accounts_iter)?;
                let system_program = next_account_info(accounts_iter)?;

                // ensure authority is signer
                if !authority.is_signer {
                    return Err(DataAccountError::NotSigner.into());
                }

                // ensure authority is writeable
                if !authority.is_writable {
                    return Err(DataAccountError::NotWriteable.into());
                }

                // ensure data_account is signer
                if !data_account.is_signer {
                    return Err(DataAccountError::NotSigner.into());
                }

                // ensure data_account is writeable
                if !data_account.is_writable {
                    return Err(DataAccountError::NotWriteable.into());
                }

                msg!("signer and writable checks passed");

                if !data_account.data_is_empty() {
                    let account_state =
                        DataAccountState::try_from_slice(&data_account.try_borrow_data()?)?;

                    // ensure data_account is not initialized
                    if account_state.initialized() {
                        return Err(DataAccountError::AlreadyInitialized.into());
                    }

                    msg!("account_state: {} initialized", account_state.initialized());
                }

                // ensure system program is valid
                if *system_program.key != SYSTEM_PROGRAM_ID {
                    return Err(DataAccountError::InvalidSysProgram.into());
                }

                // create initial state for data_account data
                let account_data = DataAccountData {
                    data_type: 0,
                    data: vec![0; args.space as usize],
                };
                let account_state = DataAccountState::new(true, 1, account_data);

                // create a data_account of given space
                let space = (account_state.try_to_vec()?).len();
                let rent_exemption_amount = Rent::get()?.minimum_balance(space);

                msg!(
                    "creating account with {} space and {} rent for metadata {}",
                    space,
                    rent_exemption_amount,
                    METADATA_LENGTH
                );

                msg!("account currently: {:?}", data_account);

                let create_account_ix = system_instruction::create_account(
                    &authority.key,
                    &data_account.key,
                    rent_exemption_amount,
                    space as u64,
                    &authority.key,
                );
                msg!("account created!");

                invoke(
                    &create_account_ix,
                    &[
                        authority.clone(),
                        data_account.clone(),
                        system_program.clone(),
                    ],
                )?;

                msg!("account invoked! {:?}", data_account);

                // write to data_account data
                account_state.serialize(&mut &mut data_account.data.borrow_mut()[..])?;

                msg!("account now: {:?}", data_account);
                msg!(
                    "data_account: {:?} initialized successfully!",
                    DataAccountState::try_from_slice(&data_account.try_borrow_data()?)?,
                );

                Ok(())
            }
            DataAccountInstruction::UpdateDataAccount(args) => {
                msg!("Instruction: UpdateDataAccount");
                let accounts_iter = &mut accounts.iter();
                let authority = next_account_info(accounts_iter)?;
                let data_account = next_account_info(accounts_iter)?;

                // ensure authority is signer
                if !authority.is_signer {
                    return Err(DataAccountError::NotSigner.into());
                }

                // ensure data_account is being written to by valid authority
                if data_account.owner != authority.key {
                    return Err(DataAccountError::InvalidSysProgram.into());
                }

                // ensure data_account is writeable
                if !data_account.is_writable {
                    return Err(DataAccountError::NotWriteable.into());
                }

                // ensure length is not 0
                if data_account.data_is_empty() {
                    return Err(DataAccountError::NoAccountLength.into());
                }

                // ensure data_account has enough space
                if data_account.data_len() < args.data.len() {
                    return Err(DataAccountError::NoAccountLength.into());
                }

                let mut account_state =
                    DataAccountState::try_from_slice(&data_account.try_borrow_mut_data()?)?;

                // ensure data_account is initialized
                if !account_state.initialized() {
                    return Err(DataAccountError::NotInitialized.into());
                }

                // update data_account data_type and data
                let account_data = account_state.data_mut();
                account_data.data_type = args.data_type;
                account_data.data.copy_from_slice(&args.data);

                Ok(())
            }
            DataAccountInstruction::UpdateDataAccountType(args) => {
                msg!("Instruction: UpdateDataAccountType");

                let accounts_iter = &mut accounts.iter();
                let authority = next_account_info(accounts_iter)?;
                let data_account = next_account_info(accounts_iter)?;

                // ensure authority is signer
                if !authority.is_signer {
                    return Err(DataAccountError::NotSigner.into());
                }

                // ensure data_account is being written to by valid authority
                if data_account.owner != authority.key {
                    return Err(DataAccountError::InvalidSysProgram.into());
                }

                // ensure data_account is writeable
                if !data_account.is_writable {
                    return Err(DataAccountError::NotWriteable.into());
                }

                // ensure length is not 0
                if data_account.data_is_empty() {
                    return Err(DataAccountError::NoAccountLength.into());
                }

                let mut account_state =
                    DataAccountState::try_from_slice(&data_account.try_borrow_mut_data()?)?;

                // ensure data_account is initialized
                if !account_state.initialized() {
                    return Err(DataAccountError::NotInitialized.into());
                }

                // update data_account data_type
                let account_data = account_state.data_mut();
                account_data.data_type = args.data_type;

                Ok(())
            }
            DataAccountInstruction::UpdateDataAccountData(args) => {
                msg!("Instruction: UpdateDataAccountData");
                let accounts_iter = &mut accounts.iter();
                let authority = next_account_info(accounts_iter)?;
                let data_account = next_account_info(accounts_iter)?;

                // ensure authority is signer
                if !authority.is_signer {
                    return Err(DataAccountError::NotSigner.into());
                }

                // ensure data_account is being written to by valid authority
                if data_account.owner != authority.key {
                    return Err(DataAccountError::InvalidSysProgram.into());
                }

                // ensure data_account is writeable
                if !data_account.is_writable {
                    return Err(DataAccountError::NotWriteable.into());
                }

                // ensure length is not 0
                if data_account.data_is_empty() {
                    return Err(DataAccountError::NoAccountLength.into());
                }

                // ensure data_account has enough space
                if data_account.data_len() < args.data.len() {
                    return Err(DataAccountError::NoAccountLength.into());
                }

                let mut account_state =
                    DataAccountState::try_from_slice(&data_account.try_borrow_mut_data()?)?;

                // ensure data_account is initialized
                if !account_state.initialized() {
                    return Err(DataAccountError::NotInitialized.into());
                }

                // update data_account data
                let account_data = account_state.data_mut();
                account_data.data.copy_from_slice(&args.data);

                Ok(())
            }
            DataAccountInstruction::RemoveAccount(_args) => {
                msg!("Instruction: RemoveAccount");

                let accounts_iter = &mut accounts.iter();
                let authority = next_account_info(accounts_iter)?;
                let data_account = next_account_info(accounts_iter)?;
                let system_program = next_account_info(accounts_iter)?;

                // ensure authority is writeable
                if !authority.is_writable {
                    return Err(DataAccountError::NotWriteable.into());
                }

                // ensure data_account is signer
                if !data_account.is_signer {
                    return Err(DataAccountError::NotSigner.into());
                }

                // ensure data_account is writeable
                if !data_account.is_writable {
                    return Err(DataAccountError::NotWriteable.into());
                }

                // ensure data_account is being removed by valid authority
                if data_account.owner != authority.key {
                    return Err(DataAccountError::InvalidSysProgram.into());
                }

                // ensure system program is valid
                if *system_program.key != SYSTEM_PROGRAM_ID {
                    return Err(DataAccountError::InvalidSysProgram.into());
                }

                // transfer data_account lamports back to authority
                let transfer_ix = system_instruction::transfer(
                    &data_account.key,
                    &authority.key,
                    data_account.lamports(),
                );

                invoke(
                    &transfer_ix,
                    &[
                        data_account.clone(),
                        authority.clone(),
                        system_program.clone(),
                    ],
                )?;

                // zero out data_account.data
                let mut data_account_data = data_account.try_borrow_mut_data()?;
                data_account_data.fill(0);

                Ok(())
            }
        }
    }
}
