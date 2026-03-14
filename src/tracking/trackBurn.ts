import { BridgeError } from "../errors/BridgeError";

export interface TrackBurnParams {
  burnTxHash: string;
  wallet: string;
  amount: string;
  sourceChain: string;
  destinationChain: string;
  bridgeId?: string;
  apiUrl?: string;
}

export async function trackBurn(params: TrackBurnParams): Promise<void> {
  const { burnTxHash, wallet, amount, sourceChain, destinationChain, bridgeId, apiUrl } = params;

  if (!burnTxHash || !burnTxHash.startsWith("0x")) {
    throw new BridgeError("INVALID_INPUT", "Invalid burnTxHash — must be a 0x hex string");
  }
  if (!wallet || !wallet.startsWith("0x")) {
    throw new BridgeError("INVALID_INPUT", "Invalid wallet address — must be a 0x hex string");
  }
  if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
    throw new BridgeError("INVALID_INPUT", "Invalid amount — must be a positive number");
  }
  if (!sourceChain) {
    throw new BridgeError("INVALID_INPUT", "sourceChain is required");
  }
  if (!destinationChain) {
    throw new BridgeError("INVALID_INPUT", "destinationChain is required");
  }

  let response: Response;

  try {
    response = await fetch(`${apiUrl}/track/burn`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        burnTxHash,
        wallet: wallet.toLowerCase(),
        amount,
        sourceChain: sourceChain.toLowerCase(),
        destinationChain: destinationChain.toLowerCase(),
        bridgeId,
        timestamp: Date.now(),
      }),
    });
  } catch (err: any) {
    throw new BridgeError(
      "NETWORK_ERROR",
      "Failed to reach analytics backend",
      err.message
    );
  }

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new BridgeError(
      "NETWORK_ERROR",
      `Failed to track burn — server returned ${response.status}`,
      body
    );
  }
}