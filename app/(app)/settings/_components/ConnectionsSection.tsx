"use client";

import { useState, useEffect } from "react";

type KalshiStatus = {
  signedIn: boolean;
  connected: boolean;
  apiKeyIdMasked?: string;
};

type PolymarketStatus = {
  signedIn: boolean;
  connected: boolean;
  walletAddressMasked?: string;
};

export function ConnectionsSection() {
  const [kalshiStatus, setKalshiStatus] = useState<KalshiStatus | null>(null);
  const [polymarketStatus, setPolymarketStatus] = useState<PolymarketStatus | null>(null);
  const [connectLoading, setConnectLoading] = useState(false);
  const [connectForm, setConnectForm] = useState({ apiKeyId: "", privateKeyPem: "" });
  const [polymarketWallet, setPolymarketWallet] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/kalshi/status")
      .then((r) => r.json())
      .then((data: KalshiStatus) => setKalshiStatus(data))
      .catch(() => setKalshiStatus({ signedIn: false, connected: false }));
    fetch("/api/polymarket/status")
      .then((r) => r.json())
      .then((data: PolymarketStatus) => setPolymarketStatus(data))
      .catch(() => setPolymarketStatus({ signedIn: false, connected: false }));
  }, []);

  const connectKalshi = async () => {
    setConnectLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/kalshi/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(connectForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Connect failed");
      setConnectForm({ apiKeyId: "", privateKeyPem: "" });
      const statusRes = await fetch("/api/kalshi/status");
      setKalshiStatus(await statusRes.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Connect failed");
    } finally {
      setConnectLoading(false);
    }
  };

  const disconnectKalshi = async () => {
    setConnectLoading(true);
    setError(null);
    try {
      await fetch("/api/kalshi/connect", { method: "DELETE" });
      setKalshiStatus((prev) => (prev ? { ...prev, connected: false, apiKeyIdMasked: undefined } : null));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Disconnect failed");
    } finally {
      setConnectLoading(false);
    }
  };

  const connectPolymarket = async () => {
    setConnectLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/polymarket/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress: polymarketWallet.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Connect failed");
      setPolymarketWallet("");
      const statusRes = await fetch("/api/polymarket/status");
      setPolymarketStatus(await statusRes.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Connect failed");
    } finally {
      setConnectLoading(false);
    }
  };

  const disconnectPolymarket = async () => {
    setConnectLoading(true);
    setError(null);
    try {
      await fetch("/api/polymarket/connect", { method: "DELETE" });
      setPolymarketStatus((prev) => (prev ? { ...prev, connected: false, walletAddressMasked: undefined } : null));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Disconnect failed");
    } finally {
      setConnectLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold text-[var(--text-dark)] mb-1">Prediction market connections</h2>
        <p className="text-sm text-[var(--text-body)]">
          Connect Kalshi and Polymarket to sync positions to your Portfolio Risk page.
        </p>
      </div>

      {kalshiStatus && (
        <div className="rounded-xl border border-[var(--border-color)] bg-white p-4">
          <h3 className="text-sm font-semibold text-[var(--text-dark)] mb-3">Kalshi</h3>
          {!kalshiStatus.signedIn ? (
            <p className="text-sm text-gray-500">Sign in to connect your Kalshi API keys.</p>
          ) : kalshiStatus.connected ? (
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm text-[var(--text-body)]">
                Connected {kalshiStatus.apiKeyIdMasked && `(${kalshiStatus.apiKeyIdMasked})`}
              </span>
              <button
                type="button"
                onClick={disconnectKalshi}
                disabled={connectLoading}
                className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
              >
                Disconnect
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-gray-500">
                Add your API Key ID and private key from Kalshi → Account &amp; security → API Keys. Stored encrypted.
              </p>
              <div className="flex flex-wrap gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">API Key ID</label>
                  <input
                    type="text"
                    value={connectForm.apiKeyId}
                    onChange={(e) => setConnectForm((p) => ({ ...p, apiKeyId: e.target.value }))}
                    placeholder="e.g. a952bcbe-ec3b-4b5b-b8f9-11dae589608c"
                    className="w-72 px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono"
                  />
                </div>
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-xs text-gray-500 mb-1">Private key (PEM)</label>
                  <textarea
                    value={connectForm.privateKeyPem}
                    onChange={(e) => setConnectForm((p) => ({ ...p, privateKeyPem: e.target.value }))}
                    placeholder="-----BEGIN RSA PRIVATE KEY-----..."
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono"
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={connectKalshi}
                disabled={connectLoading || !connectForm.apiKeyId.trim() || !connectForm.privateKeyPem.trim()}
                className="px-4 py-2 rounded-lg bg-gray-800 text-white text-sm font-medium hover:bg-gray-700 disabled:opacity-50"
              >
                {connectLoading ? "Connecting…" : "Connect Kalshi"}
              </button>
            </div>
          )}
        </div>
      )}

      {polymarketStatus && (
        <div className="rounded-xl border border-[var(--border-color)] bg-white p-4">
          <h3 className="text-sm font-semibold text-[var(--text-dark)] mb-3">Polymarket</h3>
          {!polymarketStatus.signedIn ? (
            <p className="text-sm text-gray-500">Sign in to connect your Polymarket wallet.</p>
          ) : polymarketStatus.connected ? (
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm text-[var(--text-body)]">
                Connected {polymarketStatus.walletAddressMasked && `(${polymarketStatus.walletAddressMasked})`}
              </span>
              <button
                type="button"
                onClick={disconnectPolymarket}
                disabled={connectLoading}
                className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
              >
                Disconnect
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-gray-500">
                Enter the Ethereum wallet address you use on Polymarket. Positions are read via the public Data API.
              </p>
              <div className="flex flex-wrap gap-3 items-end">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Wallet address</label>
                  <input
                    type="text"
                    value={polymarketWallet}
                    onChange={(e) => setPolymarketWallet(e.target.value)}
                    placeholder="0x..."
                    className="w-80 px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono"
                  />
                </div>
                <button
                  type="button"
                  onClick={connectPolymarket}
                  disabled={connectLoading || !polymarketWallet.trim()}
                  className="px-4 py-2 rounded-lg bg-gray-800 text-white text-sm font-medium hover:bg-gray-700 disabled:opacity-50"
                >
                  {connectLoading ? "Connecting…" : "Connect Polymarket"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm">
          {error}
        </div>
      )}
    </div>
  );
}
