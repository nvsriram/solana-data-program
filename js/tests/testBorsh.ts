import {
  Connection, 
  PublicKey,
  sendAndConfirmTransaction,
  Keypair,
  Transaction,
  SystemProgram,
  TransactionInstruction,
  ConfirmOptions,
} from "@solana/web3.js";
import BN from "bn.js";
import { serialize } from 'borsh';
import { PROGRAM_ID } from "../src/common/constants";
import { DataTypeOption } from "../src/common/types";
import { parseBorsh } from "../src/parseBorsh";
import { PersonSchema, PersonStruct, PurchaseStruct } from "./testBorsh.types";


const main = async () => {
  const programId = new PublicKey(PROGRAM_ID);

  const connection = new Connection("http://localhost:8899");

  const feePayer = new Keypair();
  const dataAccount = new Keypair();

  console.log("Requesting Airdrop of 1 SOL...");
  await connection.requestAirdrop(feePayer.publicKey, 2e9);
  console.log("Airdrop received");

  const laptopPurchase = new PurchaseStruct({
    purchase_id: 'ord-zzz987',
    name: 'laptop',
    date: '2022-01-25T02:20:42.832Z',
    price: 853,
  });
  const headphonesPurchase = new PurchaseStruct({
      purchase_id: 'ord-yyy654',
      name: 'headphones',
      date: '2022-01-23T14:12:05.631Z',
      price: 63,
  });
  const person = new PersonStruct({
      person_id: 'usr-abc123',
      first_name: 'John',
      last_name: 'Doe',
      purchases: [
          laptopPurchase,
          headphonesPurchase
      ]
  });
 
  const serialized = serialize(PersonSchema, person);

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
  const data_type = Buffer.from(new Uint8Array(new BN(DataTypeOption.BORSH).toArray("le", 1)));
  const data_len = Buffer.from(
    new Uint8Array(new BN(serialized.length).toArray("le", 4))
  );
  const data = Buffer.from(serialized);
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

  const idx4 = Buffer.from(new Uint8Array([4]));
  const verify_flag = Buffer.from(new Uint8Array([1]));
  let finalizeIx = new TransactionInstruction({
    keys: [
      {
        pubkey: feePayer.publicKey,
        isSigner: false,
        isWritable: true,
      },
      {
        pubkey: dataAccount.publicKey,
        isSigner: true,
        isWritable: false,
      },
    ],
    programId: programId,
    data: Buffer.concat([idx4, verify_flag]),
  });

  let tx = new Transaction();
  tx.add(initializeIx)
    .add(updateIx)
    .add(finalizeIx);

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

  let _ = await parseBorsh(connection, dataAccount.publicKey, PersonSchema, PersonStruct, true);
};

main()
  .then(() => {
    console.log("Success");
  })
  .catch((e) => {
    console.error(e);
  });
