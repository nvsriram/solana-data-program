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
    state::{
        DataAccountData, DataAccountState, DataStatusOption, DataTypeOption,
        SerializationStatusOption, DATA_VERSION, METADATA_SIZE,
    },
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
                msg!("InitializeDataAccount");

                let accounts_iter = &mut accounts.iter();
                let authority = next_account_info(accounts_iter)?;
                let data_account = next_account_info(accounts_iter)?;
                let system_program = next_account_info(accounts_iter)?;

                // create initial state for data_account data
                let account_data = DataAccountData {
                    data_type: DataTypeOption::CUSTOM,
                    data: vec![0; args.space as usize],
                };
                let account_state = DataAccountState::new(
                    DataStatusOption::INITIALIZED,
                    SerializationStatusOption::UNVERIFIED,
                    args.authority,
                    args.is_dynamic,
                    DATA_VERSION,
                    account_data,
                );

                // create a data_account of given space
                let space = METADATA_SIZE + args.space as usize;
                let rent_exemption_amount = Rent::get()?.minimum_balance(space);

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
                // write to data_account data
                account_state.serialize(&mut &mut data_account.data.borrow_mut()[..])?;

                Ok(())
            }
            DataAccountInstruction::UpdateDataAccount(args) => {
                msg!("UpdateDataAccount");

                let accounts_iter = &mut accounts.iter();
                let authority = next_account_info(accounts_iter)?;
                let data_account = next_account_info(accounts_iter)?;
                let system_program = next_account_info(accounts_iter)?;

                // ensure authority and data_account are signer
                if !authority.is_signer || !data_account.is_signer {
                    return Err(DataAccountError::NotSigner.into());
                }

                // ensure authority and data_account are writable
                if !authority.is_writable || !data_account.is_writable {
                    return Err(DataAccountError::NotWriteable.into());
                }

                // ensure length is not 0
                if data_account.data_is_empty() {
                    return Err(DataAccountError::NoAccountLength.into());
                }

                let mut account_state =
                    DataAccountState::try_from_slice(&data_account.try_borrow_data()?)?;

                // ensure data_account is initialized
                if *account_state.data_status() == DataStatusOption::UNINITIALIZED {
                    return Err(DataAccountError::NotInitialized.into());
                }

                // ensure data_account is being written to by valid authority
                if account_state.authority() != authority.key {
                    return Err(DataAccountError::InvalidAuthority.into());
                }

                let old_len = account_state.data().data.len();
                let end_len = args.offset as usize + args.data.len();

                // ensure static data_account has sufficient space
                if !account_state.dynamic() && old_len < end_len {
                    return Err(DataAccountError::InsufficientSpace.into());
                }

                let new_len = if !account_state.dynamic() {
                    old_len
                } else if args.realloc_down {
                    end_len
                } else {
                    old_len.max(end_len)
                };

                // ensure account_data has enough space by reallocing if needed
                if old_len != new_len {
                    let new_space = METADATA_SIZE + new_len;
                    let new_minimum_balance = Rent::get()?.minimum_balance(new_space);
                    let lamports_diff = if old_len < new_len {
                        new_minimum_balance.saturating_sub(data_account.lamports())
                    } else {
                        data_account.lamports().saturating_sub(new_minimum_balance)
                    };

                    if old_len < new_len {
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
                    } else {
                        let authority_lamports = authority.lamports();
                        **authority.lamports.borrow_mut() = authority_lamports
                            .checked_add(lamports_diff)
                            .ok_or(DataAccountError::Overflow)?;
                        **data_account.lamports.borrow_mut() = new_minimum_balance;
                    }

                    data_account.realloc(new_space, false)?;
                }
                account_state.data_mut().data_type = args.data_type;
                account_state.data_mut().data.resize(new_len, 0);
                account_state.data_mut().data[args.offset as usize..end_len]
                    .copy_from_slice(&args.data);
                account_state.serialize(&mut &mut data_account.data.borrow_mut()[..])?;

                Ok(())
            }
            DataAccountInstruction::CloseDataAccount(_args) => {
                msg!("CloseDataAccount");

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
                if *account_state.data_status() == DataStatusOption::UNINITIALIZED {
                    return Err(DataAccountError::NotInitialized.into());
                }

                // ensure data_account is being closed by valid authority
                if account_state.authority() != authority.key {
                    return Err(DataAccountError::InvalidAuthority.into());
                }

                // transfer data_account lamports back to authority and reset data_account
                let curr_lamports = authority.lamports();
                **authority.lamports.borrow_mut() = curr_lamports
                    .checked_add(data_account.lamports())
                    .ok_or(DataAccountError::Overflow)?;
                **data_account.lamports.borrow_mut() = 0;
                data_account.data.borrow_mut().fill(0);

                Ok(())
            }
        }
    }
}
