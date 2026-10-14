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
| `src/diamond/facets/EmergencyFacet.sol` | Early withdrawal of the caller's savings, with 10% sent to the vault owner |
| `src/diamond/facets/SavingsFacetV2.sol` | Replacement savings implementation without the `version()` function |
| `src/Vulnerable.sol` | A deliberately unsafe vault, used to demonstrate reentrancy |
| `script/DeployVaultDiamond.s.sol` | Deploys the facets and the diamond |
| `script/AddEmergencyFacet.s.sol` | Adds the emergency withdrawal facet to an existing diamond |
| `script/ReplaceSavingsFacet.s.sol` | Replaces savings selectors and removes `version()` from an existing diamond |

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

## Add the emergency withdrawal facet

New deployments include the emergency withdrawal facet. To add it to an existing diamond,
run the following as the diamond owner, setting `VAULT` to the deployed diamond address:

```shell
export VAULT=<address of deployed diamond>

forge script script/AddEmergencyFacet.s.sol \
  --rpc-url http://127.0.0.1:8545 \
  --private-key <private key of diamond owner> \
  --broadcast
```

`emergencyWithdraw()` lets a depositor withdraw their own savings before the lock expires.
The diamond owner receives 10% of the withdrawn amount; the depositor receives the balance.
The full gross amount is removed from `totalSaved`.

## Replace the savings facet and remove `version()`

Run the upgrade as the current diamond owner, setting `VAULT` to the existing diamond address:

```shell
export VAULT=<address of deployed diamond>

forge script script/ReplaceSavingsFacet.s.sol \
  --rpc-url http://127.0.0.1:8545 \
  --private-key <private key of diamond owner> \
  --broadcast
```

This replaces the six existing savings selectors with `SavingsFacetV2` and removes the
`version()` selector. The diamond address and `LibVault` storage remain unchanged; the V2
implementation preserves the existing savings behavior.

> Only ever use Anvil's test keys here. Never put a real private key in a file you commit —
> `.env` and `anvil.env` are git-ignored for that reason.
