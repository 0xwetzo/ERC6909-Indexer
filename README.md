# ERC6909 Indexer

Lightweight and efficient indexer of ERC6909 token holders compliant with the OpenAPI specification.

## Design

The indexer has been design in a way to reduce resource usage.
It stores the balances of the token holders in a NoSQL database and updates them just-in-time.
This means that tokens get indexed only when they are requested and that some RPC calls may be needed before returning the results.

Benefits:

-   Low resource usage
-   Store only the data needed
-   Totally idle between requests

Drawbacks:

-   Response can take time, especially if the token is not indexed yet
-   Probably not adapted for large volumes of data

### Intended use

Third-party services offer this type of endpoints fo ERC20 tokens, but not yet for ERC6909.
This indexer allows to run an indexer for these tokens.
It is not optimized for speed and high throughput, but it is light and efficient.
Therefore, it is designed for internal or restricted use rather than exposed to the public.

### Limitations

While it should work with most ERC6909 tokens, special tokens with specific features like rebasing, or who implement `Mint` and `Burn` events on top of the `Transfer` event may create inconsistent results. Here we consider that all balance changes emit a `Transfer` event.

## Installation

```bash
git pull https://github.com/0xwetzo/ERC6909-Indexer.git
cd ERC6909-Indexer
npm install
```

## Usage

```bash
npx tsx src
```

## Configuration

The indexer is configured in the `config.ts` file.
Here you can add support for more chains.

## Prerequisites

You'll need access to an archive node from any RPC provider and an API key for Etherscan.
The free tier should be sufficient for most personnal projects use cases.

## OpenAPI Specification

The indexer exposes an OpenAPI specification at `/openapi.json`.
A RapiDoc interface is available at `/api.html`.

## Queries

The indexer supports the following queries:

-   `/erc6909`: Returns a sorted and paginated list of ERC6909 token holders.

Use the OpenAPI specification or the RapiDoc interface to get more details on the input and output.

![RapiDoc](./docs/RapiDoc.png)

## Manual testing

A `justfile` and a Foundry project with a Mock ERC6909 contract are provided with the useful commands to create various scenarios for manual testing.
