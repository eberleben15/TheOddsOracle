import Link from "next/link";

export const metadata = {
  title: "Terms of Service - The Odds Oracle",
  description: "Terms of Service for The Odds Oracle.",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex flex-col">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex-1">
        <Link
          href="/"
          className="text-sm text-gray-600 hover:text-gray-900 mb-6 inline-block"
        >
          ← Back to Home
        </Link>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Terms of Service</h1>
        <p className="text-gray-500 text-sm mb-8">Last updated: February 2025</p>

        <div className="prose prose-gray max-w-none space-y-6 text-gray-700">
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-2">1. Acceptance of Terms</h2>
            <p>
              By accessing or using The Odds Oracle (&quot;Service&quot;), you agree to be bound by these
              Terms of Service. If you do not agree, do not use the Service.
            </p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-2">2. Description of Service</h2>
            <p>
              The Odds Oracle provides sports betting insights, odds comparison, analytics, and related
              tools for informational purposes. We do not accept wagers or operate as a sportsbook.
            </p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-2">3. Eligibility</h2>
            <p>
              You must be at least 18 years old (or the age of majority in your jurisdiction) to use
              the Service. You are responsible for complying with local laws regarding sports betting
              and gambling.
            </p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-2">4. No Guarantees</h2>
            <p>
              Insights, predictions, and recommendations are for informational purposes only. Past
              performance does not guarantee future results. You use the Service at your own risk.
            </p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-2">5. Contact</h2>
            <p>
              For questions about these terms, contact us through the support channel provided in
              your account or on our website.
            </p>
          </section>
        </div>
      </div>

      <footer className="bg-gray-900 text-gray-300 py-8 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm">
          <Link href="/" className="hover:text-white">
            The Odds Oracle
          </Link>
          {" · "}
          <Link href="/privacy" className="hover:text-white">
            Privacy
          </Link>
          {" · "}
          <Link href="/pricing" className="hover:text-white">
            Pricing
          </Link>
          <p className="mt-2">&copy; {new Date().getFullYear()} The Odds Oracle. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
