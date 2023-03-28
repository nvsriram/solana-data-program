

import { keypairIdentity, Metaplex } from "@metaplex-foundation/js";
import {
    ConfirmOptions,
    Connection, Keypair, PublicKey, sendAndConfirmTransaction, SimulateTransactionConfig, SystemProgram, Transaction, TransactionInstruction, TransactionMessage, VersionedTransaction, 
} from "@solana/web3.js";
import BN from "bn.js";
import * as bs58 from "bs58";
import * as dotenv from 'dotenv';
import { DataTypeOption } from "../src/common/types";
import { PDA_SEED } from "../src/common/utils";


dotenv.config();

const main = async () => {
    const programId = new PublicKey(process.env.PROGRAM_ID as string);
    const nftProgramId = new PublicKey("64aF1oPu6Vo2c7KRtkZJ3UXVX3Ri8kBzXcNM7VzJUY4t");
  
    const connection = new Connection(process.env.CONNECTION_URL as string);

    const feePayer = Keypair.fromSecretKey(bs58.decode("3niSwBNk16y27fmNrpERiojLWam1jYMrh7a4sir5sa4dCtCCycriJajSg7bUMJUfT37gfqx2A3cs1yNrUJvbbgg6"));
      
    const dataAccount = new PublicKey("3vc5iMbuXrxzivQz6AqsmEgM1QqeKFhBCFGEMn4CQcx3");
    const [pdaData] = PublicKey.findProgramAddressSync(
    [
       Buffer.from(PDA_SEED, "ascii"),
       dataAccount.toBuffer(),
    ],
        programId
    );
    
    const updateBetIx = new TransactionInstruction({
        keys: [
            {
            pubkey: feePayer.publicKey,
            isSigner: true,
            isWritable: true,
            },
            {
            pubkey: dataAccount,
            isSigner: false,
            isWritable: true,
            },
            {
            pubkey: pdaData,
            isSigner: false,
            isWritable: true,
            },
            {
            pubkey: programId,
            isSigner: false,
            isWritable: false,
            },
            {
            pubkey: SystemProgram.programId,
            isSigner: false,
            isWritable: false,
            },
        ],
    programId: nftProgramId,
    data: Buffer.concat([Buffer.from(new Uint8Array([5]))]),
    });


    const tx = new Transaction();
    tx.add(updateBetIx);
    let txid1 = await sendAndConfirmTransaction(
        connection,
        tx,
        [feePayer],
        {
          skipPreflight: true,
          preflightCommitment: "confirmed",
          confirmation: "confirmed",
        } as ConfirmOptions
      );
    console.log(`https://explorer.solana.com/tx/${txid1}?cluster=devnet`);
};
  
  main()
    .then(() => {
      console.log("Success");
    })
    .catch((e) => {
      console.error(e);
    });