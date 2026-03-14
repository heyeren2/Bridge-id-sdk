import { BridgeError } from "../errors/BridgeError";

export interface BridgeTransaction {
  id: string;
  wallet: string;
  amount: string;
  sourceChain: string;
  destinationChain: string;
  burnTxHash: string;
  mintTxHash: string | null;
  status: "burned" | "attested" | "minted" | "failed";
  timestamp: number;
  bridgeId: string;
}

export interface GetTransactionsParams {
  wallet: string;
  apiUrl?: string;
  limit?: number;
  offset?: number;
}

export async function getTransactions(
  params: GetTransactionsParams
): Promise<BridgeTransaction[]> {
  const { wallet, apiUrl, limit = 20, offset = 0 } = params;

  if (!wallet || !wallet.startsWith("0x")) {
    throw new BridgeError("INVALID_INPUT", "Invalid wallet address");
  }

  let response: Response;

  try {
    response = await fetch(
      `${apiUrl}/transactions?wallet=${wallet.toLowerCase()}&limit=${limit}&offset=${offset}`
    );
  } catch (err: any) {
    throw new BridgeError(
      "NETWORK_ERROR",
      "Failed to reach analytics backend",
      err.message
    );
  }

  if (!response.ok) {
    throw new BridgeError(
      "NETWORK_ERROR",
      `Failed to fetch transactions — server returned ${response.status}`
    );
  }

  const data = await response.json();
  return data.transactions as BridgeTransaction[];
}