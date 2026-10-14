# Web3Bridge Solidity — Cohort XV

Class code for the Web3Bridge Cohort XV Solidity sessions. The main example is a
**Savings Vault built as a diamond** ([EIP-2535](https://eips.ethereum.org/EIPS/eip-2535)),
the upgrade pattern we use in class.

This is a [Foundry](https://book.getfoundry.sh/) project.

## What is inside

| Path | What it is |
| --- | --- |
| `src/diamond/facets/SavingsFacet.sol` | The vault logic: `deposit`, `withdraw`, `setMinLockDuration` and view functions |
| `src/diamond/libraries/LibVault.sol` | The vault's storage, kept in its own diamond storage slot |
| `src/diamond/VaultBase.sol` | Shared modifiers the facets inherit |
| `src/diamond/VaultSelectors.sol` | The function selectors each facet exposes to the diamond |
| `src/diamond/upgradeInitializers/VaultInit.sol` | Runs once on deployment to set the starting state |
| `src/diamond/facets/PauseFacet.sol` | Owner-only pause controls for deposits and withdrawals |
| `src/Vulnerable.sol` | A deliberately unsafe vault, used to demonstrate reentrancy |
| `script/DeployVaultDiamond.s.sol` | Deploys the facets and the diamond |
| `script/UpgradeVaultPauseFacet.s.sol` | Replaces emergency withdrawal with owner-controlled pause controls |

The diamond itself comes from the reference implementation
[`mudgen/diamond-1-hardhat`](https://github.com/mudgen/diamond-1-hardhat), installed in `lib/`.

## Setup

You need [Foundry](https://book.getfoundry.sh/getting-started/installation) installed.

The libraries are git submodules, so clone with `--recurse-submodules`:

```shell
git clone --recurse-submodules https://github.com/Akanimoh12/Web3Bridge-Solidity-CohortXV.git
cd Web3Bridge-Solidity-CohortXV/contracts
forge build
```

Already cloned without that flag? Run `git submodule update --init --recursive` and build again.

## Deploy locally

Start a local chain in one terminal:

```shell
anvil
```

Anvil prints a list of test accounts and private keys. In a second terminal, from `contracts/`,
use the first account as the owner and deploy:

```shell
export OWNER=<address of anvil account 0>

forge script script/DeployVaultDiamond.s.sol \
  --rpc-url http://127.0.0.1:8545 \
  --private-key <private key of anvil account 0> \
  --broadcast
```

The script prints the address of every facet and of the vault (the diamond). Optionally set
`MIN_LOCK` (in seconds, default `60`) before deploying to change the minimum lock time.

> Only ever use Anvil's test keys here. Never put a real private key in a file you commit —
> `.env` and `anvil.env` are git-ignored for that reason.

## Upgrade an existing vault

The pause upgrade replaces the existing `SavingsFacet`, removes the `emergencyWithdraw()`
selector, and adds owner-only `pause()`, `unpause()`, and `paused()` selectors. While paused,
deposits and withdrawals revert; owner controls and saved balances are preserved. The appended
pause flag starts false in existing vaults. Set `VAULT` to the diamond address and broadcast
using the diamond owner's key:

```shell
VAULT=<deployed diamond address> forge script script/UpgradeVaultPauseFacet.s.sol \
  --rpc-url <Sepolia RPC URL> \
  --private-key <diamond owner private key> \
  --broadcast
```

The upgrade deploys replacement `SavingsFacet` and `PauseFacet` contracts. It must be sent
by the current diamond owner. Pausing prevents deposit and withdrawal calls until the owner
unpauses the vault.
