// Browser-compatible hash (no Node.js crypto dependency)
function simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16).padStart(6, '0').slice(0, 6);
}

export function generateBridgeId(params: {
    projectName: string;
    feeRecipient: string;
}): string {

    const { projectName, feeRecipient } = params;

    const raw = `${projectName.toLowerCase()}_${feeRecipient.toLowerCase()}`;
    const hash = simpleHash(raw);
    const cleanName = projectName.toLowerCase().replace(/[^a-z0-9]/g, "");

    return `${cleanName}_${hash}`;
}