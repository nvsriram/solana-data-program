import { Connection, PublicKey } from "@solana/web3.js";
import { Schema, deserialize } from "borsh";
import { parseData } from "./parseData";

export const parseBorsh = async (connection: Connection, dataKey: PublicKey, schema: Schema, classType: new (args: any) => unknown) => {
    parseData(connection, dataKey)
    .then((account_state) => {
        if (account_state?.account_data?.data) {
            let {data} = account_state.account_data.data;
            const data_borsh = deserialize(schema, classType, data)

            console.log("Parsed Data:");
            console.log(account_state);
            console.log(JSON.stringify(data_borsh, null, 2));
        }
    });
};