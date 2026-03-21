export interface ChainConfig {
    chainId: number;
    name: string;
    rpcUrl: string;
}

export const CHAINS: Record<string, ChainConfig> = {

    "ethereum sepolia": {
        chainId: 11155111,
        name: "Sepolia",
        rpcUrl: "https://rpc.sepolia.org",
    },

    "base sepolia": {
        chainId: 84532,
        name: "Base",
        rpcUrl: "https://sepolia.base.org",
    },

    "arc testnet": {
        chainId: 5042002,
        name: "Arc",
        rpcUrl: "https://rpc.testnet.arc.network",
    },

};

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