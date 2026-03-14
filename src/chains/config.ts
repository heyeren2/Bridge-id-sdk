export interface ChainConfig {
  chainId: number;
  name: string;
  cctpDomain: number;
  usdcAddress: string;
  tokenMessenger: string;
  messageTransmitter: string;
  routerAddress: string;
  rpcUrl: string;
}

export const CHAINS: Record<string, ChainConfig> = {

  sepolia: {
    chainId: 11155111,
    name: "Sepolia",
    cctpDomain: 0,
    usdcAddress: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
    tokenMessenger: "0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA",
    messageTransmitter: "0xE737e5cEBEEBa77EFE34D4aa090756590b1CE275",
    routerAddress: "0xf7552791170732E634F4fB5CD38958eA0B57e193",
    rpcUrl: "https://rpc.sepolia.org",
  },

  base: {
    chainId: 84532,
    name: "Base",
    cctpDomain: 6,
    usdcAddress: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
    tokenMessenger: "0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA",
    messageTransmitter: "0xE737e5cEBEEBa77EFE34D4aa090756590b1CE275",
    routerAddress: "0x9E4bC829967Ef095053f0E8b339690E49ab3aEB4",
    rpcUrl: "https://sepolia.base.org",
  },

  arc: {
    chainId: 5042002,
    name: "Arc",
    cctpDomain: 26,
    usdcAddress: "0x3600000000000000000000000000000000000000",
    tokenMessenger: "0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA",
    messageTransmitter: "0xE737e5cEBEEBa77EFE34D4aa090756590b1CE275",
    routerAddress: "0x6FC36fD3396310D755A27FD67a0f90A4b7b58A40",
    rpcUrl: "https://rpc.testnet.arc.network",
  },

};

export const ROUTER_ABI = [
  {
    name: "bridge",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "amount", type: "uint256" },
      { name: "destinationDomain", type: "uint32" },
      { name: "recipient", type: "bytes32" },
      { name: "bridgeId", type: "string" },
    ],
    outputs: [],
  },
  {
    name: "isPaused",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "bool" }],
  },
] as const;

export const USDC_ABI = [
  {
    name: "approve",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    name: "allowance",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

export const MESSAGE_TRANSMITTER_ABI = [
  {
    name: "MessageSent",
    type: "event",
    inputs: [
      { name: "message", type: "bytes", indexed: false },
    ],
  },
] as const;

export function getChain(name: string): ChainConfig {
  const chain = CHAINS[name.toLowerCase()];
  if (!chain) throw new Error(`Unknown chain: ${name}`);
  return chain;
}