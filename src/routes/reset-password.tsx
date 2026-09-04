import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/reset-password")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Reset Password | RoadReady Insights" },
      {
        name: "description",
        content: "Choose a new password for your RoadReady Insights administrator account.",
      },
      { property: "og:title", content: "Reset Password | RoadReady Insights" },
      {
        property: "og:description",
        content: "Set a new password for your RoadReady Insights account.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setReady(Boolean(data.session));
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (password !== confirm) {
      toast.error("Passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success("Password updated. You are signed in.");
      navigate({ to: "/dashboard" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update password.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex max-w-md flex-col px-5 py-16">
      <p className="eyebrow">Account recovery</p>
      <h1 className="mt-2 text-3xl font-bold uppercase">Set a new password</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {ready
          ? "Choose a new password for your administrator account."
          : "Open this page from the reset link in your email to continue."}
      </p>

      <form onSubmit={handleSubmit} className="panel mt-8 space-y-4 p-6">
        <div className="space-y-2">
          <Label htmlFor="password">New password</Label>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            minLength={6}
            className="bg-secondary/40"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirm">Confirm new password</Label>
          <Input
            id="confirm"
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
            minLength={6}
            className="bg-secondary/40"
            required
          />
        </div>
        <Button
          type="submit"
          disabled={busy || !ready}
          className="w-full font-display uppercase tracking-wide"
        >
          Update password
        </Button>
      </form>
    </main>
  );
}
