import {
  Connection, 
  PublicKey,
  sendAndConfirmTransaction,
  Transaction,
  SystemProgram,
  TransactionInstruction,
    ConfirmOptions,
    Keypair,
} from "@solana/web3.js";
import BN from "bn.js";
import * as dotenv from 'dotenv';
import { loadPNGFromFile, loadKeypairFromFile } from '../../src/common/utils'
import { DataTypeOption } from "../../src/common/types";
import { parseJSON } from "../../src/parseJSON";
import { parseData } from "../../src/parseData";
  
dotenv.config();

const PART_SIZE = 914;
const uploadData = async (connection: Connection, programId: PublicKey, feePayer: Keypair, dataAccount: Keypair, message: string) => {
  const parts = message.length / PART_SIZE;
  let current = 0;
  while (current < parts) {
    // console.log("Requesting Airdrop of 1 SOL...");
    // await connection.requestAirdrop(feePayer.publicKey, 2e9);
    // console.log("Airdrop received");
    
    const part = message.slice(current * PART_SIZE, (current + 1) * PART_SIZE);
    
    const idx1 = Buffer.from(new Uint8Array([1]));
    const offset = Buffer.from(new Uint8Array(new BN(current * PART_SIZE).toArray("le", 8)));    
    const true_flag = Buffer.from(new Uint8Array([1]));
    const false_flag = Buffer.from(new Uint8Array([0]));
    
    const data_type = Buffer.from(new Uint8Array(new BN(DataTypeOption.PNG).toArray("le", 1)));
    const data_len = Buffer.from(
      new Uint8Array(new BN(part.length).toArray("le", 4))
    );
    const data = Buffer.from(part, "ascii");
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
      data: Buffer.concat([idx1, data_type, data_len, data, offset, false_flag, true_flag, true_flag]),
    });

    let tx = new Transaction();
    tx.add(updateIx);

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

    ++current;
  }
}

const main = async () => {
  const programId = new PublicKey(process.env.PROGRAM_ID as string);

  const connection = new Connection(process.env.CONNECTION_URL as string);

  const feePayer = loadKeypairFromFile("/Users/nvsriram/code/solana-acount/program/target/deploy/feepayer-keypair.json");
  const dataAccount = loadKeypairFromFile("/Users/nvsriram/code/solana-acount/program/target/deploy/dataaccountpng-keypair.json");

  // console.log("Requesting Airdrop of 1 SOL...");
  // await connection.requestAirdrop(feePayer.publicKey, 1e9);
  // console.log("Airdrop received");

  
  const idx0 = Buffer.from(new Uint8Array([0]));
  const space = Buffer.from(new Uint8Array(new BN(10199).toArray("le", 8)));
  const dynamic = Buffer.from(new Uint8Array([0]));
  const authority = feePayer.publicKey.toBuffer();
  const is_created = Buffer.from(new Uint8Array([1]));
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
    data: Buffer.concat([idx0, authority, space, dynamic]),
  });
  
  let tx = new Transaction();
  tx.add(initializeIx);
  
  const old = loadPNGFromFile("/Users/nvsriram/code/solana-acount/js/tests/nfts/solana-sol-logo.svg");
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
  
  console.log(`len: ${old.length}, parts: ${old.length/ PART_SIZE}`);
  await uploadData(connection, programId, feePayer, dataAccount, old);
};

main()
  .then(() => {
    console.log("Success");
  })
  .catch((e) => {
    console.error(e);
  });
