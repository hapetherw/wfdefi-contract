//SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <=0.8.0;

contract Oracle {
    uint8 public decimals;
    int256 public answer;

    constructor(int256 _answer, uint8 _decimals) public {
        answer = _answer;
        decimals = _decimals;
    }

    function latestAnswer() public view returns (int256) {
        return answer;
    }
}