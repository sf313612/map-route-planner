import { IncomingMessage } from "http";
import { extractBearerToken, verifyJwtToken } from "../middleware/auth";

export function getUserFromRequest(req: IncomingMessage): string | null {
  const authHeader = req.headers["authorization"];
  const headerValue = Array.isArray(authHeader) ? authHeader[0] : authHeader;

  let token = extractBearerToken(headerValue);

  if (!token && req.url) {
    const url = new URL(req.url, "http://localhost");
    token = url.searchParams.get("token");
  }

  if (!token) return null;

  try {
    const payload = verifyJwtToken(token);
    return payload.userId;
  } catch {
    return null;
  }
}
