// SPDX-License-Identifier: MIT

pragma solidity ^0.7.0;

import "./SafeMath.sol";
import "./ReentrancyGuard.sol";
import "./Ownable.sol";
import "./Token.sol";
import "./IBorrower.sol";

contract Loan is ReentrancyGuard, Ownable {
  using SafeMath for uint256;

  Token private _TOKEN;
  uint256 internal _feeDivisor = 100;

  event Loaned(uint256 amount, uint256 profit);

  constructor(address TOKEN, address vybeStake) Ownable(vybeStake) {
    _TOKEN = Token(TOKEN);
  }

  // loan out TOKEN from the staked funds
  function loan(uint256 amount) external noReentrancy {
    // set a profit of 1%
    uint256 profit = amount.div(_feeDivisor);
    uint256 owed = amount.add(profit);
    // transfer the funds
    require(_TOKEN.transferFrom(owner(), msg.sender, amount));

    // call the loaned function
    IBorrower(msg.sender).loaned(amount, owed);

    // transfer back to the staking pool
    require(_TOKEN.transferFrom(msg.sender, owner(), amount));
    // take the profit
    require(_TOKEN.transferFrom(msg.sender, address(this), profit));
    // burn it, distributing its value to the ecosystem
    require(_TOKEN.burn(profit));

    emit Loaned(amount, profit);
  }
}
