import { trackBurn, TrackBurnParams } from "../tracking/trackBurn";
import { getTransactions, GetTransactionsParams } from "../analytics/getTransactions";
import { getUserActivity } from "../analytics/getUserActivity";
import { generateBridgeId } from "../utils/generateBridgeId";
import { getChain, ROUTER_ABI, USDC_ABI, MESSAGE_TRANSMITTER_ABI } from "../chains/config";
import { BridgeError } from "../errors/BridgeError";
import {
  createPublicClient,
  http,
  parseUnits,
  pad,
  keccak256,
  decodeEventLog,
} from "viem";

// Types

export type BridgeStatus = "burned" | "attested" | "minted" | "not_found";

export interface StatusResult {
  status: BridgeStatus;
  burnTxHash: string;
  sourceChain: string;
  destinationChain?: string;
  mintTxHash?: string;
  attestation?: string;
  messageBytes?: string;
  error?: string;
}

export interface BridgeAnalyticsConfig {
  bridgeId: string;
  apiUrl: string;
  rpcUrls?: Partial<Record<string, string>>;
}

export interface BridgeParams {
  amount: string;
  sourceChain: string;
  destinationChain: string;
  recipientAddress: string;
  walletClient: any;
}

// Class

export class BridgeAnalytics {

  private bridgeId: string;
  private apiUrl: string;
  private rpcUrls: Partial<Record<string, string>>;

  constructor(config: BridgeAnalyticsConfig) {
    if (!config.bridgeId) throw new BridgeError("CONFIG_ERROR", "bridgeId is required");
    if (!config.apiUrl) throw new BridgeError("CONFIG_ERROR", "apiUrl is required");
    this.bridgeId = config.bridgeId;
    this.apiUrl = config.apiUrl;
    this.rpcUrls = config.rpcUrls ?? {};
  }

  private getRpcUrl(chainName: string): string {
    const custom = this.rpcUrls[chainName.toLowerCase()];
    if (custom) return custom;
    return getChain(chainName).rpcUrl;
  }

  // bridge

  async bridge(params: BridgeParams): Promise<string> {
    const { amount, sourceChain, destinationChain, recipientAddress, walletClient } = params;

    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      throw new BridgeError("INVALID_INPUT", "Invalid amount — must be a positive number");
    }
    if (!recipientAddress || !recipientAddress.startsWith("0x")) {
      throw new BridgeError("INVALID_INPUT", "Invalid recipientAddress — must be a 0x hex string");
    }
    if (!sourceChain) {
      throw new BridgeError("INVALID_INPUT", "sourceChain is required");
    }
    if (!destinationChain) {
      throw new BridgeError("INVALID_INPUT", "destinationChain is required");
    }

    let sourceConfig: ReturnType<typeof getChain>;
    let destConfig: ReturnType<typeof getChain>;

    try {
      sourceConfig = getChain(sourceChain);
    } catch {
      throw new BridgeError("CHAIN_NOT_FOUND", `Unsupported source chain: ${sourceChain}`);
    }

    try {
      destConfig = getChain(destinationChain);
    } catch {
      throw new BridgeError("CHAIN_NOT_FOUND", `Unsupported destination chain: ${destinationChain}`);
    }

    const amountRaw = parseUnits(amount, 6);
    const recipientBytes32 = pad(recipientAddress as `0x${string}`, { size: 32 });
    const userAddress = walletClient.account.address;

    const publicClient = createPublicClient({
      transport: http(this.getRpcUrl(sourceChain)),
    });

    try {
      const approveTx = await walletClient.writeContract({
        address: sourceConfig.usdcAddress as `0x${string}`,
        abi: USDC_ABI,
        functionName: "approve",
        args: [sourceConfig.routerAddress as `0x${string}`, amountRaw],
      });
      await publicClient.waitForTransactionReceipt({ hash: approveTx });
    } catch (err: any) {
      throw new BridgeError("NETWORK_ERROR", "USDC approval failed", err.message);
    }

    let receipt: any;

