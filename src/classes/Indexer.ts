import { Database } from "aloedb-node";
import {
    createPublicClient,
    getAddress,
    http,
    parseAbi,
    zeroAddress,
} from "viem";
import type { Address, Chain, PublicClient } from "viem";
import { Explorer } from "../types/Explorer";

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

export interface Network {
    chain: Chain;
    rpc: string;
    explorer: Explorer;
    blockRange?: number;
    blockTolerance?: number;
}

interface Db {
    holders: Database<Holder>;
    processEventsFrom: Database<ProcessEventsFrom>;
}

export class Indexer {
    chain: Chain;
    rpc: string;
    explorer: Explorer;
    blockRange: number;
    blockTolerance: number;
    db: Db;

    constructor(network: Network) {
        this.chain = network.chain;
        this.rpc = network.rpc;
        this.explorer = network.explorer;
        this.db = this.initDb();
        this.blockRange = network.blockRange ?? 10_000;
        this.blockTolerance = network.blockTolerance ?? 100;
    }

    /**
     * Retrieves a sorted and paginated list of token holders for a specific token ID.
     *
     * @param tokenAddress - The address of the token contract.
     * @param tokenId - The ID of the token to fetch holders for.
     * @param sort - The sort order for the holders' balances, either "ASC" or "DESC".
     * @param maxResults - The maximum number of results to return per page.
     * @param page - The page number for pagination, defaults to 0.
     * @returns A promise that resolves to an array of token holders with their balances.
     */
    async getHolders(
        tokenAddress: Address,
        tokenId: number,
        sort: "ASC" | "DESC",
        maxResults: number,
        page: number = 0
    ): Promise<Output[]> {
        // Update the holders
        if (page === 0) {
            await this.fetchEvents(getAddress(tokenAddress));
        }

        const holders = await this.db.holders.findMany({
            chain: this.chain.id,
            tokenAddress: getAddress(tokenAddress),
            tokenId,
        });

        const lastElement = Math.min(holders.length, (page + 1) * maxResults);

        return holders
            .sort((a, b) =>
                sort === "ASC"
                    ? a.balance.localeCompare(b.balance)
                    : b.balance.localeCompare(a.balance)
            )
            .map((holder) => {
                return {
                    holder: holder.holder,
                    balance: BigInt(holder.balance).toString(),
                };
            })
            .slice(page * maxResults, lastElement);
    }

    private async fetchEvents(tokenAddress: Address): Promise<void> {
        const currentBlock = Number(
            await this.getPublicClient().getBlockNumber()
        );

        let fromBlock = await this.firstBlockToIndex(tokenAddress);

        while (currentBlock - fromBlock >= this.blockTolerance) {
            const toBlock = Math.min(currentBlock, fromBlock + this.blockRange);
            await this.fetchEventsInBlockRange(
                tokenAddress,
                fromBlock,
                toBlock
            );
            fromBlock += this.blockRange;
        }
    }

    private async firstBlockToIndex(tokenAddress: Address): Promise<number> {
        const firstBlockFromStorage = (
            await this.db.processEventsFrom.findOne({
                chain: this.chain.id,
                tokenAddress,
            })
        )?.block;

        return (
            firstBlockFromStorage ?? (await this.setCreationBlock(tokenAddress))
        );
    }

    private async setCreationBlock(token: Address): Promise<number> {
        const creationBlock = await this.explorer.getCreationBlock(
            this.chain.id,
            getAddress(token)
        );

        await this.db.processEventsFrom.insertOne({
            chain: this.chain.id,
            tokenAddress: getAddress(token),
            block: creationBlock,
        });

        return creationBlock;
    }

    private async fetchEventsInBlockRange(
        tokenAddress: Address,
        startBlock: number,
        endBlock: number
    ): Promise<void> {
        // Event definition based on: https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/token/ERC6909/draft-ERC6909.sol
        const events = (await this.getPublicClient().getContractEvents({
            address: tokenAddress,
            abi: parseAbi([
                "event Transfer(address caller, address indexed from, address indexed to, uint256 indexed id, uint256 amount)",
            ]),
            eventName: "Transfer",
            fromBlock: BigInt(startBlock),
            toBlock: BigInt(endBlock),
        })) as unknown as {
            eventName: string;
            args: {
                caller: Address;
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
            { block: endBlock + 1 }
        );
    }

    private getPublicClient(): PublicClient {
        return createPublicClient({
            chain: this.chain,
            transport: http(this.rpc),
        });
    }

    private async updateBalances(
        tokenAddress: Address,
        tokenId: number,
        from: Address,
        to: Address,
        amount: bigint
    ) {
        if (from == to || amount == BigInt(0)) return;

        await this.updateBalance(tokenAddress, tokenId, from, -amount);
        await this.updateBalance(tokenAddress, tokenId, to, amount);
    }

    private async updateBalance(
        tokenAddress: Address,
        tokenId: number,
        holder: Address,
        balanceChange: bigint
    ) {
        if (holder == zeroAddress) return;

        const existing = await this.db.holders.findOne({
            chain: this.chain.id,
            tokenAddress,
            tokenId,
            holder,
        });

        if (existing) {
            let updatedBalance = BigInt(existing.balance) + balanceChange;
            this.db.holders.updateOne(
                {
                    chain: this.chain.id,
                    tokenAddress,
                    tokenId,
                    holder,
                },
                {
                    balance: this.padBigInt(updatedBalance),
                }
            );
        } else {
            this.db.holders.insertOne({
                chain: this.chain.id,
                tokenAddress,
                tokenId,
                holder,
                balance: this.padBigInt(balanceChange),
            });
        }
    }

    private padBigInt(n: bigint, width: number = 78): string {
        return n.toString().padStart(width, "0");
    }

    private initDb(): Db {
        const holders = new Database<Holder>({ path: "./.db/holders.db" });
        const processEventsFrom = new Database<ProcessEventsFrom>({
            path: "./.db/process_events_from.db",
        });

        return {
            holders,
            processEventsFrom,
        };
    }
}
