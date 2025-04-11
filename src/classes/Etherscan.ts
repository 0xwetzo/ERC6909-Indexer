import axios from "axios";
import { Explorer } from "../types/Explorer";

export class Etherscan implements Explorer {
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
                `https://api.etherscan.io/api?chainid=${chainId}&module=contract&action=getcontractcreation&contractaddresses=${contractAddress}&apikey=${this.apiKey}`
            );
            return Number(response.data.result[0].blockNumber);
        } catch (error) {
            throw new Error(`Failed to fetch creation block: ${error}`);
        }
    }
}
