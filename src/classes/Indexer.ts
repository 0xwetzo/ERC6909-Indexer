import { Database } from "aloedb-node";
import {
    createPublicClient,
    getAddress,
    http,
    parseAbi,
    zeroAddress,
} from "viem";
import type { Address, Chain, PublicClient } from "viem";
import { Etherscan } from "./Etherscan";

interface Output {
    holder: string;
    balance: string;
}

interface Holder extends Output {
    chain: number;
    tokenAddress: string;
    tokenId: number;
}

interface ProcessEventsFrom {
    chain: number;
    tokenAddress: string;
    block: number;
}

interface CachedBlock {
    chain: number;
    block: number;
    time: number;
}

export interface Network {
    chain: Chain;
    rpc: string;
    explorer: string;
}

const holders = new Database<Holder>({ path: "../.db/holders.db" });
const processEventsFrom = new Database<ProcessEventsFrom>({
    path: "../.db/process_events_from.db",
});
const currentBlock = new Database<CachedBlock>({
    path: "../.db/current_block.db",
});

const db = {
    holders,
    processEventsFrom,
    currentBlock,
};

export class Indexer {
    chain: Chain;
    rpc: string;
    explorer: string;
    apikeys: Record<string, string>;
    blockRange: number;
    blockTolerance: number;
    blockIntervalMs: number;
    db: {
        holders: Database<Holder>;
        processEventsFrom: Database<ProcessEventsFrom>;
        currentBlock: Database<CachedBlock>;
    };

    constructor(
        network: Network,
        apiKeys: Record<string, string>,
        blockRange: number = 10_000,
        blockTolerance: number = 100,
        blockIntervalMs: number = 60 * 1000
    ) {
        this.chain = network.chain;
        this.rpc = network.rpc;
        this.explorer = network.explorer;
        this.apikeys = apiKeys;
        this.db = db;
        this.blockRange = blockRange;
        this.blockTolerance = blockTolerance;
        this.blockIntervalMs = blockIntervalMs;
    }

    // Use to initialize token creation block before starting the indexer
    async setCreationBlock(token: Address): Promise<number> {
        const creationBlock = await new Etherscan(
            this.chain.id,
            this.apikeys[this.explorer]
        ).getCreationBlock(getAddress(token));

        await this.db.processEventsFrom.insertOne({
            chain: this.chain.id,
            tokenAddress: getAddress(token),
            block: creationBlock,
        });

        return creationBlock;
    }

    // Get the list of holders of a given token with pagination
    async getHolders(
        tokenAddress: Address,
        tokenId: number,
        sort: "ASC" | "DESC",
        maxResults: number,
        page: number = 0
    ): Promise<Output[]> {
        // Update the holders
        await this.fetchEvents(getAddress(tokenAddress));

        const holders = await this.db.holders.findMany({
            chain: this.chain.id,
            tokenAddress: getAddress(tokenAddress),
            tokenId,
        });

        const lastElement =
            Math.min(holders.length, (page + 1) * maxResults) - 1;

        return holders
            .sort((a, b) =>
                sort === "ASC"
                    ? a.balance.localeCompare(b.balance)
                    : b.balance.localeCompare(a.balance)
            )
            .map((holder) => {
                return {
                    holder: holder.holder,
                    balance: holder.balance,
                };
            })
            .slice(page * maxResults, lastElement);
    }

    private getPublicClient(): PublicClient {
        return createPublicClient({
            chain: this.chain,
            transport: http(this.rpc),
        });
    }

    private async fetchEvents(tokenAddress: Address): Promise<void> {
        let currentBlock = await this.getBlockNumber();

        let fromBlock = (
            await this.db.processEventsFrom.findOne({
                chain: this.chain.id,
                tokenAddress,
            })
        )?.block;

        if (!fromBlock) {
            fromBlock = await this.setCreationBlock(tokenAddress);
        }

        while (currentBlock - fromBlock > this.blockTolerance) {
            const toBlock = Math.min(currentBlock, fromBlock + this.blockRange);
            await this.fetchEventsInBlockRange(
                tokenAddress,
                fromBlock,
                toBlock
            );
            fromBlock += this.blockRange;
        }
    }

    private async getBlockNumber(): Promise<number> {
        let currentBlock: number;
        const cachedBlock = await this.db.currentBlock.findOne({
            chain: this.chain.id,
        });
        if (
            cachedBlock &&
            cachedBlock.time + this.blockIntervalMs > Date.now()
        ) {
            currentBlock = cachedBlock.block;
        } else {
            currentBlock = Number(
                await this.getPublicClient().getBlockNumber()
            );
            const updated = await this.db.currentBlock.updateOne(
                { chain: this.chain.id },
                { block: currentBlock, time: Date.now() }
            );
            if (!updated) {
                await this.db.currentBlock.insertOne({
                    chain: this.chain.id,
                    block: currentBlock,
                    time: Date.now(),
                });
            }
        }
        return currentBlock;
    }

    private async fetchEventsInBlockRange(
        tokenAddress: Address,
        startBlock: number,
        endBlock: number
    ): Promise<void> {
        const events = (await this.getPublicClient().getContractEvents({
            address: tokenAddress,
            abi: parseAbi([
                "event Transfer(address by, address indexed from, address indexed to, uint256 indexed id, uint256 amount)",
            ]),
            eventName: "Transfer",
            fromBlock: BigInt(startBlock),
            toBlock: BigInt(endBlock),
        })) as unknown as {
            eventName: string;
            args: {
                by: Address;
                from: Address;
                to: Address;
                id: bigint;
                amount: bigint;
            };
        }[];

        for (const event of events) {
            if (event.eventName == "Transfer") {
                await this.updateBalances(
                    getAddress(tokenAddress),
                    Number(event.args.id),
                    getAddress(event.args.from),
                    getAddress(event.args.to),
                    event.args.amount
                );
            }
        }

        await this.db.processEventsFrom.updateOne(
            { chain: this.chain.id, tokenAddress },
            { block: endBlock }
        );
    }

    private async updateBalances(
        tokenAddress: Address,
        tokenId: number,
        from: Address,
        to: Address,
        amount: bigint
    ) {
        if (from == to) return;

        if (from != zeroAddress) {
            await this.updateBalance(tokenAddress, tokenId, from, -amount);
        }

        if (to != zeroAddress) {
            await this.updateBalance(tokenAddress, tokenId, to, amount);
        }
    }

    private async updateBalance(
        tokenAddress: Address,
        tokenId: number,
        holder: Address,
        balanceChange: bigint
    ) {
        const existing = await this.db.holders.findOne({
            chain: this.chain.id,
            tokenAddress,
            tokenId,
            holder: getAddress(holder),
        });

        if (existing) {
            let newBalance = BigInt(existing.balance) + balanceChange;
            this.db.holders.updateOne(
                {
                    chain: this.chain.id,
                    tokenAddress,
                    tokenId,
                    holder: getAddress(holder),
                },
                {
                    balance: this.padBigInt(newBalance),
                }
            );
        } else {
            this.db.holders.insertOne({
                chain: this.chain.id,
                tokenAddress,
                tokenId,
                holder: getAddress(holder),
                balance: this.padBigInt(balanceChange),
            });
        }
    }

    private padBigInt(n: bigint, width: number = 78): string {
        return n.toString().padStart(width, "0");
    }
}
