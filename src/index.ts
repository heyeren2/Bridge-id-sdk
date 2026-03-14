export { BridgeAnalytics } from "./core/BridgeAnalytics";
export { generateBridgeId } from "./utils/generateBridgeId";
export { CHAINS, getChain } from "./chains/config";
export { BridgeError } from "./errors/BridgeError";

export type { BridgeAnalyticsConfig, BridgeParams, BridgeStatus, StatusResult } from "./core/BridgeAnalytics";
export type { TrackBurnParams } from "./tracking/trackBurn";
export type { BridgeTransaction, GetTransactionsParams } from "./analytics/getTransactions";
export type { UserActivity, ActivityTransaction } from "./analytics/getUserActivity";
export type { ChainConfig } from "./chains/config";
export type { BridgeErrorCode } from "./errors/BridgeError";