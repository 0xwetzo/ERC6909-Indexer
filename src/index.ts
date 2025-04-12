import { z } from "zod";
import {
    Server,
    controller,
    get,
    extendZodWithOpenApi,
    zApiOutput,
    apiResponse,
    openapiController,
} from "@zhttp/core";
import type { Address } from "viem";
import { Indexer } from "./classes/Indexer";
import { getNetwork, getPort, networks } from "./config";

extendZodWithOpenApi(z);

const port = getPort();

const holdersController = controller("Holders").description(
    "Returns the list of token holders"
);

const erc6909Input = {
    query: z.object({
        chain: z.coerce
            .number()
            .int()
            .refine((val) => {
                return Object.keys(networks).includes(val.toString());
            }, `Invalid chain. Available chains: ${Object.keys(networks).join(", ")}`),
        token: z.string().startsWith("0x").length(42),
        id: z.coerce.number().int().positive(),
        sort: z.enum(["ASC", "DESC"]).default("DESC"),
        maxResults: z.coerce.number().int().min(1).max(1000).default(100),
        page: z.coerce.number().int().nonnegative().default(0),
    }),
};

const erc6909Output = zApiOutput(
    z
        .object({
            holder: z.string(),
            balance: z.string(),
        })
        .array()
        .openapi({
            example: [{ holder: "0x123456789...", balance: "1000000000" }],
        })
).openapi("Sorted and paginated list of holders");

holdersController.endpoint(
    get("/erc6909")
        .input(erc6909Input)
        .response(erc6909Output)
        .handler(async (input) => {
            const network = getNetwork(input.query.chain);

            const indexer = new Indexer(network);

            const list = await indexer.getHolders(
                input.query.token as Address,
                input.query.id,
                input.query.sort,
                input.query.maxResults,
                input.query.page
            );
            return apiResponse(list);
        })
);

const server = new Server(
    {
        controllers: [holdersController, openapiController],
        middlewares: [],
    },
    {
        port,
        oasInfo: {
            title: "ERC6909 Indexer",
            version: "1.0.0",
        },
    }
);

server.start();
