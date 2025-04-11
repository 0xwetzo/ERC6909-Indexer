import "dotenv/config";
import { z } from "zod";
import type { Network } from "./classes/Indexer";
import { mainnet, base, optimism } from "viem/chains";

const envSchema = z.object({
    ETHERSCAN_API_KEY: z.string().min(1, "Etherscan API key is required"),
    PORT: z.coerce
        .number()
        .refine((val) => !isNaN(val) && val > 0 && val <= 65535, {
            message: "PORT must be a valid port number between 1 and 65535",
        })
        .default(6909),
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

const apiKeys: Record<string, string> = {
    Etherscan: ETHERSCAN_API_KEY,
};

export const networks: Record<number, Network> = {
    [mainnet.id]: {
        chain: mainnet,
        rpc: "https://eth.llamarpc.com",
        explorer: "Etherscan",
    },
    [base.id]: {
        chain: base,
        rpc: "https://base.llamarpc.com",
        explorer: "Etherscan",
    },
    [optimism.id]: {
        chain: optimism,
        rpc: "https://optimism.llamarpc.com",
        explorer: "Etherscan",
    },
};

export const getNetwork = (chainId: number): Network => networks[chainId];
export const getApiKeys = (): Record<string, string> => apiKeys;
export const getPort = (): number => PORT;
