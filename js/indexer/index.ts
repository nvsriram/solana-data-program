import { Connection, PublicKey, PartiallyDecodedInstruction } from "@solana/web3.js";
import { Client } from 'pg';
import * as dotenv from 'dotenv';
import * as bs58 from "bs58";
import { PROGRAM_ID } from "../src/common/constants";
import { parseData } from "../src/parseData";

let changes = 0;
const MAX_CHANGES = 2;
const DELAY = 10*1000;

dotenv.config();
const programId = new PublicKey(PROGRAM_ID);
const connection = new Connection("http://localhost:8899");

const SELECTQUERY = "SELECT * FROM DataAccountIndexer WHERE data_account = $1";
const UPDATEQUERY = "UPDATE DataAccountIndexer SET data_type = $1, data = $2, tx_id = $3, serialization_status= $4 WHERE data_account = $5 AND tx_id <> $3";
const INSERTQUERY = "INSERT INTO DataAccountIndexer(data_account, authority, data_type, data, tx_id, serialization_status) VALUES ($1, $2, $3, $4, $5, $6)";


const connectDb = async () => {
    let client: Client | null = null;
    try {
        client = new Client({
            user: process.env.PGUSER,
            host: process.env.PGHOST,
            database: process.env.PGDATABASE,
            password: process.env.PGPASSWORD,
            port: parseInt(process.env.PGPORT as string, 10)
        })
        await client.connect();
    } catch (error) {
        console.log(error)
    }
    return client;
}

const populateDB = async () => {
    connection.getSignaturesForAddress(programId)
    .then((transactions) => {
        transactions.forEach((transaction, idx) => {
            connection.getParsedTransaction(transaction.signature)
            .then((txInfo) => {
                const tx = txInfo?.transaction; 
                const instructions = tx?.message.instructions;
                instructions?.forEach((instruction) => {
                    const ix = instruction as PartiallyDecodedInstruction;
                    const decoded = bs58.decode(ix.data);
                    // if FinalizeAccount instruction with verify_flag
                    if (decoded.length === 2 && decoded[0] === 4) {
                        if (ix.accounts.length < 2) {
                            console.error("Missing accounts");
                        }
                        const dataKey = ix.accounts[1];
                        parseData(connection, dataKey).then((account_state) => {
                            if (account_state.account_data) {
                                const { data_type, data } = account_state.account_data;
                                const dataPubKey = dataKey.toBase58();
                                const dataJSON = data?.data.toJSON();
                            
                                connectDb().then((client) => {
                                    // check if row already present
                                    client?.query(SELECTQUERY, [dataPubKey])
                                        .then((res) => {
                                            // if present
                                            if (res.rowCount === 1) {
                                                client.query(
                                                    UPDATEQUERY, 
                                                    [data_type, dataJSON, transaction.signature, account_state.serialization_status, dataPubKey]
                                                )
                                                .then((res) => {
                                                    if (res.rowCount === 1) {
                                                        ++changes;
                                                        console.log("updated row");
                                                    }
                                                    client.end();
                                                })
                                                .catch((err) => { console.log(err.stack); });
                                            } 
                                            // not present
                                            else {
                                                client?.query(
                                                    INSERTQUERY,
                                                    [dataPubKey, account_state.authority, data_type, dataJSON, transaction.signature, account_state.serialization_status]
                                                )
                                                .then((res) => {
                                                    if (res.rowCount === 1) {
                                                        ++changes;
                                                        console.log("inserted row");
                                                    }
                                                    client.end();
                                                })
                                                .catch((err) => { console.error(err.stack); });
                                            }
                                        })
                                        .catch((err) => { console.error(err.stack); });
                                });
                            }
                        })
                        
                    }
                });
            });
        })
    });    
};

const main = async () => {
    populateDB()
    .then(() => {
        if (changes < MAX_CHANGES) {
            setTimeout(main, DELAY); 
        }
    })
    .catch((err) => { console.error(err); });
}

main();

