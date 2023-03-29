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
import BN from "bn.js";
import { PDA_SEED } from "../../../../js/src/util/utils";

dotenv.config();

const main = async () => {
  // Public Key of NFT Quine Sphere and NFT Metadata
  const quineSphere = "HoyEJgwKhQG1TPRB2ziBU9uGziwy4f25kDcnKDNgsCkg";
  const quineMetadata = "2YHSuwuH7PqKLcKKqVAUjTGYYsGwaGYTGbsgZYBtYrsw";

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
  const metadataUpdateOffset = new BN(322).toArrayLike(Buffer, "le", 8);
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
    data: Buffer.concat([
      Buffer.from(new Uint8Array([0])),
      metadataUpdateOffset,
    ]),
  });

  const metadataEndOffset = new BN(180).toArrayLike(Buffer, "le", 8);
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
    data: Buffer.concat([Buffer.from(new Uint8Array([1])), metadataEndOffset]),
  });

  const colorUpdateOffset = new BN(3624).toArrayLike(Buffer, "le", 8);
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
    data: Buffer.concat([Buffer.from(new Uint8Array([2])), colorUpdateOffset]),
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
