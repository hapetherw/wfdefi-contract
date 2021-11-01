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

    uint256 public override lastEarnBlock;

    address public override uniRouterAddress;

    address public constant wbnbAddress = 0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c;

    address public constant alpacaAddress = 0x8F0528cE5eF7B51152A59745bEfDD91D97091d2F;

    address public constant fairLaunchAddress = 0xA625AB01B08ce023B2a342Dbb12a16f2C8489A8F;

    address public override vaultAddress;
    address public override wantAddress;
    uint256 public override balanceSnapshot;
    uint256 public override poolId;

    address[] public override earnedToWantPath;

    event Deposit(address wantAddress, uint256 amountReceived, uint256 amountDeposited);
    event Withdraw(address wantAddress, uint256 amountRequested, uint256 amountWithdrawn);

    constructor(
        address _core,
        address _vaultAddress,
        address _wantAddress,
        address _uniRouterAddress,
        uint256 _poolId,
        address[] memory _earnedToWantPath
    ) public CoreRef(_core) {
        vaultAddress = _vaultAddress;
        wantAddress = _wantAddress;
        poolId = _poolId;
        earnedToWantPath = _earnedToWantPath;
        uniRouterAddress = _uniRouterAddress;

        IERC20(alpacaAddress).safeApprove(uniRouterAddress, uint256(-1));
        IERC20(_wantAddress).safeApprove(uniRouterAddress, uint256(-1));
        IERC20(_wantAddress).safeApprove(vaultAddress, uint256(-1));
        IERC20(vaultAddress).safeApprove(fairLaunchAddress, uint256(-1));
    }

    function deposit(uint256 _wantAmt)
        public
        override
        onlyOwner
        nonReentrant
        whenNotPaused
        returns (uint256)
    {
        IERC20(wantAddress).safeTransferFrom(
            address(msg.sender),
            address(this),
            _wantAmt
        );

        uint256 before = _stakedWantTokens();
        _deposit(_wantAmt);
        uint256 diff = _stakedWantTokens().sub(before);
        if (diff > _wantAmt) {
            diff = _wantAmt;
        }

        balanceSnapshot = balanceSnapshot.add(diff);

        emit Deposit(wantAddress, _wantAmt, diff);

        return diff;
    }

    function _deposit(uint _wantAmt) internal {
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

        earnedAmt = IERC20(wantAddress).balanceOf(address(this));
        if (earnedAmt != 0) {
            _deposit(earnedAmt);
        }
        balanceSnapshot = _stakedWantTokens();

        lastEarnBlock = block.number;
    }

    function withdraw(uint256 _wantAmt)
        public
        override
        onlyOwner
        nonReentrant
        returns (uint256)
    {
        uint wantBal;
        if (_wantAmt > wantLockedInHere()) {
            balanceSnapshot = balanceSnapshot.sub(_wantAmt.sub(
                wantLockedInHere()
            ));
            _withdraw(_wantAmt.sub(
                wantLockedInHere()
            ));
        }

        wantBal = IERC20(wantAddress).balanceOf(address(this));
        if (wantBal > _wantAmt) {
            wantBal = _wantAmt;
        }

        IERC20(wantAddress).safeTransfer(owner(), wantBal);

        emit Withdraw(wantAddress, _wantAmt, wantBal);

        return wantBal;
    }

    function _withdraw(uint256 _wantAmt) internal {
        uint256 amount = _wantAmt.mul(Vault(vaultAddress).totalSupply()).div(Vault(vaultAddress).totalToken());
        FairLaunch(fairLaunchAddress).withdraw(address(this), poolId, amount);
        Vault(vaultAddress).withdraw(Vault(vaultAddress).balanceOf(address(this)));
    }

    function _stakedWantTokens() public view returns (uint256) {
        (uint256 _amount, , ,) = FairLaunch(fairLaunchAddress).userInfo(poolId, address(this));
        return _amount.mul(Vault(vaultAddress).totalToken()).div(Vault(vaultAddress).totalSupply());
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

    function wantLockedTotal() public view override returns (uint256) {
        return wantLockedInHere().add(balanceSnapshot);
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