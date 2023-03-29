import { Connection, PublicKey } from "@solana/web3.js";
import { DataProgram } from "../src/util/utils";
import { DataTypeOption } from "./util/types";

const main = async (
  connection: Connection,
  dataPK: PublicKey,
  debug?: boolean
) => {
  console.log("Data Account:", dataPK.toBase58());
  const details = await DataProgram.parseDetails(
    connection,
    dataPK,
    "confirmed",
    debug
  );
  console.log(JSON.stringify(details.meta, null, 2));
  if (details.meta.data_type === DataTypeOption.JSON) {
    if (details.data) {
      console.log(JSON.stringify(JSON.parse(details.data.toString()), null, 2));
    }
  }
};

export default main;
