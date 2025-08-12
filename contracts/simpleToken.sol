// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract EchoPayToken is ERC20, Ownable {
    mapping(address => bool) public authorizedPayers;
    
    event PayerAuthorized(address indexed payer);
    event PayerRevoked(address indexed payer);
    
    constructor(uint256 initialSupply) ERC20("EchoPay Token", "EPAY") Ownable(msg.sender) {
        _mint(msg.sender, initialSupply);
    }
    
    function authorizePayer(address payer) external onlyOwner {
        authorizedPayers[payer] = true;
        emit PayerAuthorized(payer);
    }
    
    function revokePayer(address payer) external onlyOwner {
        authorizedPayers[payer] = false;
        emit PayerRevoked(payer);
    }
    
    function voiceTransfer(address to, uint256 amount) external {
        require(authorizedPayers[msg.sender], "EchoPay: Unauthorized payer");
        require(to != address(0), "EchoPay: Invalid recipient");
        require(amount > 0, "EchoPay: Invalid amount");
        
        _transfer(msg.sender, to, amount);
    }
    
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }
}