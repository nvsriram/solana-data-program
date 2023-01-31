import { Connection, PublicKey } from "@solana/web3.js";
import { parseData } from "./parseData";

export const parseJSON = async (connection: Connection, dataKey: PublicKey) => {
    parseData(connection, dataKey)
    .then((account_state) => {
        if (account_state?.account_data?.data) {
            let {data} = account_state.account_data.data;
            const data_json = JSON.parse(data.toString());

            console.log("Parsed Data:");
            console.log(account_state);
            console.log(JSON.stringify(data_json, null, 2));
        }
    });
};