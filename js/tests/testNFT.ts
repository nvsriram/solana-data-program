import { keypairIdentity, Metaplex } from "@metaplex-foundation/js";
import {
    ConfirmOptions,
    Connection, Keypair, PublicKey, sendAndConfirmTransaction, SimulateTransactionConfig, SystemProgram, Transaction, TransactionInstruction, TransactionMessage, VersionedTransaction, 
} from "@solana/web3.js";
import * as bs58 from "bs58";
import * as dotenv from 'dotenv';
import { PDA_SEED } from "../src/common/utils";

dotenv.config();

const main = async () => {
    const connection = new Connection(process.env.CONNECTION_URL as string);

    const wallet = Keypair.fromSecretKey(bs58.decode("3niSwBNk16y27fmNrpERiojLWam1jYMrh7a4sir5sa4dCtCCycriJajSg7bUMJUfT37gfqx2A3cs1yNrUJvbbgg6"));
    // const metaplex = Metaplex.make(connection)
    // .use(keypairIdentity(wallet));
    // metaplex.nfts().create({
    //     uri: "http://localhost:3000/api/data/E4Fe1LAj5JUsMcJad4o72VuZGC1t2nxuVqQZCeWrWUCm?cluster=Devnet",
    //     name: "Solana Quine NFT",
    //     sellerFeeBasisPoints: 0,
    // }, {
    //         commitment: "confirmed"
    //     }).then(({nft}) => {
    //             console.log(nft);
    //         })
    const dataProgramId = new PublicKey(process.env.PROGRAM_ID as string);
    const nftProgramId = new PublicKey("64aF1oPu6Vo2c7KRtkZJ3UXVX3Ri8kBzXcNM7VzJUY4t");
    const feePayer = wallet;
    
    const dataAccount = new PublicKey("GaShKxcnu6EDxBbFRDk6Eoq6vLM9WBVVfpcipcs2TTvX");
    const [pdaData] = PublicKey.findProgramAddressSync(
        [
           Buffer.from(PDA_SEED, "ascii"),
           dataAccount.toBuffer(),
        ],
        dataProgramId
        ); 
     
    const updateNFTImageIx = new TransactionInstruction({
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
            pubkey: dataProgramId,
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
    data: Buffer.concat([Buffer.from(new Uint8Array([0]))]),
    });
    
    const metadataAccount = new PublicKey("E4Fe1LAj5JUsMcJad4o72VuZGC1t2nxuVqQZCeWrWUCm");
    const [pdaMeta] = PublicKey.findProgramAddressSync(
        [
           Buffer.from(PDA_SEED, "ascii"),
           metadataAccount.toBuffer(),
        ],
        dataProgramId
    );
    const updateNFTMetaIx = new TransactionInstruction({
        keys: [
            {
            pubkey: feePayer.publicKey,
            isSigner: true,
            isWritable: true,
            },
            {
            pubkey: metadataAccount,
            isSigner: false,
            isWritable: true,
            },
            {
            pubkey: pdaMeta,
            isSigner: false,
            isWritable: true,
            },
            {
            pubkey: dataProgramId,
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
    data: Buffer.concat([Buffer.from(new Uint8Array([1]))]),
    });
    
    const appendNFTMetaIx = new TransactionInstruction({
        keys: [
            {
            pubkey: feePayer.publicKey,
            isSigner: true,
            isWritable: true,
            },
            {
            pubkey: metadataAccount,
            isSigner: false,
            isWritable: true,
            },
            {
            pubkey: pdaMeta,
            isSigner: false,
            isWritable: true,
            },
            {
            pubkey: dataProgramId,
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
    data: Buffer.concat([Buffer.from(new Uint8Array([2]))]),
    });

    const updateNFTColorIx = new TransactionInstruction({
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
            pubkey: dataProgramId,
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
    data: Buffer.concat([Buffer.from(new Uint8Array([3]))]),
    });

    const globeIx = new TransactionInstruction({
    keys: [], 
    programId: nftProgramId,
    data: Buffer.concat([Buffer.from(new Uint8Array([4]))]),
    });

    const tx = new Transaction();
    tx
    .add(updateNFTColorIx)
    .add(updateNFTMetaIx).add(appendNFTMetaIx);

    // const messageV0 = new TransactionMessage({
    //     payerKey: feePayer.publicKey,
    //     recentBlockhash: (await connection.getLatestBlockhash('finalized')).blockhash,
    //     instructions: [updateNFTColorIx]
    // }).compileToV0Message();
    // const vtx = new VersionedTransaction(messageV0);
    // const data = await connection.simulateTransaction(vtx, { sigVerify: false, accounts: { addresses: [dataAccount.toBase58() ]} } as SimulateTransactionConfig );
    // console.log("return:", data);
    // console.log("accounts:", data.value.accounts);

    
    const txid = await sendAndConfirmTransaction(
    connection,
    tx,
    [feePayer],
    {
        skipPreflight: true,
        preflightCommitment: "confirmed",
        confirmation: "confirmed",
    } as ConfirmOptions
    );
    console.log(`https://explorer.solana.com/tx/${txid}?cluster=devnet`);
}

main()
.then(() => console.log("success"))
.catch((e) => console.error(e));
