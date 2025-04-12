### EXAMPLE SCENARIO ###

# TERMINAL 1
# just anvil

# TERMINAL 2
# just deploy-mock --> change the "mock" variable with the deployed address if different
# just set-mock-block 1 <-- change the block to the block number returned by the previous function
# just mint 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 1 1000000000000000000 <-- mint some tokens
# just read 1 <-- check that the indexer got them
# just burn 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 1 500000000000000000 <-- burn half of the tokens
# just read 1 <-- check that the indexer updated the balance

### VARIABLES ###

# Anvil account 0
pkOwner := "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"

mock := "0x5FbDB2315678afecb367f032d93F642f64180aa3"

### COMMANDS ###

# just anvil - run a local EVM
# --> let it run in a terminal and open another terminal for the other commands
# --> Anvil will print test private  keys and wallet addresses that you should use for testing
# --> use a private key for parameter "PK" and an address for "FROM" or "TO"
anvil:
    anvil

# just set-mock-block 5 - set the creation block number of the mock contract that will be returned by  thee mock block explorer
# --> to avoid indexing events from block 1 if the ERC6909 contract was deployed on block 100, pass in the  value 100
set-mock-block BLOCK_NUMBER:
    echo "{{BLOCK_NUMBER}}" > mockscan.txt

# just deploy-mock - deploy the mock contract
# --> if it deploys to another address than the  variable "mock", replace it and save the file before using the next commands
[working-directory: 'foundry/src']
deploy-mock:
    forge create MockERC6909 --private-key {{pkOwner}} --broadcast

# just mint 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 1 1000000000000000000 - mint an amount of tokens of the given id to the address
# --> will create a Transfer event from the zero address to the user and increase the balance of the later
mint TO ID AMOUNT:
    cast send {{mock}} "mint(address,uint256,uint256)" --private-key {{pkOwner}} {{TO}} {{ID}} {{AMOUNT}}

# just burn 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 1 1000000000000000000 - burn an amount of tokens of the given id from the address
# --> will create a Transfer event from the user to the zero address and decrease the balance of the former
burn FROM ID AMOUNT:
    cast send {{mock}} "burn(address,uint256,uint256)" --private-key {{pkOwner}} {{FROM}} {{ID}} {{AMOUNT}}

# just transfer 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 0x70997970C51812dc3A010C7d01b50e0d17dc79C8 1 1000000000000000000 - transfer an amount of token id from the sender to the recipient
# --> will create a Transfer event and adjust the balances of both users
transfer PK TO ID AMOUNT:
    cast send {{mock}} "transfer(address,uint256,uint256)" --private-key {{PK}} {{TO}} {{ID}} {{AMOUNT}}

# just mine 10 - mine empty blocks
# --> will mine only 1 block if no number of blocks is provided
mine NUM='1':
    cast rpc anvil_mine {{NUM}}

# just block-number - return the current block number of the local EVM instance
block-number:
    cast block-number

# just read 1 - read the returned JSON object from the indexer
# --> you can also read the data from the RapiDoc interface at http://127.0.0.1:6909/api.html
read ID SORT='DESC':
    curl -X GET "http://127.0.0.1:6909/erc6909?chain=31337&token={{mock}}&id={{ID}}&sort={{SORT}}" \
    -H 'accept: application/json' | jq
