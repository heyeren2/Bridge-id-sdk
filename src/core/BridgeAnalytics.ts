import { trackBurn, TrackBurnParams } from "../tracking/trackBurn";
import { trackAttestation, TrackAttestationParams } from "../tracking/trackAttestation";
import { trackMint, TrackMintParams } from "../tracking/trackMint";
import { getTransactions, GetTransactionsParams } from "../analytics/getTransactions";
import { getUserActivity } from "../analytics/getUserActivity";
import { generateBridgeId } from "../utils/generateBridgeId";
import { getChain, MESSAGE_TRANSMITTER_ABI } from "../chains/config";
import { BridgeError } from "../errors/BridgeError";
import {
  createPublicClient,
  http,
  keccak256,
  decodeEventLog,
} from "viem";

// Types

export type BridgeStatus = "burned" | "attested" | "attestation_failed" | "mint_failed" | "completed" | "not_found";

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

  // Track Burn

  async trackBurn(params: Omit<TrackBurnParams, "bridgeId" | "apiUrl">): Promise<void> {
    await trackBurn({ ...params, bridgeId: this.bridgeId, apiUrl: this.apiUrl });
  }

  // Track Attestation

  async trackAttestation(params: Omit<TrackAttestationParams, "bridgeId" | "apiUrl">): Promise<void> {
    await trackAttestation({ ...params, bridgeId: this.bridgeId, apiUrl: this.apiUrl });
  }

  // Track Mint

  async trackMint(params: Omit<TrackMintParams, "bridgeId" | "apiUrl">): Promise<void> {
    await trackMint({ ...params, bridgeId: this.bridgeId, apiUrl: this.apiUrl });
  }

  // Get Status

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

      const { sourceChain, destinationChain, mintTxHash, status } = tx;

      // If backend already knows the final status, return it
      if (status === "completed" && mintTxHash) {
        return { status: "completed", burnTxHash, sourceChain, destinationChain, mintTxHash };
      }
      if (status === "mint_failed") {
        return { status: "mint_failed", burnTxHash, sourceChain, destinationChain };
      }
      if (status === "attestation_failed") {
        return { status: "attestation_failed", burnTxHash, sourceChain, destinationChain };
      }
      if (status === "attested") {
        return { status: "attested", burnTxHash, sourceChain, destinationChain };
      }

      // Status is "burned" — check on-chain for attestation
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