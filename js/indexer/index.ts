import { Connection, PublicKey, PartiallyDecodedInstruction } from "@solana/web3.js";
import { Client } from 'pg';
import * as dotenv from 'dotenv';
import * as bs58 from "bs58";
import { parseData } from "../src/parseData";
import { BN } from "bn.js";

let changes = 0;
const MAX_CHANGES = 10;
const DELAY = 10*1000;

dotenv.config();
const programId = new PublicKey(process.env.PROGRAM_ID as string);
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
    let data_account_set = new Set<string>();
    connection.getSignaturesForAddress(programId)
    .then(async (transactions) => {
        for (let idx = 0; idx < transactions.length; ++idx) {
            const transaction = transactions[idx];
            await connection.getParsedTransaction(transaction.signature)
            .then((txInfo) => {
                const tx = txInfo?.transaction; 
                const instructions = tx?.message.instructions;
                if (!instructions) return;
                for (let i = instructions.length - 1; i >= 0; --i) {
                    const ix = instructions[i] as PartiallyDecodedInstruction;
                    if (!ix.data) return;              
                    let decoded = bs58.decode(ix.data);
                    // if UpdateDataAccount instruction with commit_flag
                    if (decoded[0] !== 1 && decoded[decoded.length - 2] !== 1) continue;
                    if (ix.accounts.length < 2) {
                        console.error("Missing accounts");
                        continue;
                    }
                    const dataKey = ix.accounts[1];
                    const dataPubKey = dataKey.toBase58();
                    // ensure its not reupdated by previous transaction ix
                    if (data_account_set.has(dataPubKey)) continue;
                    data_account_set.add(dataPubKey);
                    const ix_data = Buffer.from(decoded.slice(1));
                    const data_type = new BN(
                        ix_data.subarray(0, 1),
                        "le"
                    ).toNumber();
                    const data = ix_data.subarray(5);
                    const dataJSON = data?.toJSON();

                    parseData(connection, dataKey)
                    .then((account_state) => {
                        if (Object.keys(account_state).length === 0) return;
                        const { authority, serialization_status } = account_state;
                        connectDb().then((client) => {
                            // check if row already present
                            client?.query(SELECTQUERY, [dataPubKey])
                                .then((res) => {
                                    // if present
                                    if (res.rowCount === 1) {
                                        client.query(
                                            UPDATEQUERY, 
                                            [data_type, dataJSON, transaction.signature, serialization_status, dataPubKey]
                                        )
                                        .then((res) => {
                                            if (res.rowCount === 1) {
                                                ++changes;
                                                console.log("updated row", transaction.signature);
                                            }
                                            client.end();
                                        })
                                        .catch((err) => { console.log(err.stack); });
                                    } 
                                    // not present
                                    else {
                                        client?.query(
                                            INSERTQUERY,
                                            [dataPubKey, authority, data_type, dataJSON, transaction.signature, serialization_status]
                                        )
                                        .then((res) => {
                                            if (res.rowCount === 1) {
                                                ++changes;
                                                console.log("inserted row", transaction.signature);
                                            }
                                            client.end();
                                        })
                                        .catch((err) => { console.error(err.stack); });
                                    }
                                })
                                .catch((err) => { console.error(err.stack); });
                        });
                    });
                }
            });
        }
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

