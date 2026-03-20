//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract Pair {
  function balanceOf(address owner) external view returns(uint) {}
  function totalSupply() external view returns(uint) {}
  function getReserves() external view returns ( uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast) {}
  function approve(address spender, uint256 value) external returns (bool) {}
  function transfer(address to, uint256 amount) external {}
  function allowance(address owner, address spender) external view returns (uint256){}
}