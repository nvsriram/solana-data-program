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
    "5b2wAxsRJP2c9p9bneJxtbHjXdtD2HggGYya3WBVtNbS"
  );

  // const connection = new Connection("https://api.devnet.solana.com/");
  const connection = new Connection("http://localhost:8899");

  const feePayer = new Keypair();
  const dataAccount = new Keypair();

  console.log("Requesting Airdrop of 1 SOL...");
  await connection.requestAirdrop(feePayer.publicKey, 2e9);
  console.log("Airdrop received");

  const message = "Hello World!";

  const idx0 = Buffer.from(new Uint8Array([0]));
  const space = Buffer.from(
    new Uint8Array(new BN(message.length).toArray("le", 8))
  );
  let initializeIx = new TransactionInstruction({
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
        isWritable: false,
      },
      {
        pubkey: dataAccount.publicKey,
        isSigner: false,
        isWritable: true,
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
  const new_message = "Hey there!";
  const len = Buffer.from(
    new Uint8Array(new BN(new_message.length).toArray("le", 4))
  );
  const new_data = Buffer.from(new_message, "ascii");
  let updateDataIx = new TransactionInstruction({
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
      {
        pubkey: SystemProgram.programId,
        isSigner: false,
        isWritable: false,
      },
    ],
    programId: programId,
    data: Buffer.concat([idx4]),
  });

  let tx = new Transaction();
  tx.add(initializeIx).add(updateIx).add(updateTypeIx).add(updateDataIx);
  // .add(removeIx);

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

  info = (await connection.getAccountInfo(dataAccount.publicKey, "confirmed"))
    .data;
  console.log("Data Account Data:", info.toString());
};

main()
  .then(() => {
    console.log("Success");
  })
  .catch((e) => {
    console.error(e);
  });
