import "dotenv/config";
import { z } from "zod";
import type { Network } from "./classes/Indexer";
import { anvil, mainnet, base, optimism } from "viem/chains";
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
});

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
const { ETHERSCAN_API_KEY, PORT } = envVars;

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
        rpc: "https://eth.llamarpc.com",
        explorer: explorers.etherscan,
    },
    [base.id]: {
        chain: base,
        rpc: "https://base.llamarpc.com",
        explorer: explorers.etherscan,
    },
    [optimism.id]: {
        chain: optimism,
        rpc: "https://optimism.llamarpc.com",
        explorer: explorers.etherscan,
    },
};

export const getNetwork = (chainId: number): Network => networks[chainId];
export const getPort = (): number => PORT;
