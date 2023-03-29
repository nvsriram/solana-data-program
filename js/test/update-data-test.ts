import {
  Connection,
  sendAndConfirmTransaction,
  Keypair,
  Transaction,
  ConfirmOptions,
} from "@solana/web3.js";
import { DataProgram } from "../src/util/utils";
import { DataTypeOption } from "../src/util/types";
import { assert } from "./util/utils";

const main = async (connection: Connection, feePayer: Keypair) => {
  console.log("Feepayer:", feePayer.publicKey.toBase58());
  const dataAccount = new Keypair();
  console.log("Data Account:", dataAccount.publicKey.toBase58());

  const message = "Hxxlo";
  console.log(message);

  const [initializeIx, pda] = DataProgram.initializeDataAccount(
    feePayer.publicKey,
    dataAccount.publicKey,
    feePayer.publicKey,
    false,
    true,
    message.length
  );
  console.log("PDA:", pda.toBase58());
  const initializeTx = new Transaction();
  initializeTx.add(initializeIx);
  console.log("initializing data account and pda");
  await sendAndConfirmTransaction(
    connection,
    initializeTx,
    [feePayer, dataAccount],
    {
      skipPreflight: true,
      preflightCommitment: "finalized",
      confirmation: "finalized",
    } as ConfirmOptions
  );

  const updateIx = DataProgram.updateDataAccount(
    feePayer.publicKey,
    dataAccount.publicKey,
    pda,
    DataTypeOption.CUSTOM,
    Buffer.from(message, "ascii"),
    0,
    false
  );
  const updateTx = new Transaction();
  updateTx.add(updateIx);
  console.log("updating data account with CUSTOM data");
  await sendAndConfirmTransaction(connection, updateTx, [feePayer], {
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
    meta.data_type === DataTypeOption.CUSTOM,
    `data type didn't match - expected ${DataTypeOption.CUSTOM}, got ${meta.data_type}`
  );

  const updateTypeIx = DataProgram.updateDataAccount(
    feePayer.publicKey,
    dataAccount.publicKey,
    pda,
    DataTypeOption.HTML,
    Buffer.from([]),
    0,
    false
  );
  const updateTypeTx = new Transaction();
  updateTypeTx.add(updateTypeIx);
  console.log("updating data account datatype to HTML");
  await sendAndConfirmTransaction(connection, updateTypeTx, [feePayer], {
    skipPreflight: true,
    preflightCommitment: "finalized",
    confirmation: "finalized",
  } as ConfirmOptions);
  const typeMeta = await DataProgram.parseMetadata(
    connection,
    dataAccount.publicKey,
    "confirmed",
    false
  );
  assert(
    typeMeta.data_type === DataTypeOption.HTML,
    `data type didn't match - expected ${DataTypeOption.HTML}, got ${typeMeta.data_type}`
  );

  const updateDataIx = DataProgram.updateDataAccount(
    feePayer.publicKey,
    dataAccount.publicKey,
    pda,
    DataTypeOption.HTML,
    Buffer.from("el", "ascii"),
    1,
    false
  );
  const updateDataTx = new Transaction();
  updateDataTx.add(updateDataIx);
  console.log(`replacing "xx" in data with "el"`);
  await sendAndConfirmTransaction(connection, updateDataTx, [feePayer], {
    skipPreflight: true,
    preflightCommitment: "finalized",
    confirmation: "finalized",
  } as ConfirmOptions);
  const updateData = await DataProgram.parseData(
    connection,
    dataAccount.publicKey,
    "confirmed",
    false
  );
  assert(updateData != undefined, `data was undefined`);
  if (updateData != undefined) {
    console.log(updateData.toString());
    assert(
      updateData.toString() === "Hello",
      `data didn't match - expected Hello, got ${updateData.toString()}`
    );
  }

  const appendDataIx = DataProgram.updateDataAccount(
    feePayer.publicKey,
    dataAccount.publicKey,
    pda,
    DataTypeOption.HTML,
    Buffer.from(" World!", "ascii"),
    5,
    false
  );
  const appendDataTx = new Transaction();
  appendDataTx.add(appendDataIx);
  console.log(`appending " World!" to data`);
  await sendAndConfirmTransaction(connection, appendDataTx, [feePayer], {
    skipPreflight: true,
    preflightCommitment: "finalized",
    confirmation: "finalized",
  } as ConfirmOptions);
  const appendData = await DataProgram.parseData(
    connection,
    dataAccount.publicKey,
    "confirmed",
    false
  );
  assert(appendData != undefined, `data was undefined`);
  if (appendData != undefined) {
    console.log(appendData.toString());
    assert(
      appendData.toString() === "Hello World!",
      `data didn't match - expected Hello World!, got ${appendData.toString()}`
    );
  }

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
