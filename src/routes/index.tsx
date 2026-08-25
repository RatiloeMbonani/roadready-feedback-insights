import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useMutation, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Star, Send, Gauge, ShieldCheck, BarChart3 } from "lucide-react";
import { toast } from "sonner";

import { listServices, submitFeedback } from "@/lib/feedback.functions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import heroImage from "@/assets/road-hero.jpg";

const servicesQuery = queryOptions({
  queryKey: ["service-types"],
  queryFn: () => listServices(),
});

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Share Your Traffic Service Experience | RoadReady Insights" },
      {
        name: "description",
        content:
          "Rate RoadReady licence bookings, vehicle registration, traffic fines and applications. Your feedback is analysed for sentiment in real time.",
      },
      { property: "og:title", content: "Share Your Traffic Service Experience | RoadReady Insights" },
      {
        property: "og:description",
        content:
          "Rate RoadReady traffic services and tell us what happened — analysed instantly with VADER and a Hugging Face sentiment model.",
      },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(servicesQuery),
  component: FeedbackPage,
});

type SentimentLabel = "Positive" | "Neutral" | "Negative";

const sentimentStyles: Record<SentimentLabel, string> = {
  Positive: "bg-positive text-positive-foreground",
  Neutral: "bg-neutral text-neutral-foreground",
  Negative: "bg-negative text-negative-foreground",
};

