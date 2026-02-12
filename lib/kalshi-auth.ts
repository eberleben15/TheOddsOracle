/**
 * Kalshi API request signing (RSA-PSS with SHA256).
 * @see https://docs.kalshi.com/getting_started/quick_start_authenticated_requests
 */

import crypto from "crypto";

/**
 * Create KALSHI-ACCESS-SIGNATURE for an authenticated request.
 * Message = timestamp + method + path (without query string).
 * Sign with RSA-PSS, SHA256, salt length = digest length; then base64.
 */
export function createKalshiSignature(
  privateKeyPem: string,
  timestamp: string,
  method: string,
  path: string
): string {
  const pathWithoutQuery = path.split("?")[0];
  const message = `${timestamp}${method}${pathWithoutQuery}`;

  const key = crypto.createPrivateKey({
    key: privateKeyPem,
    format: "pem",
  });

  const signature = crypto.sign("sha256", Buffer.from(message, "utf8"), {
    key,
    padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
    saltLength: crypto.constants.RSA_PSS_SALTLEN_DIGEST,
  });

  return signature.toString("base64");
}

/**
 * Build auth headers for a Kalshi authenticated request.
 */
export function getKalshiAuthHeaders(
  apiKeyId: string,
  privateKeyPem: string,
  method: string,
  path: string
): Record<string, string> {
  const timestamp = String(Date.now());
  const signature = createKalshiSignature(privateKeyPem, timestamp, method, path);
  return {
    "KALSHI-ACCESS-KEY": apiKeyId,
    "KALSHI-ACCESS-TIMESTAMP": timestamp,
    "KALSHI-ACCESS-SIGNATURE": signature,
  };
}
