import axios from "axios";

export class Etherscan {
    apiKey: string;

    constructor(apiKey: string) {
        this.apiKey = apiKey;
    }

    /**
     * Retrieves the block number of the block where the given contract was deployed
     * @param contractAddress the address of the contract
     * @returns the block number
     */
    async getCreationBlock(contractAddress: string): Promise<number> {
        const response = await axios.get(
            `https://api.etherscan.io/api?module=contract&action=getcontractcreation&contractaddresses=${contractAddress}&apikey=${this.apiKey}`
        );
        return Number(response.data.result[0].blockNumber);
    }
}
