import {
  Connection,
  sendAndConfirmTransaction,
  Keypair,
  Transaction,
  ConfirmOptions,
} from "@solana/web3.js";
import { DataProgram } from "../src/util/utils";
import {
  DataStatusOption,
  DataTypeOption,
  SerializationStatusOption,
} from "../src/util/types";
import { assert } from "./util/utils";

const main = async (connection: Connection, feePayer: Keypair) => {
  console.log("Feepayer:", feePayer.publicKey.toBase58());
  const oldLamps =
    (await connection.getAccountInfo(feePayer.publicKey, "finalized"))
      ?.lamports ?? 0;
  console.log("feepayer:", oldLamps, "lamports");
  const dataAccount = new Keypair();
  console.log("Data Account:", dataAccount.publicKey.toBase58());

  const object = { message: "Hello World!", author: "Jane Doe" };
  const message = JSON.stringify(object);
  console.log(message);

  const [initializeIx, pda] = DataProgram.initializeDataAccount(
    feePayer.publicKey,
    dataAccount.publicKey,
    feePayer.publicKey,
    false,
    false,
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
    } as ConfirmOptions
  );

  const updateIx = DataProgram.updateDataAccount(
    feePayer.publicKey,
    dataAccount.publicKey,
    pda,
    DataTypeOption.JSON,
    Buffer.from(message, "ascii"),
    0,
    false
  );
  const updateTx = new Transaction();
  updateTx.add(updateIx);
  console.log("updating data account with data");
  await sendAndConfirmTransaction(connection, updateTx, [feePayer], {
    skipPreflight: true,
  } as ConfirmOptions);

  const details = await DataProgram.parseDetails(
    connection,
    dataAccount.publicKey,
    "confirmed",
    false
  );

  assert(
    details.meta.authority === feePayer.publicKey.toBase58(),
    `authority didn't match - expected ${feePayer.publicKey.toBase58()}, got ${
      details.meta.authority
    }`
  );
  assert(
    details.meta.serialization_status === SerializationStatusOption.UNVERIFIED,
    `serialization status didn't match - expected ${SerializationStatusOption.UNVERIFIED}, got ${details.meta.serialization_status}`
  );
  assert(
    details.meta.data_status === DataStatusOption.INITIALIZED,
    `data status didn't match - expected ${DataStatusOption.INITIALIZED}, got ${details.meta.data_status}`
  );
  assert(
    !details.meta.is_dynamic,
    `is dynamic didn't match - expected ${false}, got ${
      details.meta.is_dynamic
    }`
  );
  assert(
    details.meta.data_type === DataTypeOption.JSON,
    `data type didn't match - expected ${DataTypeOption.JSON}, got ${details.meta.data_type}`
  );
  assert(details.data != undefined, `data was undefined`);
  if (details.data) {
    assert(
      JSON.stringify(JSON.parse(details.data.toString())) === message,
      `data didn't match - expected ${message}, got ${JSON.stringify(
        JSON.parse(details.data.toString())
      )}`
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

  const lamps =
    (await connection.getAccountInfo(feePayer.publicKey, "finalized"))
      ?.lamports ?? 0;
  console.log("feepayer:", lamps, "lamports");
  console.log("closing data account and pda account");
  await sendAndConfirmTransaction(connection, closeTx, [feePayer], {
    skipPreflight: true,
  } as ConfirmOptions);
  const [newFeePayerInfo, newDataAccountInfo, newPdaInfo] = await Promise.all([
    connection.getAccountInfo(feePayer.publicKey, "finalized"),
    connection.getAccountInfo(dataAccount.publicKey, "finalized"),
    connection.getAccountInfo(pda, "finalized"),
  ]);
  const newLamps = newFeePayerInfo?.lamports ?? 0;
  console.log("feepayer:", newLamps, "lamports");
  assert(newDataAccountInfo == null, `dataAccountInfo was not null`);
  assert(newPdaInfo == null, `PDAInfo was not null`);
  assert(
    newLamps > lamps,
    `updated lamports (${newLamps}) was not greater than before ${lamps}`
  );
};

export default main;