    try {
      const bridgeTx = await walletClient.writeContract({
        address: sourceConfig.routerAddress as `0x${string}`,
        abi: ROUTER_ABI,
        functionName: "bridge",
        args: [amountRaw, destConfig.cctpDomain, recipientBytes32, this.bridgeId],
      });
      receipt = await publicClient.waitForTransactionReceipt({ hash: bridgeTx });
    } catch (err: any) {
      throw new BridgeError("NETWORK_ERROR", "Bridge transaction failed", err.message);
    }

    await trackBurn({
      burnTxHash: receipt.transactionHash,
      wallet: userAddress,
      amount,
      sourceChain,
      destinationChain,
      bridgeId: this.bridgeId,
      apiUrl: this.apiUrl,
    });

    return receipt.transactionHash;
  }

  // getStatus

  async getStatus(burnTxHash: string): Promise<StatusResult> {
    if (!burnTxHash || !burnTxHash.startsWith("0x")) {
      throw new BridgeError("INVALID_INPUT", "Invalid burnTxHash — must be a 0x hex string");
    }

    try {
      const res = await fetch(
        `${this.apiUrl}/transactions?wallet=all&burnTxHash=${burnTxHash}`
      );
      const data = await res.json();
      const tx = data?.transactions?.[0];

      if (!tx) {
        return { status: "not_found", burnTxHash, sourceChain: "unknown" };
      }

      const { sourceChain, destinationChain, mintTxHash } = tx;

      if (tx.status === "minted" && mintTxHash) {
        return { status: "minted", burnTxHash, sourceChain, destinationChain, mintTxHash };
      }

      const sourceClient = createPublicClient({
        transport: http(this.getRpcUrl(sourceChain)),
      });

      const receipt = await sourceClient.getTransactionReceipt({
        hash: burnTxHash as `0x${string}`,
      });

      if (!receipt) {
        return { status: "not_found", burnTxHash, sourceChain };
      }

      let messageBytes: `0x${string}` | null = null;

      for (const log of receipt.logs) {
        try {
          const decoded = decodeEventLog({
            abi: MESSAGE_TRANSMITTER_ABI,
            data: log.data,
            topics: log.topics,
          });
          if (decoded.eventName === "MessageSent") {
            messageBytes = (decoded.args as any).message as `0x${string}`;
            break;
          }
        } catch {
          continue;
        }
      }

      if (!messageBytes) {
        return { status: "burned", burnTxHash, sourceChain, destinationChain };
      }

      const messageHash = keccak256(messageBytes);

      let attestationData: any;

      try {
        const attestationRes = await fetch(
          `https://iris-api-sandbox.circle.com/attestations/${messageHash}`
        );
        attestationData = await attestationRes.json();
      } catch (err: any) {
        throw new BridgeError("NETWORK_ERROR", "Failed to reach Circle attestation API", err.message);
      }

      if (attestationData.status !== "complete" || !attestationData.attestation) {
        return { status: "burned", burnTxHash, sourceChain, destinationChain };
      }

      if (mintTxHash) {
        return {
          status: "minted",
          burnTxHash,
          sourceChain,
          destinationChain,
          mintTxHash,
          attestation: attestationData.attestation,
          messageBytes,
        };
      }

      return {
        status: "attested",
        burnTxHash,
        sourceChain,
        destinationChain,
        attestation: attestationData.attestation,
        messageBytes,
      };

    } catch (err: any) {
      if (err instanceof BridgeError) throw err;
      return {
        status: "not_found",
        burnTxHash,
        sourceChain: "unknown",
        error: err.message,
      };
    }
  }

  // trackBurn

  async trackBurn(params: TrackBurnParams): Promise<void> {
    await trackBurn({ ...params, bridgeId: this.bridgeId, apiUrl: this.apiUrl });
  }

  // Analytics

  async getTransactions(params: GetTransactionsParams) {
    return getTransactions({ ...params, apiUrl: this.apiUrl });
  }

  async getUserActivity(wallet: string) {
    return getUserActivity({ wallet, apiUrl: this.apiUrl });
  }

  getBridgeId(): string {
    return this.bridgeId;
  }
}

export { generateBridgeId };