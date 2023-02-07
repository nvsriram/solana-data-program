# Solana Data Program V0

Solana Data Program is a program that allows users to intialize a _data account_ and read and modify its data.

## Features

- Allows System owned accounts to create and initialize a _data account_ that is linked to the System owned account to store data of any format (JSON, Borsh, Custom etc.)
- Allows the `authority` of the _data account_ to modify the `data_type` and/or `data`
- [`realloc`](https://docs.rs/solana-sdk/latest/solana_sdk/account_info/struct.AccountInfo.html#method.realloc)'s the _data account_ on every [update](#instruction-overview) instruction to ensure no additional storage is wasted
- Allows the `authority` to finalize the data in the _data account_; by passing in a `verify_flag: bool`, the `authority` could optionally verify that the `data` is of the same data type as expected by the `data_type` field

## Instruction Overview

0. **InitializeDataAccount (`initialize`):** creates a new _data account_ that is linked to the _feePayer_ as its `authority`
1. **UpdateDataAccount (`update`):** lets the `authority` modify the `data_type` and the `data`
2. **UpdateDataAccountDataType (`updateDataType`):** lets the `authority` modify the `data_type`
3. **UpdateDataAccountData (`updateData`):** lets the `authority` modify the `data`
4. **FinalizeDataAccount (`finalize`):** lets the `authority` finalize the data (and optionally verify that the `data` conforms to the `data_type`)
5. **CloseDataAccount (`close`):** lets the `authority` close the _data account_

## Indexer Support

This repo also contains a Typescript indexer that polls the Data Program for transactions and looks for the [**FinalizeDataAccount**](#instruction-overview) instruction to populate the database (based on `.env` file configuration) with the finalized data.

### Current Implementation

- It runs every `DELAY` seconds and polls the Data Program using `getSignaturesForAddress`
- For every transaction,
  - It parses through every instruction, decodes the data, and checks to see if it is a `finalize` instruction
  - If it is, it parses the state of the _data account_ that is passed in with the instruction and extracts the various relevant fields like `authority`, `data_type`, `data` etc.
  - It then connects to the database and checks to see if there is a row corresponding to the _data account_:
    - If so, it updates the _data account_ row values (if this transaction was not that last transaction that updated that row previously)
    - Otherwise, it inserts a new row for the _data account_ and populates it

This works as expected in the basic case where a single/multiple transaction initializes, updates, and finalizes the _data account_ once at the end.
However, in [some cases](#issues-with-current-implementation), it does not store the expected finalized value.

### Cases to consider

1. <a name="case-1"></a> Transaction(s) that call a single `finalize` instruction as the last instruction of the transaction should populate the database as per the state of the _data account_ at the end of the transaction
   <br>**For example:** `initialize` > `update`/`updateDataType`/`updateData` > `finalize` instructions should store the updated `data_type`/`data` in the database
2. <a name="case-2"></a> A single transaction that has multiple `finalize` instructions should populate the database as per the state of the _data account_ at the time of the last `finalize` instruction in the transaction
   <br>**For example:** `initialize` > `update` > `finalize` > `updateData` > `finalize` should store the updated `data` after the `updateData` instruction in the database
3. <a name="case-3"></a> A single transaction that has a `finalize` instruction followed by an `update`/`updateDataType`/`updateData` instruction should not store the updated `data_type`/`data` in the database
   <br>**For example:** `initialize` > `update` > `finalize` > `updateData` should store the updated `data_type`/`data` after the `update` instruction and not the updated `data` after the `updateData` instruction

### Issues with Current Implementation

The current implementation handles cases [1](#case-1) and [2](#case-2)
However, it fails to handle case [3](#case-3). As it always populates the database as per the state of the _data account_ at the end of the transaction, it would store _dirty_ unfinalized values in the database in cases where the `finalize` instruction is followed by an update instruction of any kind.

### Potential Solutions

#### Use temporary Buffer Accounts for every `finalize` instruction

##### Possible Implementation

1.  On every `finalize` instruction, create and initialize a separate _buffer account_ and populate it with the _data account_ data
2.  Store the _buffer account_ public key (say `buffer_key`) in the data account
3.  The indexer can then extract this `buffer_key`, parse its data, and populate the database
4.  The indexer could also close the _buffer account_ once it is done reading from it

The _buffer account_ would essentialy store a snapshot of the _data account_'s data at the time of the `finalize` instruction

##### Issues with Implementation

- `finalize` instruction speed would be slowed due to _buffer account_ creation
- The indexer would be slowed if it has to close the _buffer account_ after reading from it
- Extra cost of storing the data in a temporary _buffer account_ would need to be paid:
  For **n** `finalize` instructions, an additional cost of **n** times the storage cost would need to be paid

#### Parse instruction data instead of account data

##### Possible Implementation

1.  The indexer locates the lastest `finalize` instruction
2.  <a name="step-2"></a>From that instruction, trace back to the latest instruction(s) (might be in a previous transaction) that updated the `data_type` and `data` independently
3.  If a `finalize` instruction is encountered before the latest update to `data_type` or `data`, use the value at the time of the encountered `finalize` instruction:
    - If the encountered `finalize` instruction corresponds to the row in the database, use it
    - Otherwise, continue tracing back past this instruction i.e. repeat [step 2](#step-2) using the encountered `finalize` instruction
4.  The indexer could also close the _buffer account_ once it is done reading from it
5.  The _buffer account_ would essentialy store a snapshot of the _data account_'s data at the time of the `finalize` instruction

##### Issues with Implementation

- The indexer would be slowed drastically as it may have to trace back multiple instructions and transactions
- In case the indexer does not store the details of older transactions, that could cause more issues
