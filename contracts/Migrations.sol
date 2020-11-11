// SPDX-License-Identifier: MIT

pragma solidity >=0.4.23 <0.8.0;

contract Migrations {
    address public owner = msg.sender;
    uint256 public last_completed_migration;

    constructor() public {
        require(
            msg.sender == owner,
            "This function is restricted to the contract's owner"
        );
        _;
    }

    modifier restricted() {
        if (msg.sender == owner) _;
    }

    function setCompleted(uint256 completed) public restricted {
        last_completed_migration = completed;
    }

    function upgrade(address new_address) public restricted {
        Migrations upgraded = Migrations(new_address);
        upgraded.setCompleted(last_completed_migration);
    }
}
