"use client";

import * as React from "react";
import { useQuery } from "convex/react";
import { toast } from "sonner";

import { TransitSimulator } from "@/components/transit-simulator";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { api } from "@/convex/_generated/api";
import { authClient } from "@/lib/auth-client";

export function AuthGate() {
  const { data: session, isPending: sessionPending } = authClient.useSession();
  const signUpEnabled = useQuery(api.auth.isSignUpEnabled, {});

  const [mode, setMode] = React.useState<"sign-in" | "sign-up">("sign-in");
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (signUpEnabled === false && mode === "sign-up") {
      setMode("sign-in");
    }
  }, [mode, signUpEnabled]);

  const handleSignIn = async () => {
    if (!email || !password) {
      toast.error("Email and password are required.");
      return;
    }

    setSubmitting(true);
    try {
      const result = await authClient.signIn.email({
        email,
        password,
      });

      if (result.error) {
        toast.error(result.error.message ?? "Sign in failed.");
        return;
      }

      toast.success("Signed in successfully.");
      setPassword("");
    } catch {
      toast.error("Sign in failed.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSignUp = async () => {
    if (!signUpEnabled) {
      toast.error("Sign up is disabled. Please sign in.");
      return;
    }

    if (!name || !email || !password) {
      toast.error("Name, email, and password are required.");
      return;
    }

    setSubmitting(true);
    try {
      const result = await authClient.signUp.email({
        name,
        email,
        password,
      });

      if (result.error) {
        toast.error(result.error.message ?? "Sign up failed.");
        return;
      }

      toast.success("Account created. Sign in with your credentials.");
      setMode("sign-in");
      setName("");
      setPassword("");
    } catch {
      toast.error("Sign up failed.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSignOut = async () => {
    setSubmitting(true);
    try {
      await authClient.signOut();
      toast.success("Signed out.");
    } catch {
      toast.error("Sign out failed.");
    } finally {
      setSubmitting(false);
    }
  };

  if (sessionPending || signUpEnabled === undefined) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-3xl items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Loading</CardTitle>
            <CardDescription>Checking authentication state...</CardDescription>
          </CardHeader>
        </Card>
      </main>
    );
  }

  if (session?.user) {
    return (
      <>
        <div className="mx-auto flex w-full max-w-6xl justify-end p-4 sm:p-6 lg:p-8">
          <Button
            variant="outline"
            onClick={handleSignOut}
            disabled={submitting}
          >
            Sign Out
          </Button>
        </div>
        <TransitSimulator />
      </>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>TapToGo Authentication</CardTitle>
          <CardDescription>
            {signUpEnabled
              ? "Create the first account once, then use sign in for all future access."
              : "Sign up is disabled. Please sign in."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {signUpEnabled && (
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant={mode === "sign-in" ? "default" : "outline"}
                onClick={() => setMode("sign-in")}
                disabled={submitting}
              >
                Sign In
              </Button>
              <Button
                variant={mode === "sign-up" ? "default" : "outline"}
                onClick={() => setMode("sign-up")}
                disabled={submitting}
              >
                Sign Up
              </Button>
            </div>
          )}

          {mode === "sign-up" && signUpEnabled && (
            <Input
              placeholder="Full name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              disabled={submitting}
            />
          )}

          <Input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            disabled={submitting}
          />

          <Input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            disabled={submitting}
          />

          {mode === "sign-up" && signUpEnabled ? (
            <Button
              onClick={handleSignUp}
              disabled={submitting}
              className="w-full"
            >
              {submitting ? "Creating account..." : "Create Account"}
            </Button>
          ) : (
            <Button
              onClick={handleSignIn}
              disabled={submitting}
              className="w-full"
            >
              {submitting ? "Signing in..." : "Sign In"}
            </Button>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
