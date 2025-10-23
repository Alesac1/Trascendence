import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("store_scores", (m) => {
  const store_scores = m.contract("store_scores");

  return { store_scores };
});