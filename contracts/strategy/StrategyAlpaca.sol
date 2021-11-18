//SPDX-License-Identifier: MIT

pragma solidity >=0.6.0 <0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "../interfaces/IAlpaca.sol";
import "../interfaces/IStrategy.sol";
import "../interfaces/IPancakeRouter02.sol";
import "../refs/CoreRef.sol";

contract StrategyAlpaca is IStrategyAlpaca, ReentrancyGuard, Ownable, CoreRef {
    using SafeERC20 for IERC20;
    using SafeMath for uint256;

    uint256 private slippage = 5; // 1000 = 100%

    struct FarmStructure {
        address tokenAddress;
        uint ratio;
        uint pid;
    }

    uint256 public override lastEarnBlock;

    address public override uniRouterAddress;

    address public constant wbnbAddress = 0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c;

    address public constant alpacaAddress = 0x8F0528cE5eF7B51152A59745bEfDD91D97091d2F;

    address public constant fairLaunchAddress = 0xA625AB01B08ce023B2a342Dbb12a16f2C8489A8F;

    address public override vaultAddress;
    address public override wantAddress;

    address[] public override earnedToWantPath;

    FarmStructure[] public alpacaFarms;

    constructor(
        address _core,
        address _vaultAddress,
        address _wantAddress,
        address _uniRouterAddress,
        address[] memory _earnedToWantPath,
        address[] memory _farmAddress,
        uint[] memory _ratioArray,
        uint[] memory _pidArray
    ) public CoreRef(_core) {
        vaultAddress = _vaultAddress;
        wantAddress = _wantAddress;
        earnedToWantPath = _earnedToWantPath;
        uniRouterAddress = _uniRouterAddress;

        alpacaFarms.push(FarmStructure({
            tokenAddress: _farmAddress[0],
            ratio: _ratioArray[0],
            pid: _pidArray[0]
        }));
        alpacaFarms.push(FarmStructure({
            tokenAddress: _farmAddress[1],
            ratio: _ratioArray[1],
            pid: _pidArray[1]
        }));
        alpacaFarms.push(FarmStructure({
            tokenAddress: _farmAddress[2],
            ratio: _ratioArray[2],
            pid: _pidArray[2]
        }));

        IERC20(alpacaAddress).safeApprove(uniRouterAddress, uint256(-1));
        IERC20(_wantAddress).safeApprove(uniRouterAddress, uint256(-1));
        IERC20(_wantAddress).safeApprove(vaultAddress, uint256(-1));
        IERC20(vaultAddress).safeApprove(fairLaunchAddress, uint256(-1));
    }

    function deposit(uint256 _wantAmt)
        public
        override
        nonReentrant
        whenNotPaused
    {
        IERC20(wantAddress).safeTransferFrom(
            address(msg.sender),
            address(this),
            _wantAmt
        );

        _deposit(wantLockedInHere());
    }

    function _deposit(uint _wantAmt) internal {
        uint wantBUSD = _wantAmt * alpacaFarms[0].ratio / 100;
        uint wantUSDT = _wantAmt * alpacaFarms[1].ratio / 100;
        uint wantTUSD = _wantAmt * alpacaFarms[2].ratio / 100;
        address[] memory reserveUSDTAry = new address[](2);
        reserveUSDTAry[0] = alpacaFarms[0].tokenAddress;
        reserveUSDTAry[1] = alpacaFarms[1].tokenAddress;
        address[] memory reserveTUSDAry = new address[](2);
        reserveTUSDAry[0] = alpacaFarms[0].tokenAddress;
        reserveTUSDAry[1] = alpacaFarms[2].tokenAddress;
        uint reserveUSDT = IPancakeRouter02(uniRouterAddress).getAmountsOut(
            wantUSDT,
            reserveUSDTAry
        )[1];
        uint reserveUSDTSlippage = reserveUSDT.mul(1000 - slippage).div(1000);
        uint reserveTUSD = IPancakeRouter02(uniRouterAddress).getAmountsOut(
            wantTUSD,
            reserveTUSDAry
        )[1];
        uint reserveTUSDSlippage = reserveTUSD.mul(1000 - slippage).div(1000);
        IPancakeRouter02(uniRouterAddress).swapExactTokensForTokens(
                wantUSDT,
                reserveTUSDSlippage,
                reserveUSDTAry,
                address(this),
                now.add(600)
            );
        IPancakeRouter02(uniRouterAddress).swapExactTokensForTokens(
                wantTUSD,
                reserveUSDTSlippage,
                reserveTUSDAry,
                address(this),
                now.add(600)
            );
        Vault(vaultAddress).deposit(wantBUSD);
        FairLaunch(fairLaunchAddress).deposit(address(this), alpacaFarms[0].pid, Vault(vaultAddress).balanceOf(address(this)));
        Vault(vaultAddress).deposit(wantUSDT);
        FairLaunch(fairLaunchAddress).deposit(address(this), alpacaFarms[1].pid, Vault(vaultAddress).balanceOf(address(this)));
        Vault(vaultAddress).deposit(wantTUSD);
        FairLaunch(fairLaunchAddress).deposit(address(this), alpacaFarms[2].pid, Vault(vaultAddress).balanceOf(address(this)));
    }

    function earn() public override whenNotPaused onlyTimelock {
        FairLaunch(fairLaunchAddress).harvest(alpacaFarms[0].pid);
        FairLaunch(fairLaunchAddress).harvest(alpacaFarms[1].pid);
        FairLaunch(fairLaunchAddress).harvest(alpacaFarms[2].pid);

        uint256 earnedAmt = IERC20(alpacaAddress).balanceOf(address(this));
        if (alpacaAddress != wantAddress && earnedAmt != 0) {
            uint256 amountWantWithoutSlippage = IPancakeRouter02(uniRouterAddress).getAmountsOut(
                earnedAmt,
                earnedToWantPath
            )[earnedToWantPath.length - 1];
            uint256 amountWantWithSlippage = amountWantWithoutSlippage.mul(1000 - slippage).div(1000);
            IPancakeRouter02(uniRouterAddress).swapExactTokensForTokens(
                earnedAmt,
                amountWantWithSlippage,
                earnedToWantPath,
                address(this),
                now.add(600)
            );
        }

        earnedAmt = wantLockedInHere();
        if (earnedAmt != 0) {
            _deposit(earnedAmt);
        }

        lastEarnBlock = block.number;
    }

    function withdraw()
        public
        override
        onlyOwner
        nonReentrant
    {
        (uint256 _amount0, , ,) = FairLaunch(fairLaunchAddress).userInfo(alpacaFarms[0].pid, address(this));
        FairLaunch(fairLaunchAddress).withdraw(address(this), alpacaFarms[0].pid, _amount0);
        (uint256 _amount1, , ,) = FairLaunch(fairLaunchAddress).userInfo(alpacaFarms[1].pid, address(this));
        FairLaunch(fairLaunchAddress).withdraw(address(this), alpacaFarms[1].pid, _amount1);
        (uint256 _amount2, , ,) = FairLaunch(fairLaunchAddress).userInfo(alpacaFarms[2].pid, address(this));
        FairLaunch(fairLaunchAddress).withdraw(address(this), alpacaFarms[2].pid, _amount2);
        Vault(vaultAddress).withdraw(Vault(vaultAddress).balanceOf(address(this)));

        uint256 earnedAmt = IERC20(alpacaAddress).balanceOf(address(this));
        if (alpacaAddress != wantAddress && earnedAmt != 0) {
            uint256 amountWantWithoutSlippage = IPancakeRouter02(uniRouterAddress).getAmountsOut(
                earnedAmt,
                earnedToWantPath
            )[earnedToWantPath.length - 1];
            uint256 amountWantWithSlippage = amountWantWithoutSlippage.mul(1000 - slippage).div(1000);
            IPancakeRouter02(uniRouterAddress).swapExactTokensForTokens(
                earnedAmt,
                amountWantWithSlippage,
                earnedToWantPath,
                address(this),
                now.add(600)
            );
        }

        uint256 balance = wantLockedInHere();
        IERC20(wantAddress).safeTransfer(owner(), balance);
    }

    function _pause() internal override {
        super._pause();
        IERC20(alpacaAddress).safeApprove(uniRouterAddress, 0);
        IERC20(wantAddress).safeApprove(uniRouterAddress, 0);
        IERC20(wantAddress).safeApprove(vaultAddress, 0);
    }

    function _unpause() internal override {
        super._unpause();
        IERC20(alpacaAddress).safeApprove(uniRouterAddress, uint256(-1));
        IERC20(wantAddress).safeApprove(uniRouterAddress, uint256(-1));
        IERC20(wantAddress).safeApprove(vaultAddress, uint256(-1));
    }

    function wantLockedInHere() public view override returns (uint256) {
        return IERC20(wantAddress).balanceOf(address(this));
    }

    function setSlippage(uint256 _slippage) public override onlyTimelock {
        require(_slippage > 0, "Slippage should be greater than zero");
        require(_slippage <= 5, "Slippage is too high");
        slippage = _slippage;
    }

    function inCaseTokensGetStuck(
        address _token,
        uint256 _amount,
        address _to
    ) public override onlyTimelock {
        require(_token != alpacaAddress, "!safe");
        require(_token != wantAddress, "!safe");
        require(_token != vaultAddress, "!safe");
        IERC20(_token).safeTransfer(_to, _amount);
    }

    function setEarnedToWantPath(address[] memory newPath) public override onlyTimelock {
        earnedToWantPath = newPath;
    }

    function updateStrategy() public override {}
}