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

    struct farmStructure {
        address tokenAddress;
        uint ratio;
    }

    uint256 public override lastEarnBlock;

    address public override uniRouterAddress;

    address public constant wbnbAddress = 0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c;

    address public constant alpacaAddress = 0x8F0528cE5eF7B51152A59745bEfDD91D97091d2F;

    address public constant fairLaunchAddress = 0xA625AB01B08ce023B2a342Dbb12a16f2C8489A8F;

    address public override vaultAddress;
    address public override wantAddress;
    uint256 public override poolId;

    address[] public override earnedToWantPath;

    farmStructure[] public override alpacaFarms;

    constructor(
        address _core,
        address _vaultAddress,
        address _wantAddress,
        address _uniRouterAddress,
        uint256 _poolId,
        address[] memory _earnedToWantPath,
        farmStructure[] memory _alapacaFarms
    ) public CoreRef(_core) {
        vaultAddress = _vaultAddress;
        wantAddress = _wantAddress;
        poolId = _poolId;
        earnedToWantPath = _earnedToWantPath;
        uniRouterAddress = _uniRouterAddress;

        require(_alapacaFarms.length == 3, "array not match");
        alpacaFarms = _alapacaFarms;

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
        IPancakeRouter02(uniRouterAddress).swapExactTokensForTokens(
                wantUSDT,
                0,
                [alpacaFarms[0].token, alpacaFarms[1].token],
                address(this),
                now.add(600)
            );
        IPancakeRouter02(uniRouterAddress).swapExactTokensForTokens(
                wantTUSD,
                0,
                [alpacaFarms[0].token, alpacaFarms[2].token],
                address(this),
                now.add(600)
            );    
        Vault(vaultAddress).deposit(_wantAmt);
        FairLaunch(fairLaunchAddress).deposit(address(this), poolId, Vault(vaultAddress).balanceOf(address(this)));
    }

    function earn() public override whenNotPaused onlyTimelock {
        FairLaunch(fairLaunchAddress).harvest(poolId);

        uint256 earnedAmt = IERC20(alpacaAddress).balanceOf(address(this));
        if (alpacaAddress != wantAddress) {
            IPancakeRouter02(uniRouterAddress).swapExactTokensForTokens(
                earnedAmt,
                0,
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
        (uint256 _amount, , ,) = FairLaunch(fairLaunchAddress).userInfo(poolId, address(this));
        FairLaunch(fairLaunchAddress).withdraw(address(this), poolId, _amount);
        Vault(vaultAddress).withdraw(Vault(vaultAddress).balanceOf(address(this)));

        uint256 earnedAmt = IERC20(alpacaAddress).balanceOf(address(this));
        if (alpacaAddress != wantAddress && earnedAmt != 0) {
            IPancakeRouter02(uniRouterAddress).swapExactTokensForTokens(
                earnedAmt,
                0,
                earnedToWantPath,
                address(this),
                now.add(600)
            );
        }

        uint256 balance = wantLockedInHere();
        IERC20(wantAddress).safeTransfer(owner(), balance);
    }

    function _pause() override internal {
        super._pause();
        IERC20(alpacaAddress).safeApprove(uniRouterAddress, 0);
        IERC20(wantAddress).safeApprove(uniRouterAddress, 0);
        IERC20(wantAddress).safeApprove(vaultAddress, 0);
    }

    function _unpause() override internal {
        super._unpause();
        IERC20(alpacaAddress).safeApprove(uniRouterAddress, uint256(-1));
        IERC20(wantAddress).safeApprove(uniRouterAddress, uint256(-1));
        IERC20(wantAddress).safeApprove(vaultAddress, uint256(-1));
    }

    function wantLockedInHere() public view override returns (uint256) {
        return IERC20(wantAddress).balanceOf(address(this));
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