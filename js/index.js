const {
  Connection,
  sendAndConfirmTransaction,
  Keypair,
  Transaction,
  SystemProgram,
  PublicKey,
  TransactionInstruction,
} = require("@solana/web3.js");
const BN = require("bn.js");

const main = async () => {
  // var args = process.argv.slice(2);
  // const programId = new PublicKey(args[0]);
  const programId = new PublicKey(
    "92ANfnQviCSVBUgSTMPgRy6AKmkGJoQpHbt8iJLjY6Q3"
  );

  // const connection = new Connection("https://api.devnet.solana.com/");
  const connection = new Connection("http://localhost:8899");

  const feePayer = new Keypair();
  const dataAccount = new Keypair();

  console.log("Requesting Airdrop of 1 SOL...");
  await connection.requestAirdrop(feePayer.publicKey, 2e9);
  console.log("Airdrop received");

  const object = { message: "Hello World!", author: "Jane Doe" };
  const message = JSON.stringify(object);

  const idx0 = Buffer.from(new Uint8Array([0]));
  const space = Buffer.from(new Uint8Array(new BN(0).toArray("le", 8)));
  let initializeIx = new TransactionInstruction({
    keys: [
      {
        pubkey: feePayer.publicKey,
        isSigner: true,
        isWritable: false,
      },
      {
        pubkey: dataAccount.publicKey,
        isSigner: true,
        isWritable: false,
      },
      {
        pubkey: SystemProgram.programId,
        isSigner: false,
        isWritable: false,
      },
    ],
    programId: programId,
    data: Buffer.concat([idx0, space]),
  });

  const idx1 = Buffer.from(new Uint8Array([1]));
  const data_type = Buffer.from(new Uint8Array(new BN(5).toArray("le", 1)));
  const data_len = Buffer.from(
    new Uint8Array(new BN(message.length).toArray("le", 4))
  );
  const data = Buffer.from(message, "ascii");
  let updateIx = new TransactionInstruction({
    keys: [
      {
        pubkey: feePayer.publicKey,
        isSigner: true,
        isWritable: true,
      },
      {
        pubkey: dataAccount.publicKey,
        isSigner: true,
        isWritable: true,
      },
      {
        pubkey: SystemProgram.programId,
        isSigner: false,
        isWritable: false,
      },
    ],
    programId: programId,
    data: Buffer.concat([idx1, data_type, data_len, data]),
  });

  const idx2 = Buffer.from(new Uint8Array([2]));
  const new_data_type = Buffer.from(
    new Uint8Array(new BN(250).toArray("le", 1))
  );
  let updateTypeIx = new TransactionInstruction({
    keys: [
      {
        pubkey: feePayer.publicKey,
        isSigner: true,
        isWritable: false,
      },
      {
        pubkey: dataAccount.publicKey,
        isSigner: false,
        isWritable: true,
      },
    ],
    programId: programId,
    data: Buffer.concat([idx2, new_data_type]),
  });

  const idx3 = Buffer.from(new Uint8Array([3]));
  const new_object = { message: "Hey there, Jane!", author: "John Doe" };
  const new_message = JSON.stringify(new_object);
  const len = Buffer.from(
    new Uint8Array(new BN(new_message.length).toArray("le", 4))
  );
  const new_data = Buffer.from(new_message, "ascii");
  let updateDataIx = new TransactionInstruction({
    keys: [
      {
        pubkey: feePayer.publicKey,
        isSigner: true,
        isWritable: true,
      },
      {
        pubkey: dataAccount.publicKey,
        isSigner: true,
        isWritable: true,
      },
      {
        pubkey: SystemProgram.programId,
        isSigner: false,
        isWritable: false,
      },
    ],
    programId: programId,
    data: Buffer.concat([idx3, len, new_data]),
  });

  const idx4 = Buffer.from(new Uint8Array([4]));
  let removeIx = new TransactionInstruction({
    keys: [
      {
        pubkey: feePayer.publicKey,
        isSigner: false,
        isWritable: true,
      },
      {
        pubkey: dataAccount.publicKey,
        isSigner: true,
        isWritable: true,
      },
    ],
    programId: programId,
    data: Buffer.concat([idx4]),
  });

  let tx = new Transaction();
  tx.add(initializeIx)
    .add(updateIx)
    .add(updateTypeIx)
    .add(updateDataIx)
    .add(removeIx);

  let txid = await sendAndConfirmTransaction(
    connection,
    tx,
    [feePayer, dataAccount],
    {
      skipPreflight: true,
      preflightCommitment: "confirmed",
      confirmation: "confirmed",
    }
  );
  // console.log(`https://explorer.solana.com/tx/${txid}?cluster=devnet`);
  console.log(`https://explorer.solana.com/tx/${txid}?cluster=custom`);

  await parseJSON(connection, dataAccount.publicKey);
};

main()
  .then(() => {
    console.log("Success");
  })
  .catch((e) => {
    console.error(e);
  });

const parseJSON = async (connection, dataKey) => {
  const data_account = await connection.getAccountInfo(dataKey, "confirmed");
  console.log("Raw Data:");
  console.log(data_account?.data);

  if (data_account) {
    // pub struct DataAccountData {
    //   pub data_type: u8,
    //   pub data: Vec<u8>,
    // }
    // pub struct DataAccountState {
    //   is_initialized: bool,
    //   authority: Pubkey,
    //   data_version: u8,
    //   account_data: DataAccountData,
    // }

    // Data Account State
    const data_account_state = data_account.data;
    const account_state = {};
    account_state.is_initialized = data_account_state.slice(0, 1).readUInt8()
      ? true
      : false;
    account_state.authority = new PublicKey(
      data_account_state.slice(1, 33)
    ).toBase58();
    account_state.data_version = new BN(
      data_account_state.slice(33, 34),
      "le"
    ).toNumber();
    account_state.account_data = {};

    // Data Account Data
    account_data = data_account_state.slice(34);
    account_state.account_data.data_type = new BN(
      account_data.slice(0, 1),
      "le"
    ).toNumber();
    account_state.account_data.data = {
      len: new BN(account_data.slice(1, 5), "le").toNumber(),
      data: JSON.parse(account_data.slice(5)),
    };

    console.log("Parsed Data:");
    console.log(account_state);
    console.log(JSON.stringify(account_state.account_data.data.data, null, 2));
  }
};
