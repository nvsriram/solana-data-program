import { keypairIdentity, Metaplex } from "@metaplex-foundation/js";
import {
  ConfirmOptions,
  Connection,
  Keypair,
  PublicKey,
  sendAndConfirmTransaction,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import * as bs58 from "bs58";
import * as dotenv from "dotenv";
import { PDA_SEED } from "../../../../js/src/common/utils";

dotenv.config();

const main = async () => {
  // Public Key of NFT Quine Sphere and NFT Metadata
  const quineSphere = "GaShKxcnu6EDxBbFRDk6Eoq6vLM9WBVVfpcipcs2TTvX";
  const quineMetadata = "zG6N1e1qP5vUbpRcPBj5oX1yJ3VhH7B2N8q3RrGMXqb";

  const cluster = process.env.CLUSTER as string;

  const connection = new Connection(process.env.CONNECTION_URL as string);
  const wallet = Keypair.fromSecretKey(
    bs58.decode(process.env.AUTHORITY_PRIVATE as string)
  );

  // mint Quine Sphere NFT with metadata
  const base = process.env.BASE_URL as string;
  const api = process.env.DATA_ROUTE as string;
  const metaplex = Metaplex.make(connection).use(keypairIdentity(wallet));
  metaplex
    .nfts()
    .create(
      {
        uri: `${base}${api}${quineMetadata}?cluster=${cluster}`,
        name: "Solana Quine Sphere NFT",
        sellerFeeBasisPoints: 0,
      },
      {
        commitment: "confirmed",
      }
    )
    .then(({ nft }) => {
      console.log(nft);
    });

  const dataProgramId = new PublicKey(process.env.DATA_PROGRAM_ID as string);
  const quineProgramId = new PublicKey(process.env.QUINE_PROGRAM_ID as string);
  const feePayer = wallet;

  // data account of NFT image
  const dataAccount = new PublicKey(quineSphere);
  const [pdaData] = PublicKey.findProgramAddressSync(
    [Buffer.from(PDA_SEED, "ascii"), dataAccount.toBuffer()],
    dataProgramId
  );

  // data account of NFT metadata JSON
  const metadataAccount = new PublicKey(quineMetadata);
  const [pdaMeta] = PublicKey.findProgramAddressSync(
    [Buffer.from(PDA_SEED, "ascii"), metadataAccount.toBuffer()],
    dataProgramId
  );
  const updateQuineMetadataIx = new TransactionInstruction({
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
    programId: quineProgramId,
    data: Buffer.concat([Buffer.from(new Uint8Array([0]))]),
  });

  const appendQuineMetadataIx = new TransactionInstruction({
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
    programId: quineProgramId,
    data: Buffer.concat([Buffer.from(new Uint8Array([1]))]),
  });

  const updateQuineColorIx = new TransactionInstruction({
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
    programId: quineProgramId,
    data: Buffer.concat([Buffer.from(new Uint8Array([2]))]),
  });

  // update, append metadata + update color
  const tx = new Transaction();
  tx.add(updateQuineMetadataIx)
    .add(appendQuineMetadataIx)
    .add(updateQuineColorIx);

  const txid = await sendAndConfirmTransaction(connection, tx, [feePayer], {
    skipPreflight: true,
    preflightCommitment: "confirmed",
    confirmation: "confirmed",
  } as ConfirmOptions);
  console.log(`https://explorer.solana.com/tx/${txid}?cluster=${cluster}`);
};

main()
  .then(() => console.log("success"))
  .catch((e) => console.error(e));
