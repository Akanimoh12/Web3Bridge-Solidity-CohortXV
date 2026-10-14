# Web3Bridge Solidity — Cohort XV

Class code for the Web3Bridge Cohort XV Solidity sessions. The main example is a
**Savings Vault built as a diamond** ([EIP-2535](https://eips.ethereum.org/EIPS/eip-2535)),
the upgrade pattern we use in class.

This is a [Foundry](https://book.getfoundry.sh/) project.

## What is inside

| Path                                            | What it is                                                                      |
| ----------------------------------------------- | ------------------------------------------------------------------------------- |
| `src/diamond/facets/SavingsFacet.sol`           | The vault logic: `deposit`, `withdraw`, `setMinLockDuration` and view functions |
| `src/diamond/libraries/LibVault.sol`            | The vault's storage, kept in its own diamond storage slot                       |
| `src/diamond/VaultBase.sol`                     | Shared modifiers the facets inherit                                             |
| `src/diamond/VaultSelectors.sol`                | The function selectors each facet exposes to the diamond                        |
| `src/diamond/upgradeInitializers/VaultInit.sol` | Runs once on deployment to set the starting state                               |
| `src/diamond/facets/EmergencyFacet.sol`         | Empty for now — we add it in class as an upgrade                                |
| `src/Vulnerable.sol`                            | A deliberately unsafe vault, used to demonstrate reentrancy                     |
| `script/DeployVaultDiamond.s.sol`               | Deploys the facets and the diamond                                              |

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

## Sepolia Deployment

**Network:** Ethereum Sepolia Testnet

**Diamond Vault Address:** `0xf270EbB6359cd8f951994b056fec36f21C33EfaF`

### Deployed Contracts

| Contract          | Address                                      |
| ----------------- | -------------------------------------------- |
| DiamondCutFacet   | `0xc51462C01351c101A5FF18a36582744ea5741FcE` |
| DiamondLoupeFacet | `0xDeaB812c239E36b0712fB2FCFEF7982DD60b8980` |
| OwnershipFacet    | `0xa54D5c2853459d801A6D4aF0760d9C5E28aA93db` |
| SavingsFacet      | `0x33BF6F097D6d82826cd32801f69464f7e1FdA355` |
| EmergencyFacet    | `0x490ADd086e65F20063167BCB12DF2E10Bb1426D9` |
| VaultInit         | `0x48e913B3c821fd823ab9c4b13Fc756Ee8aEbA74F` |

### Emergency Withdrawal

The `EmergencyFacet` implements emergency withdrawals with a 10% penalty. The remaining 90% is returned to the caller, and the user's recorded savings and unlock time are reset.

The `emergencyWithdraw()` function selector is `0xdb2e21bc`. It was independently verified using `cast sig` and confirmed in the Diamond's installed facet list.

### Verification

- `forge build` completed successfully.
- Emergency withdrawal tests passed locally.
- The Diamond's deployed bytecode was verified on Sepolia.
- The Diamond's facet list was queried on-chain to confirm that the EmergencyFacet is installed.

**Explorer:** https://sepolia.etherscan.io/address/0xf270EbB6359cd8f951994b056fec36f21C33EfaF
