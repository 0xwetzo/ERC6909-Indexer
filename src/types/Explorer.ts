export interface Explorer {
    getCreationBlock(chainId: number, contractAddress: string): Promise<number>;
}
