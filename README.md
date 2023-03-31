# Solana Data Program V0

Solana Data Program is a program that allows users to initialize a _data account_, read and modify its data, and optionally finalize it.

##  ✨ Key Features

- Allows System owned accounts to create (if not done already) and initialize a _data account_ and _metadata account_ that is linked to the `authority` (but owned by the Data Program) to store data of any format (JSON, PNG, Custom etc.)
- Allows the `authority` of the _data account_ to modify the `data_type` and/or `data`
- Optionally allows _data account_ to be dynamic i.e., [`realloc`](https://docs.rs/solana-sdk/latest/solana_sdk/account_info/struct.AccountInfo.html#method.realloc)'s the _data account_ on every [update](#instruction-overview) instruction to ensure no additional storage is wasted
- Allows the `authority` to update the data starting at a particular offset
- Allows the `authority` to verify that the `data` is of the same data type as expected by the `data_type` field by passing in a `verify_flag: bool`
- Allows the `authority` to update the `authority` field but requires the new authority to also be a signer so that there is no accidental authority transfer
- Allows the `authority` to finalize the data in the _data account_ - finalized data can no longer be updated
- Allows the `authority` to close both the _data account_ and _metadata account_ to reclaim SOL

## 📝 Instruction Overview

0. **InitializeDataAccount (`initialize`):** creates (if not done already) and initializes a _data account_ that is linked to the `authority`. It also creates and initializes a _metadata account_ that is a pda derived off of the _data account_ to store the metadata
1. **UpdateDataAccount (`update`):** lets the `authority` modify the `data_type` and the `data` starting at a particular `offset`. If the _data account_ is set to be dynamic, it down/up reallocs as necessary. Also lets the `authority` optionally verify that the `data` conforms to the `data_type`
2. **UpdateDataAccountAuthority (`update-authority`):** lets the `authority` transfer its "authority" to a new account. It requires both the old and new authority to be signers to prevent accidental transfers
3. **FinalizeDataAccount (`finalize`):** lets the `authority` finalize the data and metadata corresponding to the _data account_. Once finalized, the data cannot be updated. However, the `authority` can still be updated and the _data account_ can still be closed 
3. **CloseDataAccount (`close`):** lets the `authority` close the _data account_ and the _metadata account_ and reclaim the lamports

## 🧑‍💻 Getting Started

1. Navigate to the `js` directory and install all dependencies using `npm install`
2. Create a `.env` file and add the following to it:
 ```
CONNECTION_URL=https://api.devnet.solana.com # if deployed on devnet
PROGRAM_ID=ECQd7f4sYhcWX5G9DQ7Hgcf3URZTfgwVwjKzH2sMQeFW # if deployed on devnet
AUTHORITY_PRIVATE=<REPLACE WITH PRIVATE KEY OF AUTHORITY WALLET>
```
3. To view details about a Data Account, run:
  ```
  npx ts-node src/index.ts --view --account <REPLACE WITH DATA ACCOUNT PUBKEY>
  ```
  - This displays the parsed metadata and data
  - If you want to view the raw metadata and data, include the `--debug` flag

4. To upload a file from your file system, run:
  ```
  npx ts-node src/index.ts --upload <REPLACE WITH FILEPATH>
  ```
  - This creates a new static Data Account, initializes it and uploads the file to the Data Account in chunks
  - If you already have an existing Data Account, you can upload to it by including the `--account <REPLACE WITH DATA ACCOUNT PUBKEY>` flag
  - If you want the Data Account to be dynamic, include the `--dynamic` flag

## 🛠️ Testing Instructions

1. Navigate to the `js` directory and install all dependencies using `npm install`
2. Create a `.env` file and add the following to it:
 ```
CONNECTION_URL=https://api.devnet.solana.com # if deployed on devnet
PROGRAM_ID=ECQd7f4sYhcWX5G9DQ7Hgcf3URZTfgwVwjKzH2sMQeFW # if deployed on devnet
TEST_PRIMARY_PRIVATE=<REPLACE WITH PRIVATE KEY OF PRIMARY TEST AUTHORITY WALLET>
TEST_SECONDARY_PRIVATE=<REPLACE WITH PRIVATE KEY OF SECONDARY TEST AUTHORITY WALLET>
```
3. Run `npm run test` to run all the test cases

## 📈 Flow Diagram
![flow-diagram](./static/FlowDiagram.png)

## 🚀 Examples

* The `examples` directory contains example projects that build on top of the Data Program to showcase stuff that can be built using it
* Follow in the instructions in the `examples` README to try them out for yourself! ;)
