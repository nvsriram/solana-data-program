import {
  Connection, 
  PublicKey,
  sendAndConfirmTransaction,
  Keypair,
  Transaction,
  SystemProgram,
  TransactionInstruction,
  ConfirmOptions,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import BN from "bn.js";
import * as dotenv from 'dotenv';
import { DataTypeOption } from "../src/common/types";
import { parseJSON } from "../src/parseJSON";

dotenv.config();

const main = async () => {
  const programId = new PublicKey(process.env.PROGRAM_ID as string);

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
  const data_type = Buffer.from(new Uint8Array(new BN(DataTypeOption.CUSTOM).toArray("le", 1)));
  const data_len = Buffer.from(
    new Uint8Array(new BN(message.length).toArray("le", 4))
  );
  const commit_flag = Buffer.from(new Uint8Array([1]));
  const verify_flag = Buffer.from(new Uint8Array([1]));
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
    data: Buffer.concat([idx1, data_type, data_len, data, commit_flag, verify_flag]),
  });

  const new_object = { message: "Hey there, Jane!", author: "John Doe" };
  const new_message = JSON.stringify(new_object);
  const len = Buffer.from(
    new Uint8Array(new BN(new_message.length).toArray("le", 4))
  );
  const new_data = Buffer.from(new_message, "ascii");
  const unverify_flag = Buffer.from(new Uint8Array([0]));
  let updateIx2 = new TransactionInstruction({
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
    data: Buffer.concat([idx1, data_type, len, new_data, unverify_flag, verify_flag]),
  });

  const idx2 = Buffer.from(new Uint8Array([2]));
  let closeIx = new TransactionInstruction({
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
    data: Buffer.concat([idx2]),
  });

  let transferIx = SystemProgram.transfer({
    fromPubkey: feePayer.publicKey,
    lamports: LAMPORTS_PER_SOL,
    toPubkey: dataAccount.publicKey
  });

  let tx = new Transaction();
  tx.add(initializeIx)
  .add(updateIx)
  .add(updateIx2)

  let txid = await sendAndConfirmTransaction(
    connection,
    tx,
    [feePayer, dataAccount],
    {
      skipPreflight: true,
      preflightCommitment: "confirmed",
      confirmation: "confirmed",
    } as ConfirmOptions
  );
  console.log(`https://explorer.solana.com/tx/${txid}?cluster=custom`);

  let _ = await parseJSON(connection, dataAccount.publicKey, true);
};

main()
  .then(() => {
    console.log("Success");
  })
  .catch((e) => {
    console.error(e);
  });
