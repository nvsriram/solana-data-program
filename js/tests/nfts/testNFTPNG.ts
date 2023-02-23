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
import { loadPNGFromFile, loadKeypairFromFile, PDA_SEED } from '../../src/common/utils'
import { DataTypeOption } from "../../src/common/types";
import { parseJSON } from "../../src/parseJSON";
  
dotenv.config();

const PART_SIZE = 881;
const uploadData = async (connection: Connection, programId: PublicKey, feePayer: Keypair, dataAccount: Keypair, message: string) => {
  const [pda, _bumpSeed] = PublicKey.findProgramAddressSync(
    [
      Buffer.from(PDA_SEED, "ascii"),
      dataAccount.publicKey.toBuffer(),
   ],
   programId
  );

  const parts = Math.ceil(message.length / PART_SIZE);
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
    
    const data_type = Buffer.from(new Uint8Array(new BN(DataTypeOption.IMG).toArray("le", 1)));
    const data_len = Buffer.from(
      new Uint8Array(new BN(part.length).toArray("le", 4))
    );
    const data = Buffer.from(part, "ascii");
    const updateIx = new TransactionInstruction({
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
          pubkey: pda,
          isSigner: false,
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

    const tx = new Transaction();
    tx.add(updateIx);

    const txid = await sendAndConfirmTransaction(
      connection,
      tx,
      [feePayer, dataAccount],
      {
        skipPreflight: true,
        preflightCommitment: "confirmed",
        confirmation: "confirmed",
      } as ConfirmOptions
    );
    console.log(`${(current + 1)/parts * 100}%: https://explorer.solana.com/tx/${txid}?cluster=devnet`);

    ++current;
  }
  await parseJSON(connection, dataAccount.publicKey, pda, true);
}

const main = async () => {
  const programId = new PublicKey(process.env.PROGRAM_ID as string);

  const connection = new Connection(process.env.CONNECTION_URL as string);

  const feePayer = loadKeypairFromFile("/Users/nvsriram/code/solana-acount/program/target/deploy/feepayer-keypair.json");
  const dataAccount = loadKeypairFromFile("/Users/nvsriram/code/solana-acount/program/target/deploy/dataaccountpng-keypair.json");

  console.log("Requesting Airdrop of 1 SOL...");
  await connection.requestAirdrop(feePayer.publicKey, 7e9);
  console.log("Airdrop received");

  const createIx = SystemProgram.createAccount(
    {
      fromPubkey: feePayer.publicKey,
      newAccountPubkey: dataAccount.publicKey,
      lamports: await connection.getMinimumBalanceForRentExemption(5000),
      space: 4000,
      programId: programId
    }
  );
  const tx1 = new Transaction();
  tx1.add(createIx);
  
  const txid1 = await sendAndConfirmTransaction(
    connection,
    tx1,
    [feePayer, dataAccount],
    {
      skipPreflight: true,
      preflightCommitment: "confirmed",
      confirmation: "confirmed",
    } as ConfirmOptions
  );
  console.log(`https://explorer.solana.com/tx/${txid1}?cluster=devnet`);

  const [pda, _bumpSeed] = PublicKey.findProgramAddressSync(
    [
       Buffer.from(PDA_SEED, "ascii"),
       dataAccount.publicKey.toBuffer(),
   ],
   programId
  );
  console.log(pda.toBase58(), _bumpSeed);
  
  const idx0 = Buffer.from(new Uint8Array([0]));
  const space = Buffer.from(new Uint8Array(new BN(4000).toArray("le", 8)));
  const dynamic = Buffer.from(new Uint8Array([0]));
  const authority = feePayer.publicKey.toBuffer();
  const is_created = Buffer.from(new Uint8Array([1]));
  const initializeIx = new TransactionInstruction({
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
        pubkey: pda,
        isSigner: false,
        isWritable: true,
      },
      {
        pubkey: SystemProgram.programId,
        isSigner: false,
        isWritable: false,
      },
    ],
    programId: programId,
    data: Buffer.concat([idx0, authority, space, dynamic, is_created]),
  });

  const tx = new Transaction();
  tx.add(initializeIx);
  
  const txid = await sendAndConfirmTransaction(
    connection,
    tx,
    [feePayer, dataAccount],
    {
      skipPreflight: true,
      preflightCommitment: "confirmed",
      confirmation: "confirmed",
    } as ConfirmOptions
  );
  console.log(`https://explorer.solana.com/tx/${txid}?cluster=devnet`);
  await parseJSON(connection, dataAccount.publicKey, pda, true);
    
  const old = loadPNGFromFile("/Users/nvsriram/code/solana-acount/js/tests/nfts/testNFT-min.png");
  await uploadData(connection, programId, feePayer, dataAccount, old);
};

main()
  .then(() => {
    console.log("Success");
  })
  .catch((e) => {
    console.error(e);
  });