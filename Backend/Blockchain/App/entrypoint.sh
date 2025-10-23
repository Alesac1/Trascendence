#!/bin/sh

set -eu pipefail

ENV_FILE="./srcs/.env"
DEPLOY_DIR="./DeployContract"
DEPLOY_CMD="npx hardhat ignition deploy --network avalancheFuji ignition/modules/store_scores.ts"
ADDRESSES_FILE="$DEPLOY_DIR/ignition/deployments/chain-43113/deployed_addresses.json"
MODULE_KEY="store_scores#store_scores"

if [ ! -f "$ENV_FILE" ]; then
	echo "Missing environment file: $ENV_FILE" >&2
	exit 1
fi

CONTRACT_ADDRESS=$(awk -F= '/^CONTRACT_ADDRESS=/{print $2}' "$ENV_FILE" | tr -d '[:space:]')

if [ -z "$CONTRACT_ADDRESS" ]; then
	echo "CONTRACT_ADDRESS missing, running deployment..."

	(
		cd "$DEPLOY_DIR"
		$DEPLOY_CMD
	)

	if [ ! -f "$ADDRESSES_FILE" ]; then
		echo "Deployment addresses file not found: $ADDRESSES_FILE" >&2
		exit 1
	fi

	CONTRACT_ADDRESS=$(node -e '
const fs = require("fs");
const [path, key] = process.argv.slice(1);
try {
	const data = JSON.parse(fs.readFileSync(path, "utf8"));
	const value = data[key];
	if (!value) {
		console.error(`Key ${key} not found in ${path}`);
		process.exit(1);
	}
	process.stdout.write(value);
} catch (err) {
	console.error(err.message);
	process.exit(1);
}
' "$ADDRESSES_FILE" "$MODULE_KEY")

	if [ -z "$CONTRACT_ADDRESS" ]; then
		echo "Failed to read new contract address" >&2
		exit 1
	fi

	if grep -q '^CONTRACT_ADDRESS=' "$ENV_FILE"; then
		sed -i "s/^CONTRACT_ADDRESS=.*/CONTRACT_ADDRESS=$CONTRACT_ADDRESS/" "$ENV_FILE"
	else
		printf '\nCONTRACT_ADDRESS=%s\n' "$CONTRACT_ADDRESS" >> "$ENV_FILE"
	fi

	echo "Updated CONTRACT_ADDRESS to $CONTRACT_ADDRESS"
else
	echo "CONTRACT_ADDRESS already set to $CONTRACT_ADDRESS"
fi

echo "Starting blockchain backend..."

cd ./srcs
exec node ./BlockChain.js
