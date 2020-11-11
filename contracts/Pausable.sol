// SPDX-License-Identifier: MIT

pragma solidity ^0.7.0;

import "./Ownable.sol";

abstract contract Pausable is Ownable {
    bool private _paused;

    event Paused();
    event Unpaused();

    constructor(address owner) Ownable(owner) {}

    function paused() public view returns (bool) {
        return _paused;
    }

    modifier whenNotPaused() {
        require(!_paused, "Pausable: paused");
        _;
    }

    function pause() public onlyOwner whenNotPaused {
        _paused = true;
        emit Paused();
    }

    function _unpause() public onlyOwner {
        require(_paused);
        _paused = false;
        emit Unpaused();
    }
}
