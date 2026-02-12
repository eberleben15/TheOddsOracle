"use client";

import { useState, useEffect } from "react";
import type { UserBettingProfile } from "@/types/abe";

const MARKET_OPTIONS = [
  { value: "kalshi", label: "Kalshi" },
  { value: "polymarket", label: "Polymarket" },
];
const SPORT_OPTIONS = [
  { value: "cbb", label: "College Basketball" },
  { value: "nba", label: "NBA" },
  { value: "nfl", label: "NFL" },
];

export function BettingProfileSection() {
  const [profile, setProfile] = useState<UserBettingProfile | null>(null);
  const [markets, setMarkets] = useState<string[]>([]);
  const [sports, setSports] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/profile/betting")
      .then((r) => (r.ok ? r.json() : null))
      .then((data: UserBettingProfile | null) => {
        if (data) {
          setProfile(data);
          setMarkets(data.preferredMarkets ?? []);
          setSports(data.preferredSports ?? []);
        }
      })
      .catch(() => {});
  }, []);

  const toggle = (list: string[], setList: (v: string[]) => void, value: string) => {
    if (list.includes(value)) setList(list.filter((x) => x !== value));
    else setList([...list, value]);
  };

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/profile/betting", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preferredMarkets: markets, preferredSports: sports }),
      });
      if (res.ok) {
        const data = (await res.json()) as UserBettingProfile;
        setProfile(data);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="pt-6 border-t border-[var(--border-color)]">
      <h2 className="text-base font-semibold text-[var(--text-dark)] mb-1">Betting profile</h2>
      <p className="text-sm text-[var(--text-body)] mb-3">
        Preferred markets and sports. Used for your Betting DNA and recommendations.
      </p>
      <div className="space-y-4">
        <div>
          <p className="text-xs text-gray-500 mb-2">Preferred markets</p>
          <div className="flex flex-wrap gap-2">
            {MARKET_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => toggle(markets, setMarkets, opt.value)}
                className={`px-3 py-1.5 rounded-lg text-sm border ${
                  markets.includes(opt.value)
                    ? "bg-primary/10 border-primary text-primary"
                    : "border-gray-300 text-gray-600"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-2">Preferred sports</p>
          <div className="flex flex-wrap gap-2">
            {SPORT_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => toggle(sports, setSports, opt.value)}
                className={`px-3 py-1.5 rounded-lg text-sm border ${
                  sports.includes(opt.value)
                    ? "bg-primary/10 border-primary text-primary"
                    : "border-gray-300 text-gray-600"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save preferences"}
        </button>
      </div>
    </section>
  );
}
