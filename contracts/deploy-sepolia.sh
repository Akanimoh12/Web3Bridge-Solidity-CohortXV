#!/usr/bin/env bash
# Deploys and verifies the Vault Diamond on Sepolia using values from ../.env
set -euo pipefail
cd "$(dirname "$0")"
set -a; . ../.env; set +a

forge script script/DeployVaultDiamond.s.sol \
  --rpc-url "$SEPOLIA_RPC_URL" \
  --account deployer \
  --broadcast \
  --slow \
  --skip-simulation \
  --gas-estimate-multiplier 130 \
  --verify \
  --etherscan-api-key "$ETHERSCAN_API_KEY"
