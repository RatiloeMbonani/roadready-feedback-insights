import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";

import { claimAdmin, generateInsights, getDashboard } from "@/lib/feedback.functions";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Sentiment Dashboard | RoadReady Insights" },
      {
        name: "description",
        content:
          "Administrator analytics: feedback volume, sentiment split by service, trends over time and the most common citizen issues.",
      },
      { property: "og:title", content: "Sentiment Dashboard | RoadReady Insights" },
      {
        property: "og:description",
        content: "Track citizen sentiment across RoadReady traffic services in real time.",
      },
    ],
  }),
  component: DashboardPage,
});

const SENTIMENT_COLORS: Record<string, string> = {
  Positive: "var(--color-positive)",
  Neutral: "var(--color-neutral)",
  Negative: "var(--color-negative)",
};

function DashboardPage() {
  const fetchDashboard = useServerFn(getDashboard);
  const runInsights = useServerFn(generateInsights);
  const claim = useServerFn(claimAdmin);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const insightsMutation = useMutation({
    mutationFn: () => runInsights(),
    onError: (err: Error) => toast.error(err.message),
  });

  const { data, isLoading, error } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => fetchDashboard(),
    retry: false,
  });

  const claimMutation = useMutation({
    mutationFn: () => claim(),
    onSuccess: (result) => {
      if (result.granted) {
        toast.success("You are now the administrator.");
        queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      } else {
        toast.error(result.reason ?? "Could not grant access.");
      }
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (isLoading) {
    return <p className="mx-auto max-w-6xl px-5 py-16 text-muted-foreground">Loading analytics…</p>;
  }

  if (error || !data) {
    return (
      <main className="mx-auto max-w-md px-5 py-16">
        <div className="panel p-6">
          <h1 className="text-2xl font-bold uppercase">Administrator access required</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Your account is signed in but is not an administrator. If this platform has no
            administrator yet, you can claim the role now.
          </p>
          <Button
            className="mt-5 w-full font-display uppercase"
            disabled={claimMutation.isPending}
            onClick={() => claimMutation.mutate()}
          >
            Claim administrator access
          </Button>
          <Button
            variant="outline"
            className="mt-3 w-full"
            onClick={async () => {
              await supabase.auth.signOut();
              navigate({ to: "/auth" });
            }}
          >
            Sign out
          </Button>
        </div>
      </main>
    );
  }

  const pieData = (["Positive", "Neutral", "Negative"] as const).map((label) => ({
    name: label,
    value: data.counts[label],
  }));

  return (
    <main className="mx-auto max-w-6xl px-5 py-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Administrator</p>
          <h1 className="mt-2 text-4xl font-bold uppercase">Sentiment dashboard</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Live citizen feedback analytics across all RoadReady traffic services.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={async () => {
            await supabase.auth.signOut();
            navigate({ to: "/auth" });
          }}
        >
          Sign out
        </Button>
      </div>

      <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="Total feedback" value={String(data.total)} />
        <StatCard label="Average rating" value={`${data.avgRating}/5`} />
        <StatCard label="Positive" value={`${data.percentages.Positive}%`} tone="Positive" />
        <StatCard label="Neutral" value={`${data.percentages.Neutral}%`} tone="Neutral" />
        <StatCard label="Negative" value={`${data.percentages.Negative}%`} tone="Negative" />
      </section>

      <section className="panel mt-6 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="eyebrow">AI-assisted</p>
            <h2 className="mt-1 text-xl font-bold uppercase">Insights &amp; recommendations</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Let AI read the current feedback data and summarise what matters, what is going wrong
              and what to do next.
            </p>
          </div>
          <Button
            className="font-display uppercase"
            disabled={insightsMutation.isPending}
            onClick={() => insightsMutation.mutate()}
          >
            {insightsMutation.isPending ? "Analysing…" : "Generate insights"}
          </Button>
        </div>

        {insightsMutation.data ? (
          <div className="mt-5 space-y-2 text-sm leading-relaxed">
            {insightsMutation.data.insights.split("\n").map((line, index) => {
              const text = line.trim().replace(/\*\*/g, "");
              if (!text) return null;
              if (text.startsWith("#")) {
                return (
                  <h3 key={index} className="pt-3 font-display text-base font-bold uppercase">
                    {text.replace(/^#+\s*/, "")}
                  </h3>
                );
              }
              const bullet = text.startsWith("-") || text.startsWith("*");
              return (
                <p
                  key={index}
                  className={bullet ? "pl-4 text-muted-foreground" : "text-muted-foreground"}
                >
                  {bullet ? `• ${text.replace(/^[-*]\s*/, "")}` : text}
                </p>
              );
            })}
          </div>
        ) : (
          <p className="mt-5 text-sm text-muted-foreground">
            {insightsMutation.isPending
              ? "Reading the latest citizen feedback…"
              : "No analysis generated yet."}
          </p>
        )}
      </section>



      <section className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="panel p-6">
          <h2 className="text-xl font-bold uppercase">Overall sentiment split</h2>
          <div className="mt-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={60} outerRadius={100}>
                  {pieData.map((entry) => (
                    <Cell key={entry.name} fill={SENTIMENT_COLORS[entry.name]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: "var(--color-card)",
                    border: "1px solid var(--color-border)",
                    borderRadius: "8px",
                  }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="panel p-6">
          <h2 className="text-xl font-bold uppercase">Sentiment by service</h2>
          <div className="mt-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.byService}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="service" tick={{ fontSize: 11 }} stroke="var(--color-muted-foreground)" />
                <YAxis allowDecimals={false} stroke="var(--color-muted-foreground)" />
                <Tooltip
                  contentStyle={{
                    background: "var(--color-card)",
                    border: "1px solid var(--color-border)",
                    borderRadius: "8px",
                  }}
                />
                <Legend />
                <Bar dataKey="positive" stackId="a" name="Positive" fill="var(--color-positive)" />
                <Bar dataKey="neutral" stackId="a" name="Neutral" fill="var(--color-neutral)" />
                <Bar dataKey="negative" stackId="a" name="Negative" fill="var(--color-negative)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="panel p-6 lg:col-span-2">
          <h2 className="text-xl font-bold uppercase">Sentiment trend over time</h2>
          <div className="mt-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="var(--color-muted-foreground)" />
                <YAxis allowDecimals={false} stroke="var(--color-muted-foreground)" />
                <Tooltip
                  contentStyle={{
                    background: "var(--color-card)",
                    border: "1px solid var(--color-border)",
                    borderRadius: "8px",
                  }}
                />
                <Legend />
                <Line type="monotone" dataKey="Positive" stroke="var(--color-positive)" strokeWidth={2} />
                <Line type="monotone" dataKey="Neutral" stroke="var(--color-neutral)" strokeWidth={2} />
                <Line type="monotone" dataKey="Negative" stroke="var(--color-negative)" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="panel p-6">
          <h2 className="text-xl font-bold uppercase">Common issues</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Most frequent terms in neutral and negative feedback.
          </p>
          {data.commonIssues.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">No issues detected yet.</p>
          ) : (
            <ul className="mt-4 space-y-2">
              {data.commonIssues.map((issue) => (
                <li key={issue.term} className="flex items-center gap-3">
                  <span className="w-32 truncate text-sm">{issue.term}</span>
                  <span className="h-2 flex-1 rounded-full bg-secondary">
                    <span
                      className="block h-2 rounded-full bg-primary"
                      style={{
                        width: `${(issue.count / data.commonIssues[0]!.count) * 100}%`,
                      }}
                    />
                  </span>
                  <span className="w-8 text-right text-sm text-muted-foreground">{issue.count}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="panel p-6">
          <h2 className="text-xl font-bold uppercase">Latest feedback</h2>
          {data.recent.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">No feedback submitted yet.</p>
          ) : (
            <ul className="mt-4 space-y-4">
              {data.recent.map((item) => (
                <li key={item.id} className="border-b border-border/60 pb-3 last:border-none">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold">{item.service}</span>
                    <Badge
                      style={{
                        background: SENTIMENT_COLORS[item.sentiment],
                        color: "var(--color-background)",
                      }}
                    >
                      {item.sentiment}
                    </Badge>
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{item.comment}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {item.rating}/5 · VADER {item.vader?.toFixed?.(2) ?? "—"} ·{" "}
                    {new Date(item.createdAt).toLocaleString()}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </main>
  );
}

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "Positive" | "Neutral" | "Negative";
}) {
  return (
    <div className="panel p-5">
      <p className="eyebrow">{label}</p>
      <p
        className="mt-2 font-display text-3xl font-bold"
        style={tone ? { color: SENTIMENT_COLORS[tone] } : undefined}
      >
        {value}
      </p>
    </div>
  );
}
