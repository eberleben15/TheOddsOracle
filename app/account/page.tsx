"use client";

import { useEffect, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { Button, Card, CardBody, CardHeader, Input, Skeleton } from "@nextui-org/react";

type SubscriptionInfo = {
  status: string;
  stripeCustomerId?: string | null;
  stripePriceId?: string | null;
};

export default function AccountPage() {
  const { data: session, status } = useSession();
  const [sub, setSub] = useState<SubscriptionInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSub = async () => {
      try {
        const res = await fetch("/api/auth/session");
        const json = await res.json();
        setSub({
          status: json?.user?.subscriptionStatus || "FREE",
          stripeCustomerId: json?.user?.stripeCustomerId || null,
          stripePriceId: json?.user?.stripePriceId || null,
        });
      } catch (e) {
        setSub(null);
      } finally {
        setLoading(false);
      }
    };
    fetchSub();
  }, []);

  if (status === "loading" || loading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!session?.user) {
    return (
      <div className="p-6 space-y-4">
        <p className="text-lg">You need to sign in to view your profile.</p>
        <Link href="/auth/signin" className="text-primary underline">
          Go to Sign In
        </Link>
      </div>
    );
  }

  const email = session.user.email ?? "";
  const name = session.user.name ?? "User";
  const subStatus = sub?.status || "FREE";

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-text-dark">Profile</h1>
          <p className="text-text-body">Manage your account and subscription</p>
        </div>
        <Button color="danger" variant="flat" onPress={() => signOut({ callbackUrl: "/" })}>
          Sign Out
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="space-y-1">
            <p className="text-lg font-semibold text-text-dark">User Info</p>
            <p className="text-text-body text-sm">View and edit your details</p>
          </div>
        </CardHeader>
        <CardBody className="space-y-4">
          <Input label="Name" value={name} readOnly />
          <Input label="Email" value={email} readOnly />
          <div className="flex gap-3">
            <Button variant="flat" color="primary" as={Link} href="/settings">
              Edit Profile (coming soon)
            </Button>
            <Button variant="flat" color="secondary" as={Link} href="/settings/password">
              Change Password (coming soon)
            </Button>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <div className="space-y-1">
            <p className="text-lg font-semibold text-text-dark">Subscription</p>
            <p className="text-text-body text-sm">View, change, or cancel your plan</p>
          </div>
        </CardHeader>
        <CardBody className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-text-body">Current Plan</p>
              <p className="text-xl font-semibold text-text-dark">{subStatus}</p>
            </div>
            <div className="flex gap-3">
              <Button as={Link} href="/pricing" variant="flat" color="primary">
                Change Plan
              </Button>
              <Button as={Link} href="/account/billing" variant="flat" color="secondary">
                Manage Billing (coming soon)
              </Button>
              <Button variant="flat" color="danger">
                Cancel (coming soon)
              </Button>
            </div>
          </div>
          <div className="text-sm text-text-body">
            <p>Email: {email}</p>
            <p>Stripe Customer: {sub?.stripeCustomerId || "N/A"}</p>
            <p>Price ID: {sub?.stripePriceId || "N/A"}</p>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

