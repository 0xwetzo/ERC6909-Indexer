import { Explorer } from "../types/Explorer";
import fs from "fs/promises";
import path from "path";

export class Mockscan implements Explorer {
    private configFile: string;

    constructor(configFilePath: string = "../../mockscan.txt") {
        this.configFile = path.resolve(configFilePath);
    }

    async getCreationBlock(
        _chainId: number,
        _contractAddress: string
    ): Promise<number> {
        try {
            const fileContent = await fs.readFile(this.configFile, "utf-8");
            const blockNumber = Number(fileContent.trim());

            if (isNaN(blockNumber)) {
                throw new Error("Invalid block number in config file");
            }

            return blockNumber;
        } catch (error) {
            throw new Error(
                `Failed to read or parse block number from ${this.configFile}: ${error}`
            );
        }
    }
}
