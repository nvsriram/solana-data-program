import {
  Commitment,
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import BN from "bn.js";
import { readFileSync } from "fs";
import { IDataAccountMeta, IDataAccount } from "./types";

export const loadKeypairFromFile = (filename: string): Keypair => {
  const secret = JSON.parse(readFileSync(filename).toString()) as number[];
  const secretKey = Uint8Array.from(secret);
  return Keypair.fromSecretKey(secretKey);
};

export const loadJSONFromFile = (filename: string): string => {
  return readFileSync(filename).toString().trim();
};

export const loadPNGFromFile = (filename: string): Buffer => {
  return readFileSync(filename);
};

export const copyAccountData = async (
  connection: Connection,
  dataKey: PublicKey
) => {
  const data = (await connection.getAccountInfo(dataKey, "confirmed"))?.data;
  const proc = require("child_process").spawn("pbcopy");
  proc.stdin.write(data);
  proc.stdin.end();
};

export const PDA_SEED = "data_account_metadata";

const getPDAFromDataAccount = (dataKey: PublicKey): [PublicKey, number] => {
  const programId = new PublicKey(process.env.PROGRAM_ID as string);
  return PublicKey.findProgramAddressSync(
    [Buffer.from(PDA_SEED, "ascii"), dataKey.toBuffer()],
    programId
  );
};

export const parseMetadata = async (
  connection: Connection,
  dataKey: PublicKey,
  commitment: Commitment,
  debug?: boolean
): Promise<IDataAccountMeta> => {
  const [metaKey] = getPDAFromDataAccount(dataKey);
  const meta_account = await connection.getAccountInfo(metaKey, commitment);

  if (debug) {
    console.log("Raw Metadata:");
    console.log(meta_account?.data);
  }

  const account_meta = {} as IDataAccountMeta;
  if (meta_account && meta_account.data.length > 0) {
    const data_account_metadata = meta_account.data;
    account_meta.data_status = data_account_metadata.subarray(0, 1).readUInt8();
    account_meta.serialization_status = data_account_metadata
      .subarray(1, 2)
      .readUInt8();
    account_meta.authority = new PublicKey(
      data_account_metadata.subarray(2, 34)
    ).toBase58();
    account_meta.is_dynamic = data_account_metadata.subarray(34, 35).readUInt8()
      ? true
      : false;
    account_meta.data_version = new BN(
      data_account_metadata.subarray(35, 36),
      "le"
    ).toNumber();
    account_meta.data_type = new BN(
      data_account_metadata.subarray(36, 37),
      "le"
    ).toNumber();
    account_meta.bump_seed = new BN(
      data_account_metadata.subarray(37, 38),
      "le"
    ).toNumber();
  }

  return account_meta;
};

export const parseData = async (
  connection: Connection,
  dataKey: PublicKey,
  commitment: Commitment,
  debug?: boolean
): Promise<Buffer | undefined> => {
  const data_account = await connection.getAccountInfo(dataKey, commitment);

  if (debug) {
    console.log("Raw Data:");
    console.log(data_account?.data);
  }

  return data_account?.data;
};

export const parseDetails = async (
  connection: Connection,
  dataKey: PublicKey,
  commitment?: Commitment,
  debug?: boolean
): Promise<IDataAccount> => {
  return {
    meta: await parseMetadata(
      connection,
      dataKey,
      commitment ?? "confirmed",
      debug
    ),
    data: await parseData(
      connection,
      dataKey,
      commitment ?? "confirmed",
      debug
    ),
  };
};

const createDataAccount = async (
  connection: Connection,
  feePayer: PublicKey,
  initialSize: number
): Promise<[TransactionInstruction, Keypair]> => {
  const dataAccount = new Keypair();
  const programId = new PublicKey(process.env.PROGRAM_ID as string);
  const rentExemptAmount = await connection.getMinimumBalanceForRentExemption(
    initialSize
  );
  const createIx = SystemProgram.createAccount({
    fromPubkey: feePayer,
    newAccountPubkey: dataAccount.publicKey,
    lamports: rentExemptAmount,
    space: initialSize,
    programId: programId,
  });
  return [createIx, dataAccount];
};

const initializeDataAccount = (
  feePayer: PublicKey,
  dataAccount: PublicKey,
  authorityPK: PublicKey,
  isCreated: boolean,
  isDynamic: boolean,
  initialSize: number
): [TransactionInstruction, PublicKey] => {
  const [pda] = getPDAFromDataAccount(dataAccount);
  const programId = new PublicKey(process.env.PROGRAM_ID as string);
  const idx0 = Buffer.from(new Uint8Array([0]));
  const space = new BN(initialSize).toArrayLike(Buffer, "le", 8);
  const dynamic = Buffer.from(new Uint8Array([isDynamic ? 1 : 0]));
  const authority = authorityPK.toBuffer();
  const is_created = Buffer.from(new Uint8Array([isCreated ? 1 : 0]));
  const false_flag = Buffer.from(new Uint8Array([0]));
  const initializeIx = new TransactionInstruction({
    keys: [
      {
        pubkey: feePayer,
        isSigner: true,
        isWritable: true,
      },
      {
        pubkey: dataAccount,
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
    data: Buffer.concat([
      idx0,
      authority,
      space,
      dynamic,
      is_created,
      false_flag,
    ]),
  });

  return [initializeIx, pda];
};

const uploadDataPart = (
  feePayer: PublicKey,
  dataAccount: PublicKey,
  pdaKey: PublicKey | null,
  dataType: number,
  data: Buffer,
  offset: number,
  debug?: boolean
): TransactionInstruction => {
  let pda = pdaKey;
  if (!pda) {
    [pda] = getPDAFromDataAccount(dataAccount);
  }

  const programId = new PublicKey(process.env.PROGRAM_ID as string);

  const idx1 = Buffer.from(new Uint8Array([1]));
  const offset_buffer = new BN(offset).toArrayLike(Buffer, "le", 8);
  const true_flag = Buffer.from(new Uint8Array([1]));
  const false_flag = Buffer.from(new Uint8Array([0]));

  const data_type = new BN(dataType).toArrayLike(Buffer, "le", 1);
  const data_len = new BN(data.length).toArrayLike(Buffer, "le", 4);
  const updateIx = new TransactionInstruction({
    keys: [
      {
        pubkey: feePayer,
        isSigner: true,
        isWritable: true,
      },
      {
        pubkey: dataAccount,
        isSigner: false,
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
    data: Buffer.concat([
      idx1,
      data_type,
      data_len,
      data,
      offset_buffer,
      false_flag,
      true_flag,
      debug ? true_flag : false_flag,
    ]),
  });

  return updateIx;
};

const handleUpload = (
  connection: Connection,
  recentBlockhash: Readonly<{
    blockhash: string;
    lastValidBlockHeight: number;
  }>,
  txs: Transaction[],
  handleUploadStatus: ((tx: Transaction) => void) | null
): Promise<void>[] => {
  return txs.map(async (tx, idx, allTxs) => {
    const txid = await connection.sendRawTransaction(tx.serialize());
    await connection
      .confirmTransaction(
        {
          blockhash: recentBlockhash.blockhash,
          lastValidBlockHeight: recentBlockhash.lastValidBlockHeight,
          signature: txid,
        },
        "confirmed"
      )
      .then(() => {
        if (handleUploadStatus) {
          handleUploadStatus(tx);
        }
        console.log(
          `${idx + 1}/${
            allTxs.length
          }: https://explorer.solana.com/tx/${txid}?cluster=devnet`
        );
      });
  });
};

const updateDataAccountAuthority = (
  oldAuthority: PublicKey,
  dataAccount: PublicKey,
  pdaKey: PublicKey | null,
  newAuthority: PublicKey,
  debug?: boolean
): TransactionInstruction => {
  let pda = pdaKey;
  if (!pda) {
    [pda] = getPDAFromDataAccount(dataAccount);
  }

  const programId = new PublicKey(process.env.PROGRAM_ID as string);

  const idx2 = Buffer.from(new Uint8Array([2]));
  const true_flag = Buffer.from(new Uint8Array([1]));
  const false_flag = Buffer.from(new Uint8Array([0]));

  const updateAuthorityIx = new TransactionInstruction({
    keys: [
      {
        pubkey: oldAuthority,
        isSigner: true,
        isWritable: false,
      },
      {
        pubkey: dataAccount,
        isSigner: false,
        isWritable: false,
      },
      {
        pubkey: pda,
        isSigner: false,
        isWritable: true,
      },
      {
        pubkey: newAuthority,
        isSigner: true,
        isWritable: false,
      },
    ],
    programId: programId,
    data: Buffer.concat([idx2, debug ? true_flag : false_flag]),
  });

  return updateAuthorityIx;
};

const finalizeDataAccount = (
  feePayer: PublicKey,
  dataAccount: PublicKey,
  pdaKey: PublicKey | null,
  debug?: boolean
): TransactionInstruction => {
  let pda = pdaKey;
  if (!pda) {
    [pda] = getPDAFromDataAccount(dataAccount);
  }

  const programId = new PublicKey(process.env.PROGRAM_ID as string);

  const idx3 = Buffer.from(new Uint8Array([3]));
  const true_flag = Buffer.from(new Uint8Array([1]));
  const false_flag = Buffer.from(new Uint8Array([0]));

  const finalizeIx = new TransactionInstruction({
    keys: [
      {
        pubkey: feePayer,
        isSigner: true,
        isWritable: true,
      },
      {
        pubkey: dataAccount,
        isSigner: false,
        isWritable: false,
      },
      {
        pubkey: pda,
        isSigner: false,
        isWritable: true,
      },
    ],
    programId: programId,
    data: Buffer.concat([idx3, debug ? true_flag : false_flag]),
  });

  return finalizeIx;
};

const closeDataAccount = (
  feePayer: PublicKey,
  dataAccount: PublicKey,
  pdaKey: PublicKey | null,
  debug?: boolean
): TransactionInstruction => {
  let pda = pdaKey;
  if (!pda) {
    [pda] = getPDAFromDataAccount(dataAccount);
  }

  const programId = new PublicKey(process.env.PROGRAM_ID as string);

  const idx4 = Buffer.from(new Uint8Array([4]));
  const true_flag = Buffer.from(new Uint8Array([1]));
  const false_flag = Buffer.from(new Uint8Array([0]));

  const closeIx = new TransactionInstruction({
    keys: [
      {
        pubkey: feePayer,
        isSigner: true,
        isWritable: true,
      },
      {
        pubkey: dataAccount,
        isSigner: false,
        isWritable: true,
      },
      {
        pubkey: pda,
        isSigner: false,
        isWritable: true,
      },
    ],
    programId: programId,
    data: Buffer.concat([idx4, debug ? true_flag : false_flag]),
  });

  return closeIx;
};

export class DataProgram {
  static getPDA = getPDAFromDataAccount;
  static createDataAccount = createDataAccount;
  static initializeDataAccount = initializeDataAccount;
  static updateDataAccount = uploadDataPart;
  static updateDataAccountAuthority = updateDataAccountAuthority;
  static finalizeDataAccount = finalizeDataAccount;
  static closeDataAccount = closeDataAccount;
  static parseMetadata = parseMetadata;
  static parseData = parseData;
  static parseDetails = parseDetails;
}
