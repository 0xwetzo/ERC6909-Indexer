# These are the default Anvil privatekey/address pairs
pkOwner := "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
pkUser1 := "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d"
pkUser2 := "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a"
addrOwner := "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"
addrUser1 := "0x70997970C51812dc3A010C7d01b50e0d17dc79C8"
addrUser2 := "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC"

mock := "0x5FbDB2315678afecb367f032d93F642f64180aa3"

anvil:
    anvil

[working-directory: 'foundry/src']
deploy-mock:
    forge create MockERC6909 --private-key {{pkOwner}} --broadcast

init-token ID NAME SYMBOL DECIMALS='18':
    cast send {{mock}} "initializeToken(uint256,string,string,uint8,string)" --private-key {{pkOwner}} {{ID}} "{{NAME}}" "{{SYMBOL}}" {{DECIMALS}} ""

mint TO ID AMOUNT:
    cast send {{mock}} "mint(address,uint256,uint256)" --private-key {{pkOwner}} {{TO}} {{ID}} {{AMOUNT}}

burn FROM ID AMOUNT:
    cast send {{mock}} "burn(address,uint256,uint256)" --private-key {{pkOwner}} {{FROM}} {{ID}} {{AMOUNT}}

transfer PK TO ID AMOUNT:
    cast send {{mock}} "transfer(address,uint256,uint256)" --private-key {{PK}} {{TO}} {{ID}} {{AMOUNT}}

set-mock-block BLOCK_NUMBER:
    echo "{{BLOCK_NUMBER}}" > mockscan.txt

