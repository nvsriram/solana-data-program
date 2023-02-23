import { Connection, PublicKey } from "@solana/web3.js";
import BN from "bn.js";
import { IDataAccount, IDataAccountMeta } from "./common/types";
  
export const parseData = async (connection: Connection, dataKey: PublicKey, metaKey: PublicKey, debug?: boolean): Promise<IDataAccount> => {
  const data_account = await connection.getAccountInfo(dataKey, "confirmed");
  const meta_account = await connection.getAccountInfo(metaKey, "confirmed");

  if (debug) {
    console.log("Raw Metadata:");
    console.log(meta_account?.data);
    console.log("Raw Data:");
    console.log(data_account?.data);
  }
  
  const account_meta = {} as IDataAccountMeta;
  if (meta_account && meta_account.data.length > 0) {
    const data_account_metadata = meta_account.data;
    account_meta.data_status = data_account_metadata.subarray(0, 1).readUInt8()
    account_meta.serialization_status = data_account_metadata.subarray(1, 2).readUInt8()
    account_meta.authority = new PublicKey(
      data_account_metadata.subarray(2, 34)
    ).toBase58();
    account_meta.is_dynamic = data_account_metadata.subarray(34, 35).readUInt8() ? true : false;
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

  return {
    meta: account_meta,
    data: data_account?.data
  };
}