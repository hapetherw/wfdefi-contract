//SPDX-License-Identifier: MIT

pragma solidity >=0.6.0 <0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "../interfaces/IStrategyToken.sol";
import "../refs/CoreRef.sol";

contract MultiStrategyToken is IMultiStrategyToken, ERC20, ReentrancyGuard, CoreRef {
    using SafeERC20 for IERC20;
    using SafeMath for uint256;

    address public override token;

    address[] public override strategies;

    mapping(address => uint256) public override ratios;

    uint256 public override ratioTotal;

    event Deposit(address tokenAddress, uint256 depositAmount, uint256 sharesMinted);
    event Withdraw(address tokenAddress, uint256 withdrawAmount, uint256 sharesBurnt);
    event RatioChanged(address strategyAddress, uint256 ratioBefore, uint256 ratioAfter);

    constructor (
        address _core,
        string memory name_,
        string memory symbol_,
        address _token,
        address[] memory _strategies,
        uint256[] memory _ratios
    ) public ERC20(name_, symbol_) CoreRef(_core) {
        require(_strategies.length == _ratios.length, "array not match");

        ERC20._setupDecimals(ERC20(_token).decimals());

        token = _token;
        strategies = _strategies;

        for (uint256 i = 0; i < strategies.length; i++) {
            ratios[strategies[i]] = _ratios[i];
            ratioTotal = ratioTotal.add(_ratios[i]);
        }
    
        approveToken();
    }

    function approveToken() public override {
        for (uint i = 0; i < strategies.length; i++) {
            IERC20(token).safeApprove(strategies[i], uint(-1));
        }
    }

     function deposit(uint256 _amount, uint256 _minShares) public override {
        require(_amount != 0, "deposit must be greater than 0");
        IERC20(token).safeTransferFrom(msg.sender, address(this), _amount);
        _deposit(_amount, _minShares);
    }

    function _deposit(uint256 _amount, uint256 _minShares)
        internal
        nonReentrant
    {
        updateAllStrategies();
        uint256 _pool = calcPoolValueInToken();

        for (uint i = 0; i < strategies.length; i++) {
            uint256 amt = _amount.mul(ratios[strategies[i]]).div(ratioTotal);
            ISingleStrategyToken(strategies[i]).deposit(amt, 0);
            ISingleStrategyToken(strategies[i]).supplyStrategy();
        }

        uint256 sharesToMint = calcPoolValueInToken().sub(_pool);
        if (totalSupply() != 0 && _pool != 0) {
            sharesToMint = sharesToMint.mul(totalSupply()).div(_pool);
        }
        require(sharesToMint >= _minShares, "did not meet minimum shares requested");

        _mint(msg.sender, sharesToMint);

        emit Deposit(token, _amount, sharesToMint);
    }

    function withdraw(uint256 _shares, uint256 _minAmount) public override {
        uint r = _withdraw(_shares, _minAmount);
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

        updateAllStrategies();

        uint256 diff = balance();
        for (uint i = 0; i < strategies.length; i++) {
            uint256 b = IERC20(strategies[i]).balanceOf(address(this)).mul(_shares).div(totalSupply());
            ISingleStrategyToken(strategies[i]).withdraw(b, 0);
        }

        diff = balance().sub(diff);
        require(diff >= _minAmount, "did not meet minimum amount requested");

        _burn(msg.sender, _shares);

        emit Withdraw(token, diff, _shares);

        return diff;
    }

    function balance() public view override returns (uint256) {
        return IERC20(token).balanceOf(address(this));
    }

    function getBalanceOfOneStrategy(address strategyAddress) public view override returns (uint256 bal) {
        ISingleStrategyToken stToken = ISingleStrategyToken(strategyAddress);
        if (stToken.balanceOf(address(this)) != 0) {
            bal = stToken.calcPoolValueInToken().mul(
                stToken.balanceOf(address(this))
            ).div(
                stToken.totalSupply()
            );
        } else {
            bal = 0;
        }
    }

    function balanceStrategy() public view override returns (uint256 sum) {
        for (uint256 i = 0; i < strategies.length; i++) {
            sum = sum.add(getBalanceOfOneStrategy(strategies[i]));
        }
    }

    function calcPoolValueInToken() public view override returns (uint256) {
        return balanceStrategy();
    }

    function getPricePerFullShare() public view override returns (uint256) {
        uint256 _pool = calcPoolValueInToken();
        return _pool.mul(1e18).div(totalSupply());
    }

    function changeRatio(uint256 index, uint256 value) public override onlyTimelock {
        require(strategies.length > index, "invalid index");
        uint256 valueBefore = ratios[strategies[index]];
        ratios[strategies[index]] = value;
        ratioTotal = ratioTotal.sub(valueBefore).add(value);

        emit RatioChanged(strategies[index], valueBefore, value);
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

    function strategyCount() public view override returns (uint256) {
        return strategies.length;
    }

    function inCaseTokensGetStuck(
        address _token,
        uint256 _amount,
        address _to
    ) public override onlyTimelock {
        require(_token != address(this), "!safe");

        for (uint256 i = 0; i < strategies.length; i++) {
            require(_token != strategies[i], "!safe");
        }

        if (_token == token) {
            require(balance() >= _amount, "amount greater than holding");
        }
        IERC20(_token).safeTransfer(_to, _amount);
    }

    function updateAllStrategies() public override {
        for (uint256 i = 0; i < strategies.length; i++) {
            ISingleStrategyToken(strategies[i]).updateStrategy();
        }
    }
}