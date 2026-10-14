#!/usr/bin/env bash
# Upgrades the existing Vault Diamond on Sepolia (adds EmergencyFacet) using values from ../.env
set -euo pipefail
cd "$(dirname "$0")"
set -a; . ../.env; set +a
export DIAMOND="${DIAMOND:-0xaE8226c6247f96c7F42205787dE727F178bf5F36}"

forge script script/UpgradeVaultDiamond.s.sol \
  --rpc-url "$SEPOLIA_RPC_URL" \
  --account deployer \
  --broadcast \
  --slow \
  --skip-simulation \
  --gas-estimate-multiplier 130 \
  --verify \
  --etherscan-api-key "$ETHERSCAN_API_KEY"
