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
| `src/diamond/facets/EmergencyFacet.sol` | Owner pause/unpause and saver emergency withdrawals |
| `src/Vulnerable.sol` | A deliberately unsafe vault, used to demonstrate reentrancy |
| `script/DeployVaultDiamond.s.sol` | Deploys all five facets and the diamond |
| `script/UpgradeVaultDiamond.s.sol` | Adds, replaces, or removes explicit selectors through `diamondCut` |

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


## Emergency behavior

The owner can `pause()` and `unpause()` through the **diamond address**. Pausing
blocks `deposit()` only. Normal `withdraw()` remains available and still requires
the lock to expire. While paused, `emergencyWithdraw()` lets each saver withdraw
their own full balance immediately, including locked savings. The owner cannot
withdraw another saver's balance through this facet.

Both withdrawal paths clear the balance and unlock time, update `totalSaved`,
and use the same reentrancy lock before transferring ETH. A failed transfer
reverts the accounting changes. `paused()` exposes the current state.

The pause field is appended to `LibVault.VaultStorage`; existing fields and the
storage slot are unchanged. Future upgrades must preserve their order and types.

## Add, replace, and remove functions

The reference `DiamondCutFacet` already implements all three actions with
owner checks, selector collision checks, and facet bytecode checks. Use the
existing `diamondCut` entry point rather than introducing another upgrade API.
The script submits one cut with no initializer:

| `CUT_ACTION` | Operation | `FACET` |
| --- | --- | --- |
| `0` | Add selectors that are not installed | Deployed facet address |
| `1` | Replace existing selectors | New deployed facet address |
| `2` | Remove existing selectors | Not needed; script uses `address(0)` |

From `contracts/`, set the diamond address, action, deployed facet address, and
comma-separated four-byte selectors. For example, replace only `withdraw()`:

```shell
export VAULT=<diamond-address>
export FACET=<new-savings-facet-address>
export CUT_ACTION=1
export SELECTORS=$(cast sig 'withdraw()')

forge script script/UpgradeVaultDiamond.s.sol --rpc-url "$RPC_URL" --account vault-owner
```

This simulates the cut. Add `--broadcast` to submit it using the diamond owner's
account. To add the emergency facet to a diamond where those selectors are absent:

```shell
export FACET=<deployed-emergency-facet-address>
export CUT_ACTION=0
export SELECTORS="$(cast sig 'pause()'),$(cast sig 'unpause()'),$(cast sig 'emergencyWithdraw()'),$(cast sig 'paused()')"
```

Run the same script command. For Remove, use `CUT_ACTION=2` and list only the
selectors to remove. Inspect installed selectors through the diamond's loupe
functions before a cut. Removing a selector disables calls to that function;
it does not erase its storage. Keep withdrawal paths available while funds remain.

Adding EmergencyFacet to an older deployment does not update its old deposit
logic. That deployment also needs the updated SavingsFacet selectors replaced;
submit both cuts in one `diamondCut` transaction if upgrading in place. Do not
rerun `VaultInit` during an ordinary facet upgrade: it resets configuration.
The single-cut script is for independent changes; use the standard `diamondCut`
array directly when multiple changes must be atomic.

Redeploying with `DeployVaultDiamond.s.sol` includes the emergency facet and the
updated savings facet from the start. A new diamond starts with fresh storage:
balances and ETH in the previous diamond remain there.

## Verify

```shell
forge build
forge test
```

Tests cover emergency access control, pause behavior, locked and emergency
withdrawals, failed transfers, shared reentrancy protection, selector validation,
Add/Replace/Remove routing, upgrade storage preservation, and atomic rollback
when an initializer reverts.
