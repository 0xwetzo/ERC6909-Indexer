// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.23;

import {ERC6909} from "./lib/ERC6909.sol";

/**
 * @title IncentivizedERC6909
 * @notice Basic ERC6909 implementation with incentives functionality.
 * @author Cod3x, inspired by the Solady ERC6909 implementation and AAVEs incentivized ERC20
 */
contract MockERC6909 is ERC6909 {
    /// @dev Mapping from `id` to token name.
    mapping(uint256 => string) private _name;
    /// @dev Mapping from `id` to token symbol.
    mapping(uint256 => string) private _symbol;
    /// @dev Mapping from `id` to token decimals.
    mapping(uint256 => uint8) private _decimals;
    /// @dev Mapping from `id` to token URI.
    mapping(uint256 => string) private _tokenURI;

    constructor() {}

    function mint(address to, uint256 id, uint256 amount) public {
        _mint(to, id, amount);
    }

    function burn(address from, uint256 id, uint256 amount) public {
        _burn(from, id, amount);
    }

    function initializeToken(
        uint256 __id,
        string memory __name,
        string memory __symbol,
        uint8 __decimals,
        string memory __tokenURI
    ) public {
        _name[__id] = __name;
        _symbol[__id] = __symbol;
        _decimals[__id] = __decimals;
        _tokenURI[__id] = __tokenURI;
    }

    function name(uint256 id) public view override returns (string memory) {
        return (_name[id]);
    }

    function symbol(uint256 id) public view override returns (string memory) {
        return (_symbol[id]);
    }

    function decimals(uint256 id) public view virtual override returns (uint8) {
        return (_decimals[id]);
    }

    function tokenURI(uint256 id) public view virtual override returns (string memory) {
        return (_tokenURI[id]);
    }
}