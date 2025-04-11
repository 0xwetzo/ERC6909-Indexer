export interface Explorer {
    getCreationBlock(contractAddress: string): Promise<number>;
}
