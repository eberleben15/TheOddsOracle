"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, Card, CardBody, CardHeader, Divider } from "@nextui-org/react";
import { CheckIcon, XMarkIcon } from "@heroicons/react/24/outline";
import Link from "next/link";

type SubscriptionTier = "FREE" | "PREMIUM" | "PRO";

interface TierFeature {
  name: string;
  free: boolean | string;
  premium: boolean | string;
  pro: boolean | string;
}

const features: TierFeature[] = [
  {
    name: "Basic scores & odds",
    free: true,
    premium: true,
    pro: true,
  },
  {
    name: "Limited analytics (3 games/day)",
    free: true,
    premium: false,
    pro: false,
  },
  {
    name: "Standard team statistics",
    free: true,
    premium: true,
    pro: true,
  },
  {
    name: "Unlimited analysis",
    free: false,
    premium: true,
    pro: true,
  },
  {
    name: "Advanced analytics",
    free: false,
    premium: true,
    pro: true,
  },
  {
    name: "Favorable bet recommendations",
    free: false,
    premium: true,
    pro: true,
  },
  {
    name: "Real-time alerts",
    free: false,
    premium: true,
    pro: true,
  },
  {
    name: "Historical performance tracking",
    free: false,
    premium: true,
    pro: true,
  },
  {
    name: "Email support",
    free: false,
    premium: true,
    pro: true,
  },
  {
    name: "AI-powered custom betting strategies",
    free: false,
    premium: false,
    pro: true,
  },
  {
    name: "Portfolio management & bankroll tracking",
    free: false,
    premium: false,
    pro: true,
  },
  {
    name: "API access",
    free: false,
    premium: false,
    pro: true,
  },
  {
    name: "Priority support & Discord access",
    free: false,
    premium: false,
    pro: true,
  },
  {
    name: "Early access to new features",
    free: false,
    premium: false,
    pro: true,
  },
];

const tiers = [
  {
    id: "FREE" as SubscriptionTier,
    name: "The Oracle Apprentice",
    price: "$0",
    period: "month",
    description: "Perfect for casual bettors getting started",
    popular: false,
  },
  {
    id: "PREMIUM" as SubscriptionTier,
    name: "The Oracle Insider",
    price: "$19.99",
    period: "month",
    description: "For serious bettors who want an edge",
    popular: true,
  },
  {
    id: "PRO" as SubscriptionTier,
    name: "The Oracle Master",
    price: "$49.99",
    period: "month",
    description: "Maximum advantage with AI-powered insights",
    popular: false,
  },
];

