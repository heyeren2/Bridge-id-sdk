import { createHash } from "crypto";

export function generateBridgeId(params: {
    projectName: string;
    feeRecipient: string;
}): string {

    const { projectName, feeRecipient } = params;

    const raw = `${projectName.toLowerCase()}_${feeRecipient.toLowerCase()}`;
    const hash = createHash("sha256").update(raw).digest("hex").slice(0, 6);
    const cleanName = projectName.toLowerCase().replace(/[^a-z0-9]/g, "");

    return `${cleanName}_${hash}`;
}