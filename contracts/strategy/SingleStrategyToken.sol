//SPDX-License-Identifier: MIT

pragma solidity >=0.6.0 <0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "../interfaces/IStrategy.sol";
import "../interfaces/IStrategyToken.sol";

contract SingleStrategyToken is ISingleStrategyToken, ERC20, ReentrancyGuard {
    using SafeERC20 for IERC20;
    using SafeMath for uint256;

    address public override token;
    address public override strategy;

    event Deposit(address tokenAddress, uint256 depositAmount, uint256 sharesMinted);
    event Withdraw(address tokenAddress, uint256 withdrawAmount, uint256 sharesBurnt);
    event Supply(uint256 amountSupplied, uint256 amountDeposited);

    constructor (
        string memory name_,
        string memory symbol_,
        address _token,
        address _strategy
    ) public ERC20(name_, symbol_) {
        token = _token;
        strategy = _strategy;

        ERC20._setupDecimals(ERC20(_token).decimals());

        approveToken();
    }

    function approveToken() public override {
        IERC20(token).safeApprove(strategy, uint(-1));
    }

    function deposit(uint256 _amount, uint256 _minShares) public override {
        require(_amount != 0, "deposit must be greater than 0");
        _deposit(_amount, _minShares);
        IERC20(token).safeTransferFrom(msg.sender, address(this), _amount);
    }

    function _deposit(uint256 _amount, uint256 _minShares) internal nonReentrant {
        IStrategy(strategy).updateStrategy();
        uint256 shares = amountToShares(_amount);
        require(shares >= _minShares, "did not meet minimum shares requested");
        _mint(msg.sender, shares);
        emit Deposit(token, _amount, shares);
    }

    function withdraw(uint256 _shares, uint256 _minAmount) public override {
        uint256 r = _withdraw(_shares, _minAmount);
        IERC20(token).safeTransfer(msg.sender, r);
    }

    function _withdraw(uint256 _shares, uint256 _minAmount)
        internal
        nonReentrant
        returns (uint256)
    {
        require(_shares != 0, "shares must be greater than 0");

        uint256 ibalance = balanceOf(msg.sender);
        require(_shares <= ibalance, "insufficient balance");

        updateStrategy();
        uint256 r = sharesToAmount(_shares);
        _burn(msg.sender, _shares);

        uint256 b = balance();
        if (b < r) {
            IStrategy(strategy).withdraw(r.sub(b));
            r = balance();
        }

        require(r >= _minAmount, "did not meet minimum amount requested");

        emit Withdraw(token, r, _shares);

        return r;
    }

    function balance() public view override returns (uint256) {
        return IERC20(token).balanceOf(address(this));
    }

    function balanceStrategy() public view override returns (uint256) {
        return IStrategy(strategy).wantLockedTotal();
    }

    function supplyStrategy() public override {
        updateStrategy();
        uint256 before = balance();
        uint256 supplied = IStrategy(strategy).deposit(balance());
        emit Supply(before, supplied);
    }

    function calcPoolValueInToken() public view override returns (uint) {
        return balanceStrategy().add(balance());
    }

    function updateStrategy() public override {
        IStrategy(strategy).updateStrategy();
    }

    function getPricePerFullShare() public view override returns (uint) {
        return calcPoolValueInToken().mul(1e18).div(totalSupply());
    }

    function sharesToAmount(uint256 _shares) public view override returns (uint256) {
        return _shares.mul(calcPoolValueInToken()).div(totalSupply());
    }

    function amountToShares(uint256 _amount) public view override returns (uint256 shares) {
        uint256 _pool = calcPoolValueInToken();
        if (totalSupply() == 0 || _pool == 0) {
            shares = _amount;
        } else {
            shares = _amount.mul(totalSupply()).div(_pool);
        }
    }
}