"use client";

import Link from "next/link";
import { ConnectionsSection } from "./_components/ConnectionsSection";
import { BankrollSection } from "./_components/BankrollSection";
import { BettingProfileSection } from "./_components/BettingProfileSection";

export default function SettingsPage() {
  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-3xl mx-auto">
      <div className="mb-6">
        <Link
          href="/dashboard"
          className="text-sm text-gray-500 hover:text-gray-700 mb-2 inline-block"
        >
          ← Dashboard
        </Link>
        <h1 className="text-2xl font-bold text-[var(--text-dark)]">
          Settings
        </h1>
        <p className="text-[var(--text-body)] mt-1">
          Manage connections, bankroll, and preferences. Changes apply across the app.
        </p>
      </div>

      <div className="space-y-10">
        <section>
          <ConnectionsSection />
        </section>

        <section className="pt-6 border-t border-[var(--border-color)]">
          <BankrollSection />
        </section>

        <section className="pt-6 border-t border-[var(--border-color)]">
          <BettingProfileSection />
        </section>

        <section className="pt-6 border-t border-[var(--border-color)]">
          <div>
            <h2 className="text-base font-semibold text-[var(--text-dark)] mb-1">Profile & account</h2>
            <p className="text-sm text-[var(--text-body)] mb-3">
              Name, email, and password are managed on your account page.
            </p>
            <Link
              href="/account"
              className="text-sm text-primary hover:underline font-medium"
            >
              Go to Account →
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
