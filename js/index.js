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
  const programId = new PublicKey("4p6vAUr31NijrPdXmAKhCCXFJDcHTRoinwwk76iSqcX7");

  // const connection = new Connection("https://api.devnet.solana.com/");
  const connection = new Connection("http://localhost:8899 ");

  const feePayer = new Keypair();
  const dataAccount = new Keypair();

  console.log("Requesting Airdrop of 1 SOL...");
  await connection.requestAirdrop(feePayer.publicKey, 2e9);
  console.log("Airdrop received");

  const message = "Hello World!";

  const idx0 = Buffer.from(new Uint8Array([0]));
  const spaceRaw = message.length;
  console.log("Space Raw:", spaceRaw);
  const space = Buffer.from(
    new Uint8Array(new BN(spaceRaw).toArray("le", 8))
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
    data: Buffer.concat([idx1, data_type, data]),
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
  const new_data = Buffer.from("Hey there!", "ascii");
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
    data: Buffer.concat([idx3, new_data]),
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
  console.log("Creating Data Account...", space);
  tx.add(
    SystemProgram.createAccount({
      fromPubkey: feePayer.publicKey,
      newAccountPubkey: dataAccount.publicKey,
      lamports: await connection.getMinimumBalanceForRentExemption(
        spaceRaw,
      ),
      space: spaceRaw,
      programId,
    })
  ).add(initializeIx);
  // .add(updateIx)
  // .add(updateTypeIx)
  // .add(updateDataIx)
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
  console.log(`https://explorer.solana.com/tx/${txid}?cluster=custom`);

  data = (await connection.getAccountInfo(dataAccount.publicKey, "confirmed")).data;
  console.log("Data Account Data:", data.toString());
};

main()
  .then(() => {
    console.log("Success");
  })
  .catch((e) => {
    console.error(e);
  });
