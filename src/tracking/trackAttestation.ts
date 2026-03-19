import { BridgeError } from "../errors/BridgeError";

export interface TrackAttestationParams {
    burnTxHash: string;
    success: boolean;
    bridgeId?: string;
    apiUrl?: string;
}

export async function trackAttestation(params: TrackAttestationParams): Promise<void> {
    const { burnTxHash, success, bridgeId, apiUrl } = params;

    if (!burnTxHash || !burnTxHash.startsWith("0x")) {
        throw new BridgeError("INVALID_INPUT", "Invalid burnTxHash — must be a 0x hex string");
    }

    let response: Response;

    try {
        response = await fetch(`${apiUrl}/track/attestation`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                burnTxHash,
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
            `Failed to track attestation — server returned ${response.status}`,
            body
        );
    }
}
