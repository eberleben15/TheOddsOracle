import { Card, CardBody, CardHeader, Button } from "@nextui-org/react";
import { FaCrown, FaCheck, FaTimes } from "react-icons/fa";
import Link from "next/link";

export default function PricingPage() {
  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-6xl mx-auto">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Choose Your Plan</h1>
        <p className="text-xl text-gray-600">
          Unlock advanced betting insights and AI-powered predictions
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Free Plan */}
        <Card className="border-2 border-gray-200">
          <CardHeader className="border-b border-gray-200 pb-4">
            <div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Free</h3>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold text-gray-900">$0</span>
                <span className="text-gray-600">/month</span>
              </div>
            </div>
          </CardHeader>
          <CardBody className="p-6">
            <ul className="space-y-3 mb-6">
              <li className="flex items-start gap-2">
                <FaCheck className="text-green-500 mt-1 flex-shrink-0" />
                <span>View upcoming games and odds</span>
              </li>
              <li className="flex items-start gap-2">
                <FaCheck className="text-green-500 mt-1 flex-shrink-0" />
                <span>Basic team statistics</span>
              </li>
              <li className="flex items-start gap-2">
                <FaCheck className="text-green-500 mt-1 flex-shrink-0" />
                <span>Live game scores</span>
              </li>
              <li className="flex items-start gap-2">
                <FaTimes className="text-gray-400 mt-1 flex-shrink-0" />
                <span className="text-gray-500">AI-powered predictions</span>
              </li>
              <li className="flex items-start gap-2">
                <FaTimes className="text-gray-400 mt-1 flex-shrink-0" />
                <span className="text-gray-500">Recommended bets</span>
              </li>
              <li className="flex items-start gap-2">
                <FaTimes className="text-gray-400 mt-1 flex-shrink-0" />
                <span className="text-gray-500">Advanced analytics</span>
              </li>
            </ul>
            <Link href="/dashboard">
              <Button className="w-full" variant="bordered">
                Current Plan
              </Button>
            </Link>
          </CardBody>
        </Card>

        {/* Premium Plan */}
        <Card className="border-2 border-yellow-400 relative overflow-hidden">
          <div className="absolute top-0 right-0 bg-yellow-400 text-yellow-900 px-4 py-1 text-sm font-bold">
            POPULAR
          </div>
          <CardHeader className="border-b border-gray-200 pb-4 pt-8">
            <div className="flex items-center gap-2 mb-2">
              <FaCrown className="text-yellow-500" />
              <h3 className="text-2xl font-bold text-gray-900">Premium</h3>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold text-gray-900">$19</span>
              <span className="text-gray-600">/month</span>
            </div>
          </CardHeader>
          <CardBody className="p-6">
            <ul className="space-y-3 mb-6">
              <li className="flex items-start gap-2">
                <FaCheck className="text-green-500 mt-1 flex-shrink-0" />
                <span>Everything in Free</span>
              </li>
              <li className="flex items-start gap-2">
                <FaCheck className="text-green-500 mt-1 flex-shrink-0" />
                <span className="font-semibold">AI-powered win probability predictions</span>
              </li>
              <li className="flex items-start gap-2">
                <FaCheck className="text-green-500 mt-1 flex-shrink-0" />
                <span className="font-semibold">Recommended value bets with edge analysis</span>
              </li>
              <li className="flex items-start gap-2">
                <FaCheck className="text-green-500 mt-1 flex-shrink-0" />
                <span className="font-semibold">Advanced matchup analytics</span>
              </li>
              <li className="flex items-start gap-2">
                <FaCheck className="text-green-500 mt-1 flex-shrink-0" />
                <span>Real-time prediction updates</span>
              </li>
              <li className="flex items-start gap-2">
                <FaCheck className="text-green-500 mt-1 flex-shrink-0" />
                <span>Priority support</span>
              </li>
            </ul>
            <Button 
              className="w-full bg-yellow-500 text-white font-semibold hover:bg-yellow-600"
              size="lg"
            >
              Upgrade to Premium
            </Button>
            <p className="text-xs text-gray-500 text-center mt-2">
              Cancel anytime. No credit card required for trial.
            </p>
          </CardBody>
        </Card>
      </div>

      <div className="mt-12 text-center">
        <p className="text-gray-600 mb-4">
          Questions? <Link href="/contact" className="text-blue-600 hover:underline">Contact us</Link>
        </p>
        <p className="text-sm text-gray-500">
          All plans include access to our core features. Premium unlocks AI-powered insights.
        </p>
      </div>
    </div>
  );
}
