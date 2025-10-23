import type { HardhatUserConfig } from "hardhat/config";
import * as dotenv from "dotenv";
dotenv.config();

import hardhatToolboxViemPlugin from "@nomicfoundation/hardhat-toolbox-viem";
import { configVariable } from "hardhat/config";

const providerApiKey = process.env.AVALANCHE_FUJI_PRIVATE_KEY;
const avalancheFujiRpcUrl = process.env.AVALANCHE_FUJI_RPC_URL;

const config: HardhatUserConfig = {
  plugins: [hardhatToolboxViemPlugin],
  solidity: {
    profiles: {
      default: {
        version: "0.8.28",
      },
      production: {
        version: "0.8.28",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
    },
  },
  networks: {
    hardhatMainnet: {
      type: "edr-simulated",
      chainType: "l1",
    },
    hardhatOp: {
      type: "edr-simulated",
      chainType: "op",
    },
    sepolia: {
      type: "http",
      chainType: "l1",
      url: configVariable("SEPOLIA_RPC_URL"),
      accounts: [configVariable("SEPOLIA_PRIVATE_KEY")],
    },
	avalancheFuji: {
	  type: "http",
	  chainType: "l1",
	  url: avalancheFujiRpcUrl ? avalancheFujiRpcUrl : "",
	  accounts: providerApiKey ? [providerApiKey] : [],
	},
  },
};

export default config;
