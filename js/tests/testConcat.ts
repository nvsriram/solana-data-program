import {
    Connection, 
    PublicKey,
    sendAndConfirmTransaction,
    Transaction,
    SystemProgram,
    TransactionInstruction,
    ConfirmOptions,
  } from "@solana/web3.js";
  import BN from "bn.js";
  import * as dotenv from 'dotenv';
  import { loadKeypairFromFile } from '../src/common/utils'
  import { DataTypeOption } from "../src/common/types";
  import { parseJSON } from "../src/parseJSON";
  
  dotenv.config();
  
  const main = async () => {
    const programId = new PublicKey(process.env.PROGRAM_ID as string);
  
    const connection = new Connection("http://localhost:8899");
  
    const feePayer = loadKeypairFromFile("/Users/nvsriram/code/solana-acount/program/target/deploy/feepayer-keypair.json");
    const dataAccount = loadKeypairFromFile("/Users/nvsriram/code/solana-acount/program/target/deploy/dataaccount-keypair.json");
  
    console.log("Requesting Airdrop of 1 SOL...");
    await connection.requestAirdrop(feePayer.publicKey, 2e9);
    console.log("Airdrop received");
  
    const old = "{\"message\":\"Hello World!\"";
    const message = ",\"author\":\"Jane Doe\"}"
  
    const idx0 = Buffer.from(new Uint8Array([0]));
    const space = Buffer.from(new Uint8Array(new BN(0).toArray("le", 8)));
    const dynamic = Buffer.from(new Uint8Array([1]));
    const authority = feePayer.publicKey.toBuffer();
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
    
    const idx1 = Buffer.from(new Uint8Array([1]));
    const offset0 = Buffer.from(new Uint8Array(new BN(0).toArray("le", 8)));
    const offset1 = Buffer.from(new Uint8Array(new BN(old.length).toArray("le", 8)));
    
    const true_flag = Buffer.from(new Uint8Array([1]));
    const false_flag = Buffer.from(new Uint8Array([0]));
    
    const data_type = Buffer.from(new Uint8Array(new BN(DataTypeOption.CUSTOM).toArray("le", 1)));
    const data_len = Buffer.from(
      new Uint8Array(new BN(old.length).toArray("le", 4))
    );
    const data = Buffer.from(old, "ascii");
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
      data: Buffer.concat([idx1, data_type, data_len, data, offset0, true_flag, true_flag, true_flag]),
    });
    
    const len = Buffer.from(
      new Uint8Array(new BN(message.length).toArray("le", 4))
    );
    const new_data = Buffer.from(message, "ascii");
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
      data: Buffer.concat([idx1, data_type, len, new_data, offset1, true_flag, true_flag, true_flag]),
    });
  
    let tx = new Transaction();
    // tx.add(initializeIx);
    tx.add(updateIx);
    tx.add(updateIx2);
  
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
  