export default function PricingPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [priceIds, setPriceIds] = useState<{ premium?: string; pro?: string }>({});

  const canceled = searchParams.get("canceled");
  const success = searchParams.get("success");

  const currentTier = (session?.user?.subscriptionStatus as SubscriptionTier) || "FREE";

  // Fetch price IDs on mount
  useEffect(() => {
    fetch("/api/stripe/prices")
      .then((res) => res.json())
      .then((data) => setPriceIds(data))
      .catch((err) => console.error("Failed to fetch price IDs:", err));
  }, []);

  const handleUpgrade = async (tierId: SubscriptionTier, priceId?: string) => {
    if (!session?.user) {
      router.push(`/auth/signin?callbackUrl=${encodeURIComponent("/pricing")}`);
      return;
    }

    if (tierId === "FREE") {
      return; // Can't upgrade to free
    }

    if (!priceId) {
      setError("Price ID not configured for this tier. Please contact support.");
      return;
    }

    setLoading(tierId);
    setError(null);

    try {
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          priceId,
          mode: "subscription",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || "Failed to create checkout session");
      }

      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error("No checkout URL returned");
      }
    } catch (err) {
      console.error("Checkout error:", err);
      setError(err instanceof Error ? err.message : "Failed to start checkout. Please try again.");
      setLoading(null);
    }
  };

  const getPriceId = (tierId: SubscriptionTier): string | undefined => {
    if (tierId === "PREMIUM") {
      return priceIds.premium || undefined;
    }
    if (tierId === "PRO") {
      return priceIds.pro || undefined;
    }
    return undefined;
  };

  const isCurrentTier = (tierId: SubscriptionTier) => {
    return currentTier === tierId;
  };

  const canUpgrade = (tierId: SubscriptionTier) => {
    if (tierId === "FREE") return false;
    if (tierId === "PREMIUM" && currentTier === "PRO") return false; // Can't downgrade via upgrade button
    return currentTier !== tierId;
  };

  return (
    <div className="flex-1 p-6 bg-body-bg overflow-y-auto">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-text-dark mb-4">Choose Your Plan</h1>
          <p className="text-lg text-text-body max-w-2xl mx-auto">
            Unlock advanced betting insights and analytics to make smarter betting decisions
          </p>
        </div>

        {canceled && (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800">
            Checkout was canceled. You can try again anytime.
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-800">
            Payment successful! Your subscription is being activated.
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
            {error}
          </div>
        )}

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {tiers.map((tier) => {
            const priceId = getPriceId(tier.id);
            const isCurrent = isCurrentTier(tier.id);
            const canUpgradeTo = canUpgrade(tier.id);

            return (
              <Card
                key={tier.id}
                className={`relative ${tier.popular ? "border-2 border-primary shadow-lg" : ""} ${
                  isCurrent ? "ring-2 ring-success" : ""
                }`}
              >
                {tier.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <span className="bg-primary text-white px-4 py-1 rounded-full text-sm font-semibold">
                      Most Popular
                    </span>
                  </div>
                )}
                {isCurrent && (
                  <div className="absolute -top-4 right-4">
                    <span className="bg-success text-white px-3 py-1 rounded-full text-xs font-semibold">
                      Current Plan
                    </span>
                  </div>
                )}

                <CardHeader className="pb-4">
                  <div className="w-full text-center">
                    <h3 className="text-2xl font-bold text-text-dark mb-2">{tier.name}</h3>
                    <div className="flex items-baseline justify-center gap-1">
                      <span className="text-4xl font-bold text-text-dark">{tier.price}</span>
                      <span className="text-text-body">/{tier.period}</span>
                    </div>
                    <p className="text-sm text-text-body mt-2">{tier.description}</p>
                  </div>
                </CardHeader>

                <Divider />

                <CardBody className="pt-6">
                  <div className="space-y-4 mb-6">
                    {isCurrent ? (
                      <Button
                        color="success"
                        variant="flat"
                        className="w-full"
                        disabled
                      >
                        Current Plan
                      </Button>
                    ) : canUpgradeTo ? (
                      <Button
                        color="primary"
                        className="w-full"
                        onClick={() => handleUpgrade(tier.id, priceId)}
                        isLoading={loading === tier.id}
                        disabled={!priceId}
                      >
                        {priceId ? "Upgrade Now" : "Coming Soon"}
                      </Button>
                    ) : (
                      <Button
                        color="default"
                        variant="flat"
                        className="w-full"
                        disabled
                      >
                        {tier.id === "FREE" ? "Current Plan" : "Downgrade Available"}
                      </Button>
                    )}

                    {!session?.user && (
                      <Link href={`/auth/signin?callbackUrl=${encodeURIComponent("/pricing")}`}>
                        <Button color="primary" variant="bordered" className="w-full">
                          Sign In to Subscribe
                        </Button>
                      </Link>
                    )}
                  </div>
                </CardBody>
              </Card>
            );
          })}
        </div>

        {/* Feature Comparison Table */}
        <Card className="mb-8">
          <CardHeader>
            <h2 className="text-2xl font-semibold text-text-dark">Feature Comparison</h2>
          </CardHeader>
          <Divider />
          <CardBody className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border-gray">
                    <th className="text-left p-4 font-semibold text-text-dark">Feature</th>
                    <th className="text-center p-4 font-semibold text-text-dark">Free</th>
                    <th className="text-center p-4 font-semibold text-text-dark">Premium</th>
                    <th className="text-center p-4 font-semibold text-text-dark">Pro</th>
                  </tr>
                </thead>
                <tbody>
                  {features.map((feature, index) => (
                    <tr
                      key={index}
                      className={`border-b border-border-gray ${index % 2 === 0 ? "bg-body-bg" : ""}`}
                    >
                      <td className="p-4 text-text-body">{feature.name}</td>
                      <td className="p-4 text-center">
                        {feature.free === true ? (
                          <CheckIcon className="h-5 w-5 text-success mx-auto" />
                        ) : feature.free === false ? (
                          <XMarkIcon className="h-5 w-5 text-gray-300 mx-auto" />
                        ) : (
                          <span className="text-sm text-text-body">{feature.free}</span>
                        )}
                      </td>
                      <td className="p-4 text-center">
                        {feature.premium === true ? (
                          <CheckIcon className="h-5 w-5 text-success mx-auto" />
                        ) : feature.premium === false ? (
                          <XMarkIcon className="h-5 w-5 text-gray-300 mx-auto" />
                        ) : (
                          <span className="text-sm text-text-body">{feature.premium}</span>
                        )}
                      </td>
                      <td className="p-4 text-center">
                        {feature.pro === true ? (
                          <CheckIcon className="h-5 w-5 text-success mx-auto" />
                        ) : feature.pro === false ? (
                          <XMarkIcon className="h-5 w-5 text-gray-300 mx-auto" />
                        ) : (
                          <span className="text-sm text-text-body">{feature.pro}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>

        {/* FAQ or Additional Info */}
        <Card>
          <CardHeader>
            <h2 className="text-2xl font-semibold text-text-dark">Frequently Asked Questions</h2>
          </CardHeader>
          <Divider />
          <CardBody className="space-y-4">
            <div>
              <h3 className="font-semibold text-text-dark mb-2">Can I change my plan later?</h3>
              <p className="text-text-body">
                Yes! You can upgrade or downgrade your plan at any time from your account settings.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-text-dark mb-2">What payment methods do you accept?</h3>
              <p className="text-text-body">
                We accept all major credit cards through Stripe. Your payment information is secure and never stored on our servers.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-text-dark mb-2">Is there a free trial?</h3>
              <p className="text-text-body">
                The Free tier is always free. Premium and Pro plans are available with a 14-day free trial (coming soon).
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-text-dark mb-2">Can I cancel anytime?</h3>
              <p className="text-text-body">
                Yes, you can cancel your subscription at any time from your account settings. You'll continue to have access until the end of your billing period.
              </p>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

