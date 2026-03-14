export type BridgeErrorCode =
  | "INVALID_INPUT"
  | "CHAIN_NOT_FOUND"
  | "NETWORK_ERROR"
  | "NOT_FOUND"
  | "CONFIG_ERROR";

export class BridgeError extends Error {
  code: BridgeErrorCode;
  details?: string;

  constructor(code: BridgeErrorCode, message: string, details?: string) {
    super(message);
    this.name = "BridgeError";
    this.code = code;
    this.details = details;
  }
}