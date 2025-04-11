import axios from "axios";
import { Explorer } from "../types/Explorer";

export class Mockscan implements Explorer {
    private apiKey: string;

    constructor(apiKey: string) {
        this.apiKey = apiKey;
    }

    /**
     * Retrieves the block number of the block where the given contract was deployed
     * @param contractAddress the address of the contract
     * @returns the block number
     */
    async getCreationBlock(
        chainId: number,
        contractAddress: string
    ): Promise<number> {
        try {
            const response = await axios.get(
                `https://127.0.0.1:8000/api?chainid=${chainId}&contractaddresses=${contractAddress}&apikey=${this.apiKey}`
            );
            return Number(response.data.result.blockNumber);
        } catch (error) {
            throw new Error(`Failed to fetch creation block: ${error}`);
        }
    }
}
