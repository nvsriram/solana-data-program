import { Keypair } from "@solana/web3.js";
import { readFileSync } from "fs";

export const loadKeypairFromFile = (filename: string): Keypair => {
    const secret = JSON.parse(readFileSync(filename).toString()) as number[];
    const secretKey = Uint8Array.from(secret);
    return Keypair.fromSecretKey(secretKey);
  }