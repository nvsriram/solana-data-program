import { Connection, PublicKey } from "@solana/web3.js";
import { parseData } from "./parseData";

export const parseJSON = async (connection: Connection, dataKey: PublicKey, debug?: boolean) => {
    parseData(connection, dataKey, debug)
    .then((account_state) => {
        if (account_state?.account_data?.data) {
            if (debug) {
                console.log("Parsed Data:");
                console.log(account_state);
            }
            
            const {len, data} = account_state.account_data.data;
            if (len > 0) {
                const data_json = JSON.parse(data.toString());
                if (debug) {
                    console.log(JSON.stringify(data_json, null, 2));
                }
            }
        }
    });
};