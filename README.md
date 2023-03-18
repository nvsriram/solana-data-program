# Solana Data Program V0

Solana Data Program is a program that allows users to initialize a _data account_, read and modify its data, and optionally finalize it.

## Features

- Allows System owned accounts to create (if not done already) and initialize a _data account_ and _metadata account_ that is linked to the `authority` (but owned by the Data Program) to store data of any format (JSON, PNG, Custom etc.)
- Allows the `authority` of the _data account_ to modify the `data_type` and/or `data`
- Optionally allows _data account_ to be dynamic i.e., [`realloc`](https://docs.rs/solana-sdk/latest/solana_sdk/account_info/struct.AccountInfo.html#method.realloc)'s the _data account_ on every [update](#instruction-overview) instruction to ensure no additional storage is wasted
- Allows the `authority` to update the data starting at a particular offset
- Allows the `authority` to verify that the `data` is of the same data type as expected by the `data_type` field by passing in a `verify_flag: bool`
- Allows the `authority` to finalize the data in the _data account_ - finalized data can no longer be updated
- Allows the `authority` to update the `authority` field but requires the new authority to also be a signer so that there is no accidental authority transfer
- Allows the `authority` to close both the _data account_ and _metadata account_ to reclaim SOL

## Instruction Overview

0. **InitializeDataAccount (`initialize`):** creates (if not done already) and initializes a _data account_ that is linked to the `authority`. It also creates and initializes a _metadata account_ that is a pda derived off of the _data account_ to store the metadata
1. **UpdateDataAccount (`update`):** lets the `authority` modify the `data_type` and the `data` starting at a particular `offset`. If the _data account_ is set to be dynamic, it down/up reallocs as necessary. Also lets the `authority` optionally verify that the `data` conforms to the `data_type`
2. **UpdateDataAccountAuthority (`update-authority`):** lets the `authority` transfer its "authority" to a new account. It requires both the old and new authority to be signers to prevent accidental transfers
3. **FinalizeDataAccount (`finalize`):** lets the `authority` finalize the data and metadata corresponding to the _data account_. Once finalized, the data cannot be updated. However, the `authority` can still be updated and the _data account_ can still be closed 
3. **CloseDataAccount (`close`):** lets the `authority` close the _data account_ and the _metadata account_ and reclaim the lamports

## <s>Indexer Support</s> <i>[This is no longer maintained]</i>

<s>
This repo also contains a Typescript indexer that polls the Data Program for transactions and looks for the [**UpdateDataAccount**](#instruction-overview) instruction with a set `commit_flag` to populate the database (based on `.env` file configuration) with the committed data.

### Current Implementation

- It runs every `DELAY` seconds and polls the Data Program using `getSignaturesForAddress`
- It has a `Set<string>` that stores the unique _data accounts_ that have been encountered
- For every transaction,
  - It parses through every instruction backwards in time of execution, decodes the data, and checks to see if it is an `update` instruction with a set `commit_flag` (aka `update + commit` instruction)
  - If it is, it checks if the _data account_ has already been encountered; if it has, then it skips to the next instruction
  - If not, it first adds it to the set, parses the instruction data and the state of the _data account_ that is passed in with the instruction and extracts the various relevant fields like `authority`, `data_type`, `data`, `serialization_status` etc.
  - It then connects to the database and checks to see if there is a row corresponding to the _data account_:
    - If so, it updates the _data account_ row values (if this transaction was not the last transaction that updated that row previously)
    - Otherwise, it inserts a new row for the _data account_ and populates it

### Cases to consider

1. <a name="case-1"></a> Transaction(s) that call a single `update + commit` instruction as the last instruction of the transaction should populate the database as per the state of the _data account_ at the end of the transaction
   <br>**For example:** `initialize` > `update` > `update + commit` instructions should store the updated data in the database
2. <a name="case-2"></a> A single transaction that has multiple `update + commit` instructions should populate the database as per the state of the _data account_ at the time of the last `update + commit` instruction in the transaction
   <br>**For example:** `initialize` > `update + commit + verify` > `update + commit` should store the updated data as per the `update + commit` instruction in the database
3. <a name="case-3"></a> A single transaction that has a `update + commit` instruction followed by an `update` instruction should not store the updated data in the database
   <br>**For example:** `initialize` > `update + commit` > `update` should store the updated data after the `update + commit` instruction and not the updated data after the `update` instruction

The current implementation handles all three [cases](#cases-to-consider).

### Things to note

- Currently, the `serialization_status` can only be set on commit.
  - The reason for this is that it makes it easier for the indexer to only have to find a single instruction for the `data_type` and `data`, and use the state of the _data account_ for other fields like the `authority`, `serialization_status`, etc.
  - What this also means, however, is that the `serialization_status` for a _data account_ with uncommitted data could still say that it is `VERIFIED`. All this means is that the data that was last committed was `VERIFIED` and does not denote the `serialization_status` of the current uncommitted data.</s>
