import { BridgeError } from "../errors/BridgeError";

export interface TrackMintParams {
    burnTxHash: string;
    mintTxHash?: string;
    amountReceived?: string;
    success: boolean;
    bridgeId?: string;
    apiUrl?: string;
}

export async function trackMint(params: TrackMintParams): Promise<void> {
    const { burnTxHash, mintTxHash, amountReceived, success, bridgeId, apiUrl } = params;

    if (!burnTxHash || !burnTxHash.startsWith("0x")) {
        throw new BridgeError("INVALID_INPUT", "Invalid burnTxHash — must be a 0x hex string");
    }

    if (success && (!mintTxHash || !mintTxHash.startsWith("0x"))) {
        throw new BridgeError("INVALID_INPUT", "mintTxHash is required when mint succeeded");
    }

    let response: Response;

    try {
        response = await fetch(`${apiUrl}/track/mint`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                burnTxHash,
                mintTxHash: mintTxHash || null,
                amountReceived: amountReceived || null,
                bridgeId,
                success,
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
            `Failed to track mint — server returned ${response.status}`,
            body
        );
    }
}
