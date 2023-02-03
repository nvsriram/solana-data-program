import { Connection, PublicKey } from "@solana/web3.js";
import { Schema, deserialize } from "borsh";
import { parseData } from "./parseData";

export const parseBorsh = async (connection: Connection, dataKey: PublicKey, schema: Schema, classType: new (args: any) => unknown, debug?: boolean) => {
    parseData(connection, dataKey, debug)
    .then((account_state) => {
        if (account_state?.account_data?.data) {
            if (debug) {
                console.log("Parsed Data:");
                console.log(account_state);
            }
            
            const {len, data} = account_state.account_data.data;
            if (len > 0) {
                const data_borsh = deserialize(schema, classType, data)
                if (debug) {
                    console.log(JSON.stringify(data_borsh, null, 2));
                }
            }
        }
    });
};