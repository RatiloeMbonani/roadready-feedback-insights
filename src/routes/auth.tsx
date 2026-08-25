import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Administrator Sign In | RoadReady Insights" },
      {
        name: "description",
        content:
          "Sign in to the RoadReady Insights administrator dashboard to review citizen feedback sentiment analytics.",
      },
      { property: "og:title", content: "Administrator Sign In | RoadReady Insights" },
      {
        property: "og:description",
        content: "Secure access to RoadReady Traffic Services sentiment analytics.",
      },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: fullName },
          },
        });
        if (error) throw error;
        toast.success("Account created. Check your email if confirmation is required.");
        const { data } = await supabase.auth.getSession();
        if (data.session) navigate({ to: "/dashboard" });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: "/dashboard" });
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Authentication failed.");
    } finally {
      setBusy(false);
    }
  }

  async function handleGoogle() {
    setBusy(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error("Google sign-in failed.");
      setBusy(false);
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/dashboard" });
  }

  return (
    <main className="mx-auto flex max-w-md flex-col px-5 py-16">
      <p className="eyebrow">Restricted area</p>
      <h1 className="mt-2 text-3xl font-bold uppercase">Administrator access</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Sign in to open the RoadReady Insights sentiment dashboard.
      </p>

      <form onSubmit={handleSubmit} className="panel mt-8 space-y-4 p-6">
        {mode === "signup" && (
          <div className="space-y-2">
            <Label htmlFor="fullName">Full name</Label>
            <Input
              id="fullName"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              className="bg-secondary/40"
              required
            />
          </div>
        )}
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="bg-secondary/40"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            minLength={6}
            className="bg-secondary/40"
            required
          />
        </div>
        <Button type="submit" disabled={busy} className="w-full font-display uppercase tracking-wide">
          {mode === "signup" ? "Create account" : "Sign in"}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={busy}
          onClick={handleGoogle}
          className="w-full"
        >
          Continue with Google
        </Button>
        <button
          type="button"
          className="w-full text-center text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
        >
          {mode === "signin" ? "Need an account? Register" : "Already registered? Sign in"}
        </button>
      </form>
    </main>
  );
}
