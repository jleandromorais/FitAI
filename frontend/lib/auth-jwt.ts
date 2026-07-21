import { jwtVerify } from "jose";
import type { NextRequest } from "next/server";

// Espelha com.fitai.fitai_backend.security.JwtUtil: io.jsonwebtoken.security.Keys.hmacShaKeyFor
// escolhe HS256/384/512 conforme o tamanho (em bytes) da chave secreta.
function algForKeyLength(byteLength: number): "HS256" | "HS384" | "HS512" {
  if (byteLength >= 64) return "HS512";
  if (byteLength >= 48) return "HS384";
  return "HS256";
}

function getSigningKey(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET não configurada.");
  }
  return new TextEncoder().encode(secret);
}

export function extractToken(req: NextRequest): string | null {
  const cookieToken = req.cookies.get("token")?.value;
  if (cookieToken) return cookieToken;

  const authHeader = req.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice("Bearer ".length);
  }

  return null;
}

/** Retorna o email (subject) do usuário se o JWT for válido, ou null caso contrário. */
export async function verifyAuthToken(req: NextRequest): Promise<string | null> {
  const token = extractToken(req);
  if (!token) return null;

  try {
    const key = getSigningKey();
    const alg = algForKeyLength(key.byteLength);
    const { payload } = await jwtVerify(token, key, { algorithms: [alg] });
    return typeof payload.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}
