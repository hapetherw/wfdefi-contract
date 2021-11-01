//SPDX-License-Identifier: MIT

pragma solidity >=0.6.0 <0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IStrategyToken is IERC20 {
    function balance() external view returns (uint256);
    function balanceStrategy() external view returns (uint256);
    function calcPoolValueInToken() external view returns (uint256);
    function getPricePerFullShare() external view returns (uint256);
    function sharesToAmount(uint256 _shares) external view returns (uint256);
    function amountToShares(uint256 _amount) external view returns (uint256);
    function token() external view returns (address);

    function deposit(uint256 _amount, uint256 _minShares) external;
    function withdraw(uint256 _shares, uint256 _minAmount) external;

    function approveToken() external;
}

interface ISingleStrategyToken is IStrategyToken {
    function strategy() external view returns (address);
    function supplyStrategy() external;
    function updateStrategy() external;
}

interface IMultiStrategyToken is IStrategyToken {
    function strategies(uint256 idx) external view returns (address);
    function strategyCount() external view returns (uint256);
    function ratios(address _strategy) external view returns (uint256);
    function ratioTotal() external view returns (uint256);
    function getBalanceOfOneStrategy(address strategyAddress) external view returns (uint256);

    function changeRatio(uint256 _index, uint256 _value) external;
    function inCaseTokensGetStuck(address _token, uint256 _amount, address _to) external;
    function updateAllStrategies() external;
}