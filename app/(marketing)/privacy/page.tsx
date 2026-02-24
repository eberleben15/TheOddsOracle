import Link from "next/link";

export const metadata = {
  title: "Privacy Policy - The Odds Oracle",
  description: "Privacy Policy for The Odds Oracle.",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex flex-col">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex-1">
        <Link
          href="/"
          className="text-sm text-gray-600 hover:text-gray-900 mb-6 inline-block"
        >
          ← Back to Home
        </Link>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Privacy Policy</h1>
        <p className="text-gray-500 text-sm mb-8">Last updated: February 2025</p>

        <div className="prose prose-gray max-w-none space-y-6 text-gray-700">
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-2">1. Information We Collect</h2>
            <p>
              We collect information you provide when signing up (e.g., email, name), usage data
              (e.g., pages visited, features used), and technical data (e.g., IP address, browser)
              to operate and improve the Service.
            </p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-2">2. How We Use It</h2>
            <p>
              We use your information to provide the Service, process payments, send important
              updates, and improve our product. We do not sell your personal information to third
              parties for marketing.
            </p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-2">3. Data Sharing</h2>
            <p>
              We may share data with service providers (e.g., hosting, analytics, payment processors)
              under agreements that protect your data. We may disclose information if required by law.
            </p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-2">4. Security</h2>
            <p>
              We use industry-standard measures to protect your data. No method of transmission or
              storage is 100% secure; we strive to protect your information within our control.
            </p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-2">5. Your Rights</h2>
            <p>
              You may access, correct, or delete your account data through your account settings or
              by contacting us. You may also opt out of marketing communications.
            </p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-2">6. Contact</h2>
            <p>
              For privacy-related questions or requests, contact us through the support channel
              provided in your account or on our website.
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
          <Link href="/terms" className="hover:text-white">
            Terms
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
