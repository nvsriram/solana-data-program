import { Connection, PublicKey } from "@solana/web3.js";
import { parseData } from "./parseData";

export const parseJSON = async (connection: Connection, dataKey: PublicKey, metaKey: PublicKey, debug?: boolean) => {
    parseData(connection, dataKey, metaKey, debug)
    .then((account_state) => {
        if (account_state.data) {
            if (debug) {
                console.log("Parsed Metadata:");
                console.log(account_state.meta);
            }
            
            const { data } = account_state;
            let data_json = data.toString();
            if (data_json.length > 0) {
                if (debug) {
                    try {
                        data_json = JSON.parse(data.toString());
                    }
                    catch(err) {
                        console.error("JSON parse error: ");
                    }
                    console.log(JSON.stringify(data_json, null, 2));
                }
            }
        }
    });
};