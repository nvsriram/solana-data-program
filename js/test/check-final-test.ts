import {
  Connection,
  sendAndConfirmTransaction,
  Keypair,
  Transaction,
  ConfirmOptions,
  SimulateTransactionConfig,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";
import { DataStatusOption, DataTypeOption } from "../src/util/types";
import { DataProgram } from "../src/util/utils";
import { assert } from "./util/utils";

const main = async (connection: Connection, feePayer: Keypair) => {
  console.log("Authority:", feePayer.publicKey.toBase58());
  const dataAccount = new Keypair();
  console.log("Data Account:", dataAccount.publicKey.toBase58());

  const [initializeIx, pda] = DataProgram.initializeDataAccount(
    feePayer.publicKey,
    dataAccount.publicKey,
    feePayer.publicKey,
    false,
    true,
    0
  );
  const initializeTx = new Transaction();
  initializeTx.add(initializeIx);
  console.log("initializing data account and pda");
  await sendAndConfirmTransaction(
    connection,
    initializeTx,
    [feePayer, dataAccount],
    {
      skipPreflight: true,
    } as ConfirmOptions
  );
  console.log("PDA:", pda.toBase58());

  const finalizeIx = DataProgram.finalizeDataAccount(
    feePayer.publicKey,
    dataAccount.publicKey,
    pda,
    false
  );
  const finalizeTx = new Transaction();
  finalizeTx.add(finalizeIx);
  console.log("finalizing data account");
  await sendAndConfirmTransaction(connection, finalizeTx, [feePayer], {
    skipPreflight: true,
    preflightCommitment: "finalized",
    confirmation: "finalized",
  } as ConfirmOptions);

  const meta = await DataProgram.parseMetadata(
    connection,
    dataAccount.publicKey,
    "confirmed",
    false
  );
  assert(
    meta.data_status === DataStatusOption.FINALIZED,
    `data status didn't match - expected ${DataStatusOption.FINALIZED}, got ${meta.data_status}`
  );

  const simulateIx = DataProgram.updateDataAccount(
    feePayer.publicKey,
    dataAccount.publicKey,
    pda,
    DataTypeOption.HTML,
    Buffer.from([]),
    0,
    false
  );
  const messageV0 = new TransactionMessage({
    payerKey: feePayer.publicKey,
    recentBlockhash: (await connection.getLatestBlockhash("finalized"))
      .blockhash,
    instructions: [simulateIx],
  }).compileToV0Message();
  const simulateTx = new VersionedTransaction(messageV0);
  console.log("simulate updating data account");
  const simulateData = await connection.simulateTransaction(simulateTx, {
    sigVerify: false,
  } as SimulateTransactionConfig);
  assert(simulateData.value.err != null, `simulate did not error out`);
  assert(
    JSON.stringify(simulateData.value.err).indexOf(`"Custom":10`) != -1,
    `simulate error ("Custom":10) was not found`
  );

  const closeIx = DataProgram.closeDataAccount(
    feePayer.publicKey,
    dataAccount.publicKey,
    pda,
    false
  );
  const closeTx = new Transaction();
  closeTx.add(closeIx);
  console.log("closing data account and pda account");
  await sendAndConfirmTransaction(connection, closeTx, [feePayer], {
    skipPreflight: true,
    preflightCommitment: "finalized",
    confirmation: "finalized",
  } as ConfirmOptions);
};

export default main;
