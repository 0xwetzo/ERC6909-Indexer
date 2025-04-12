import "dotenv/config";
import { z } from "zod";
import type { Network } from "./classes/Indexer";
import { anvil, mainnet, base, optimism } from "viem/chains"; // <-- 1. import the chain to add here
import { Explorer } from "./types/Explorer";
import { Etherscan } from "./classes/Etherscan";
import { Mockscan } from "./classes/Mockscan";

const envSchema = z.object({
    PORT: z.coerce
        .number()
        .refine((val) => !isNaN(val) && val > 0 && val <= 65535, {
            message: "PORT must be a valid port number between 1 and 65535",
        })
        .default(6909),
    ETHERSCAN_API_KEY: z.string().min(1, "Etherscan API key is required"),
    MAINNET_RPC_URL: z.string().url("Invalid RPC URL for Mainnet"),
    BASE_RPC_URL: z.string().url("Invalid RPC URL for Base"),
    OPTIMISM_RPC_URL: z.string().url("Invalid RPC URL for Optimism"),
}); // <-- 2. add the chain rpc url for validation

// Validate process.env against the schema
let envVars;
try {
    envVars = envSchema.parse(process.env);
    console.log("Environment variables validated successfully.");
} catch (error: any) {
    console.error("Environment variable validation failed:", error.errors);
    process.exit(1); // Exit the application if validation fails
}

// Use the validated variables
const {
    ETHERSCAN_API_KEY,
    MAINNET_RPC_URL,
    BASE_RPC_URL,
    OPTIMISM_RPC_URL,
    PORT,
} = envVars; // <-- 3. expose the chain rpc url variable

const explorers: Record<string, Explorer> = {
    etherscan: new Etherscan(ETHERSCAN_API_KEY),
    mockscan: new Mockscan(),
};

export const networks: Record<number, Network> = {
    [anvil.id]: {
        chain: anvil,
        rpc: "http://127.0.0.1:8545",
        explorer: explorers.mockscan,
        blockTolerance: 0,
    },
    [mainnet.id]: {
        chain: mainnet,
        rpc: MAINNET_RPC_URL,
        explorer: explorers.etherscan,
        blockTolerance: 5, // <-- optional (default 100): how many blocks do you accept to be behind at most (for 12 seconds blocks, 5 = 1 minute)
        blockRange: 10_000, // <-- optional (default 10_000): how many blocks does your RPC provider allow you to fetch in 1 call
    },
    [base.id]: {
        chain: base,
        rpc: BASE_RPC_URL,
        explorer: explorers.etherscan,
    },
    [optimism.id]: {
        chain: optimism,
        rpc: OPTIMISM_RPC_URL,
        explorer: explorers.etherscan,
    },
}; // <-- 4. create a new entry for the chain

export const getNetwork = (chainId: number): Network => networks[chainId];
export const getPort = (): number => PORT;
