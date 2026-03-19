export { BridgeAnalytics } from "./core/BridgeAnalytics";
export { generateBridgeId } from "./utils/generateBridgeId";
export { CHAINS, getChain } from "./chains/config";
export { BridgeError } from "./errors/BridgeError";

export type { BridgeAnalyticsConfig, BridgeStatus, StatusResult } from "./core/BridgeAnalytics";
export type { TrackBurnParams } from "./tracking/trackBurn";
export type { TrackAttestationParams } from "./tracking/trackAttestation";
export type { TrackMintParams } from "./tracking/trackMint";
export type { BridgeTransaction, GetTransactionsParams } from "./analytics/getTransactions";
export type { UserActivity, ActivityTransaction } from "./analytics/getUserActivity";
export type { ChainConfig } from "./chains/config";
export type { BridgeErrorCode } from "./errors/BridgeError";