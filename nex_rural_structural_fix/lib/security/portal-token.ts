import crypto from "node:crypto";

export type PortalTokenPayload = {
  company_id: string;
  company_code: string;
  client_id: string;
  client_name: string;
  exp: number;
};

function portalSecret() {
  const secret = process.env.PORTAL_SESSION_SECRET || process.env.BOOTSTRAP_SECRET;
  if (!secret || secret.length < 24) {
    throw new Error("Configure PORTAL_SESSION_SECRET com pelo menos 24 caracteres.");
  }
  return secret;
}

function base64url(value: string | Buffer) {
  return Buffer.from(value).toString("base64url");
}

function sign(data: string) {
  return crypto.createHmac("sha256", portalSecret()).update(data).digest("base64url");
}

export function createPortalToken(payload: Omit<PortalTokenPayload, "exp">, ttlSeconds = 60 * 60) {
  const body: PortalTokenPayload = {
    ...payload,
    exp: Math.floor(Date.now() / 1000) + ttlSeconds
  };
  const data = base64url(JSON.stringify(body));
  return `${data}.${sign(data)}`;
}

export function verifyPortalToken(token: string) {
  const [data, signature] = token.split(".");
  if (!data || !signature) throw new Error("Token do portal invalido.");

  const expected = sign(data);
  const expectedBuffer = Buffer.from(expected);
  const signatureBuffer = Buffer.from(signature);
  if (expectedBuffer.length !== signatureBuffer.length || !crypto.timingSafeEqual(expectedBuffer, signatureBuffer)) {
    throw new Error("Token do portal invalido.");
  }

  const payload = JSON.parse(Buffer.from(data, "base64url").toString("utf8")) as PortalTokenPayload;
  if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) throw new Error("Token do portal expirado.");
  return payload;
}

export function readBearerToken(headers: Headers) {
  return headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim() || "";
}
