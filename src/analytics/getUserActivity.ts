import { BridgeError } from "../errors/BridgeError";

export interface ActivityTransaction {
  wallet: string; // Added wallet field
  burnTxHash: string;
  mintTxHash: string | null;
  amount: string;
  amountReceived: string | null;
  sourceChain: string;
  destinationChain: string;
  status: "burned" | "attested" | "minted" | "failed";
  timestamp: number;
}

export interface UserActivity {
  wallet: string;
  transactions: ActivityTransaction[];
}

export async function getUserActivity(params: {
  wallet: string;
  apiUrl: string;
}): Promise<UserActivity> {
  const { wallet, apiUrl } = params;

  if (!wallet || !wallet.startsWith("0x")) {
    throw new BridgeError("INVALID_INPUT", "Invalid wallet address");
  }

  let response: Response;

  try {
    response = await fetch(`${apiUrl}/activity/${wallet.toLowerCase()}`);
  } catch (err: any) {
    throw new BridgeError(
      "NETWORK_ERROR",
      "Failed to reach analytics backend",
      err.message
    );
  }

  if (!response.ok) {
    if (response.status === 404) {
      throw new BridgeError("NOT_FOUND", `No activity found for wallet ${wallet}`);
    }
    throw new BridgeError(
      "NETWORK_ERROR",
      `Failed to fetch activity — server returned ${response.status}`
    );
  }

  return response.json();
}