function FeedbackPage() {
  const { data: services } = useSuspenseQuery(servicesQuery);
  const submit = useServerFn(submitFeedback);

  const [serviceSlug, setServiceSlug] = useState<string>(services[0]?.slug ?? "");
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [result, setResult] = useState<{
    sentiment: SentimentLabel;
    vaderCompound: number;
    modelLabel: string | null;
    modelConfidence: number | null;
    service: string;
  } | null>(null);

  const mutation = useMutation({
    mutationFn: (input: { serviceSlug: string; rating: number; comment: string }) =>
      submit({ data: input }),
    onSuccess: (data) => {
      setResult(data as typeof result);
      setComment("");
      setRating(0);
      toast.success("Thank you — your feedback was recorded.");
    },
    onError: (error: Error) => toast.error(error.message || "Could not submit feedback."),
  });

  const canSubmit = serviceSlug && rating > 0 && comment.trim().length >= 3;

  return (
    <main>
      <section className="relative overflow-hidden border-b border-border/70">
        <img
          src={heroImage}
          alt="Empty highway at dusk with glowing lane markings"
          width={1600}
          height={900}
          className="absolute inset-0 h-full w-full object-cover opacity-25"
        />
        <div className="relative mx-auto max-w-6xl px-5 py-16">
          <p className="eyebrow">Phase 2 · Citizen Voice</p>
          <h1 className="mt-3 max-w-2xl text-4xl font-bold uppercase leading-[1.05] sm:text-6xl">
            Tell us how your traffic service visit really went
          </h1>
          <p className="mt-4 max-w-xl text-base text-muted-foreground">
            Every comment is scored the moment you send it — VADER lexicon analysis plus a
            pre-trained Hugging Face transformer classify it as positive, neutral or negative so
            RoadReady can fix what matters.
          </p>
          <div className="mt-8 flex flex-wrap gap-3 text-sm">
            <span className="flex items-center gap-2 rounded-full border border-border bg-card/70 px-4 py-2">
              <Gauge className="h-4 w-4 text-primary" /> Instant sentiment scoring
            </span>
            <span className="flex items-center gap-2 rounded-full border border-border bg-card/70 px-4 py-2">
              <ShieldCheck className="h-4 w-4 text-primary" /> Anonymous by default
            </span>
            <span className="flex items-center gap-2 rounded-full border border-border bg-card/70 px-4 py-2">
              <BarChart3 className="h-4 w-4 text-primary" /> Feeds the admin dashboard
            </span>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-6 px-5 py-12 lg:grid-cols-[1.4fr_1fr]">
        <form
          className="panel p-6 sm:p-8"
          onSubmit={(event) => {
            event.preventDefault();
            if (!canSubmit) return;
            mutation.mutate({ serviceSlug, rating, comment: comment.trim() });
          }}
        >
          <h2 className="text-2xl font-bold uppercase">Submit feedback</h2>

          <fieldset className="mt-6">
            <legend className="eyebrow">1 · Which service?</legend>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {services.map((service) => {
                const active = service.slug === serviceSlug;
                return (
                  <button
                    key={service.id}
                    type="button"
                    onClick={() => setServiceSlug(service.slug)}
                    aria-pressed={active}
                    className={`rounded-xl border p-4 text-left transition-colors ${
                      active
                        ? "border-primary bg-primary/10"
                        : "border-border bg-secondary/40 hover:border-primary/60"
                    }`}
                  >
                    <span className="font-display text-lg font-semibold uppercase">
                      {service.name}
                    </span>
                    <span className="mt-1 block text-xs text-muted-foreground">
                      {service.description}
                    </span>
                  </button>
                );
              })}
            </div>
          </fieldset>

          <fieldset className="mt-8">
            <legend className="eyebrow">2 · How would you rate it?</legend>
            <div className="mt-3 flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  type="button"
                  aria-label={`${value} star${value > 1 ? "s" : ""}`}
                  onClick={() => setRating(value)}
                  className="transition-transform hover:scale-110"
                >
                  <Star
                    className={`h-9 w-9 ${
                      value <= rating
                        ? "fill-primary text-primary"
                        : "text-muted-foreground/60"
                    }`}
                  />
                </button>
              ))}
              <span className="ml-2 text-sm text-muted-foreground">
                {rating ? `${rating}/5` : "Not rated yet"}
              </span>
            </div>
          </fieldset>

          <fieldset className="mt-8">
            <legend className="eyebrow">3 · What happened?</legend>
            <Textarea
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              rows={6}
              maxLength={2000}
              placeholder="Describe the queue, the staff, the systems, the outcome…"
              className="mt-3 resize-none bg-secondary/40"
            />
            <p className="mt-2 text-xs text-muted-foreground">{comment.length}/2000 characters</p>
          </fieldset>

          <Button
            type="submit"
            size="lg"
            disabled={!canSubmit || mutation.isPending}
            className="mt-8 w-full font-display text-base font-semibold uppercase tracking-wider"
          >
            <Send className="mr-2 h-4 w-4" />
            {mutation.isPending ? "Analysing sentiment…" : "Send feedback"}
          </Button>
        </form>

        <aside className="space-y-6">
          <div className="panel p-6">
            <h2 className="text-xl font-bold uppercase">Your sentiment result</h2>
            {result ? (
              <div className="mt-4 space-y-4 text-sm">
                <Badge className={`${sentimentStyles[result.sentiment]} px-3 py-1 text-sm`}>
                  {result.sentiment}
                </Badge>
                <dl className="space-y-2 text-muted-foreground">
                  <div className="flex justify-between gap-4">
                    <dt>Service</dt>
                    <dd className="text-foreground">{result.service}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt>VADER compound</dt>
                    <dd className="text-foreground">{result.vaderCompound.toFixed(3)}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt>Model</dt>
                    <dd className="text-foreground">
                      {result.modelLabel ?? "VADER only"}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt>Confidence</dt>
                    <dd className="text-foreground">
                      {result.modelConfidence != null
                        ? `${(result.modelConfidence * 100).toFixed(1)}%`
                        : "—"}
                    </dd>
                  </div>
                </dl>
              </div>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">
                Submit the form and your comment's sentiment classification and scores appear here.
              </p>
            )}
          </div>

          <div className="panel p-6 text-sm text-muted-foreground">
            <h2 className="text-xl font-bold uppercase text-foreground">How we analyse it</h2>
            <ul className="mt-3 space-y-2">
              <li>
                <strong className="text-foreground">VADER</strong> — rule-based lexicon scoring
                tuned for short, informal text, giving a compound score from -1 to +1.
              </li>
              <li>
                <strong className="text-foreground">Hugging Face</strong> — a pre-trained
                transformer classifier provides the final label plus a confidence value.
              </li>
              <li>
                Results are stored with the service, rating and timestamp for the administrator
                dashboard.
              </li>
            </ul>
          </div>
        </aside>
      </section>
    </main>
  );
}
