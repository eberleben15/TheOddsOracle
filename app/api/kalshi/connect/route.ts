import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  encryptKalshiPrivateKey,
  decryptKalshiPrivateKey,
  isKalshiEncryptionConfigured,
} from "@/lib/kalshi-credentials";

/**
 * POST /api/kalshi/connect — save Kalshi API credentials for the current user.
 * Body: { apiKeyId: string, privateKeyPem: string }
 */
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isKalshiEncryptionConfigured()) {
    return Response.json(
      {
        error:
          "Kalshi connect is not configured. Set KALSHI_CREDENTIALS_ENCRYPTION_KEY (64 hex chars) in server environment.",
      },
      { status: 503 }
    );
  }

  let body: { apiKeyId?: string; privateKeyPem?: string };
  try {
    body = (await request.json()) as { apiKeyId?: string; privateKeyPem?: string };
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const apiKeyId = typeof body.apiKeyId === "string" ? body.apiKeyId.trim() : "";
  const privateKeyPem = typeof body.privateKeyPem === "string" ? body.privateKeyPem.trim() : "";

  if (!apiKeyId || !privateKeyPem) {
    return Response.json(
      { error: "apiKeyId and privateKeyPem are required" },
      { status: 400 }
    );
  }

  if (!privateKeyPem.includes("-----BEGIN") || !privateKeyPem.includes("PRIVATE KEY")) {
    return Response.json(
      { error: "privateKeyPem must be a PEM private key (e.g. from Kalshi .key file)" },
      { status: 400 }
    );
  }

  try {
    const privateKeyEncrypted = encryptKalshiPrivateKey(privateKeyPem);

    await prisma.kalshiConnection.upsert({
      where: { userId: session.user.id },
      create: {
        userId: session.user.id,
        apiKeyId,
        privateKeyEncrypted,
      },
      update: {
        apiKeyId,
        privateKeyEncrypted,
      },
    });

    return Response.json({ ok: true, message: "Kalshi account connected" });
  } catch (e) {
    console.error("[kalshi/connect]", e);
    return Response.json(
      { error: e instanceof Error ? e.message : "Failed to save credentials" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/kalshi/connect — remove stored Kalshi credentials.
 */
export async function DELETE() {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  await prisma.kalshiConnection.deleteMany({
    where: { userId: session.user.id },
  });

  return Response.json({ ok: true, message: "Kalshi account disconnected" });
}
