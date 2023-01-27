use borsh::{BorshDeserialize, BorshSerialize};
use solana_program::{
    account_info::{next_account_info, AccountInfo},
    entrypoint::ProgramResult,
    msg,
    program::invoke,
    program_error::ProgramError,
    pubkey::Pubkey,
    system_instruction,
    sysvar::{rent::Rent, Sysvar},
};

use crate::{
    error::DataAccountError,
    instruction::DataAccountInstruction,
    state::{DataAccountData, DataAccountState, DATA_VERSION},
};

pub struct Processor {}

impl Processor {
    pub fn process_instruction(
        program_id: &Pubkey,
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

                // create initial state for data_account data
                let account_data = DataAccountData {
                    data_type: 0,
                    data: vec![0; args.space as usize],
                };
                let account_state =
                    DataAccountState::new(true, *authority.key, DATA_VERSION, account_data);

                // create a data_account of given space
                let space = (account_state.try_to_vec()?).len();
                let rent_exemption_amount = Rent::get()?.minimum_balance(space);

                msg!("creating account with {} space", space);

                let create_account_ix = system_instruction::create_account(
                    &authority.key,
                    &data_account.key,
                    rent_exemption_amount,
                    space as u64,
                    &program_id,
                );
                invoke(
                    &create_account_ix,
                    &[
                        authority.clone(),
                        data_account.clone(),
                        system_program.clone(),
                    ],
                )?;

                msg!("account created: {:?}", data_account);

                // write to data_account data
                account_state.serialize(&mut &mut data_account.data.borrow_mut()[..])?;

                msg!(
                    "data: {:?}",
                    DataAccountState::try_from_slice(&data_account.try_borrow_data()?)?,
                );

                Ok(())
            }
            DataAccountInstruction::UpdateDataAccount(args) => {
                msg!("Instruction: UpdateDataAccount");
                let accounts_iter = &mut accounts.iter();
                let authority = next_account_info(accounts_iter)?;
                let data_account = next_account_info(accounts_iter)?;
                let system_program = next_account_info(accounts_iter)?;

                // ensure authority is signer
                if !authority.is_signer {
                    return Err(DataAccountError::NotSigner.into());
                }

                // ensure data_account is writeable
                if !data_account.is_writable {
                    return Err(DataAccountError::NotWriteable.into());
                }

                // ensure length is not 0
                if data_account.data_is_empty() {
                    return Err(DataAccountError::NoAccountLength.into());
                }

                let account_state =
                    DataAccountState::try_from_slice(&data_account.try_borrow_data()?)?;

                // ensure data_account is initialized
                if !account_state.initialized() {
                    return Err(DataAccountError::NotInitialized.into());
                }

                // ensure data_account is being written to by valid authority
                if account_state.authority() != authority.key {
                    return Err(DataAccountError::InvalidAuthority.into());
                }

                msg!("account_state: {:?}", account_state);

                let account_data = account_state.data();
                let old_len = account_data.data.len();
                let new_len = args.data.len().max(old_len);

                // update data_account with new data
                let mut new_data = vec![0; new_len];
                new_data[..args.data.len()].copy_from_slice(&args.data);
                let new_account_data = DataAccountData {
                    data_type: args.data_type,
                    data: new_data,
                };
                let new_account_state =
                    DataAccountState::new_with_account_data(account_state, new_account_data);

                // ensure account_data has enough space by reallocing if needed
                if old_len < new_len {
                    let new_space = (new_account_state.try_to_vec()?).len();
                    let new_minimum_balance = Rent::get()?.minimum_balance(new_space);
                    let lamports_diff = new_minimum_balance.saturating_sub(data_account.lamports());

                    let transfer_ix = system_instruction::transfer(
                        authority.key,
                        data_account.key,
                        lamports_diff,
                    );
                    invoke(
                        &transfer_ix,
                        &[
                            authority.clone(),
                            data_account.clone(),
                            system_program.clone(),
                        ],
                    )?;
                    data_account.realloc(new_space, false)?;

                    msg!(
                        "transferred {} and realloc-ed {} as {} < {}",
                        lamports_diff,
                        new_space,
                        old_len,
                        new_len
                    );
                }
                new_account_state.serialize(&mut &mut data_account.data.borrow_mut()[..])?;

                msg!(
                    "data: {:?}",
                    DataAccountState::try_from_slice(&data_account.try_borrow_data()?)?,
                );

                Ok(())
            }
            DataAccountInstruction::UpdateDataAccountDataType(args) => {
                msg!("Instruction: UpdateDataAccountDataType");

                let accounts_iter = &mut accounts.iter();
                let authority = next_account_info(accounts_iter)?;
                let data_account = next_account_info(accounts_iter)?;

                // ensure authority is signer
                if !authority.is_signer {
                    return Err(DataAccountError::NotSigner.into());
                }

                // ensure data_account is writeable
                if !data_account.is_writable {
                    return Err(DataAccountError::NotWriteable.into());
                }

                // ensure length is not 0
                if data_account.data_is_empty() {
                    return Err(DataAccountError::NoAccountLength.into());
                }

                let account_state =
                    DataAccountState::try_from_slice(&data_account.try_borrow_data()?)?;

                // ensure data_account is initialized
                if !account_state.initialized() {
                    return Err(DataAccountError::NotInitialized.into());
                }

                // ensure data_account is being written to by valid authority
                if account_state.authority() != authority.key {
                    return Err(DataAccountError::InvalidAuthority.into());
                }

                msg!("account_state: {:?}", account_state);

                // update data_account with new data_type
                let new_account_state =
                    DataAccountState::new_with_data_type(account_state, args.data_type);
                new_account_state.serialize(&mut &mut data_account.data.borrow_mut()[..])?;

                msg!(
                    "data: {:?}",
                    DataAccountState::try_from_slice(&data_account.try_borrow_data()?)?,
                );

                Ok(())
            }
            DataAccountInstruction::UpdateDataAccountData(args) => {
                msg!("Instruction: UpdateDataAccountData");
                let accounts_iter = &mut accounts.iter();
                let authority = next_account_info(accounts_iter)?;
                let data_account = next_account_info(accounts_iter)?;
                let system_program = next_account_info(accounts_iter)?;

                // ensure authority is signer
                if !authority.is_signer {
                    return Err(DataAccountError::NotSigner.into());
                }

                // ensure data_account is writeable
                if !data_account.is_writable {
                    return Err(DataAccountError::NotWriteable.into());
                }

                // ensure length is not 0
                if data_account.data_is_empty() {
                    return Err(DataAccountError::NoAccountLength.into());
                }

                let account_state =
                    DataAccountState::try_from_slice(&data_account.try_borrow_data()?)?;

                // ensure data_account is initialized
                if !account_state.initialized() {
                    return Err(DataAccountError::NotInitialized.into());
                }

                // ensure data_account is being written to by valid authority
                if account_state.authority() != authority.key {
                    return Err(DataAccountError::InvalidAuthority.into());
                }

                msg!("account_state: {:?}", account_state);

                let account_data = account_state.data();
                let old_len = account_data.data.len();
                let new_len = args.data.len().max(old_len);

                // update data_account with new data
                let mut new_data = vec![0; new_len];
                new_data[..args.data.len()].copy_from_slice(&args.data);
                let new_account_state = DataAccountState::new_with_data(account_state, new_data);

                // ensure account_data has enough space by reallocing if needed
                if old_len < new_len {
                    let new_space = (new_account_state.try_to_vec()?).len();
                    let new_minimum_balance = Rent::get()?.minimum_balance(new_space);
                    let lamports_diff = new_minimum_balance.saturating_sub(data_account.lamports());

                    let transfer_ix = system_instruction::transfer(
                        authority.key,
                        data_account.key,
                        lamports_diff,
                    );
                    invoke(
                        &transfer_ix,
                        &[
                            authority.clone(),
                            data_account.clone(),
                            system_program.clone(),
                        ],
                    )?;
                    data_account.realloc(new_space, false)?;

                    msg!(
                        "transferred {} and realloc-ed {} as {} < {}",
                        lamports_diff,
                        new_space,
                        old_len,
                        new_len
                    );
                }

                new_account_state.serialize(&mut &mut data_account.data.borrow_mut()[..])?;

                msg!(
                    "data: {:?}",
                    DataAccountState::try_from_slice(&data_account.try_borrow_data()?)?,
                );

                Ok(())
            }
            DataAccountInstruction::CloseAccount(_args) => {
                msg!("Instruction: RemoveAccount");

                let accounts_iter = &mut accounts.iter();
                let authority = next_account_info(accounts_iter)?;
                let data_account = next_account_info(accounts_iter)?;

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

                // ensure length is not 0
                if data_account.data_is_empty() {
                    return Err(DataAccountError::NoAccountLength.into());
                }

                let account_state =
                    DataAccountState::try_from_slice(&data_account.try_borrow_data()?)?;

                // ensure data_account is initialized
                if !account_state.initialized() {
                    return Err(DataAccountError::NotInitialized.into());
                }

                // ensure data_account is being closed by valid authority
                if account_state.authority() != authority.key {
                    return Err(DataAccountError::InvalidAuthority.into());
                }

                msg!("authority: {:?}", authority);
                msg!("data_account: {:?}", data_account);

                // transfer data_account lamports back to authority and reset data_account
                let curr_lamports = authority.lamports();
                **authority.lamports.borrow_mut() = curr_lamports
                    .checked_add(data_account.lamports())
                    .ok_or(DataAccountError::Overflow)?;
                **data_account.lamports.borrow_mut() = 0;
                data_account.data.borrow_mut().fill(0);

                msg!("transferred lamports to authority");
                msg!("authority: {:?}", authority);
                msg!("data_account: {:?}", data_account);

                Ok(())
            }
        }
    }
}
