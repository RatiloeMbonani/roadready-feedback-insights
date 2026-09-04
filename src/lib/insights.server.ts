import type { DashboardData } from "./dashboard-stats";

const MODEL = "google/gemini-3.6-flash";

export async function generateInsightsText(data: DashboardData): Promise<string> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new Error("AI is not configured for this project.");

  const summary = {
    totalFeedback: data.total,
    averageRating: data.avgRating,
    sentimentPercentages: data.percentages,
    byService: data.byService,
    trend: data.trend.slice(-14),
    commonIssues: data.commonIssues,
    sampleComments: data.recent.slice(0, 10).map((r) => ({
      service: r.service,
      rating: r.rating,
      sentiment: r.sentiment,
      comment: r.comment.slice(0, 300),
    })),
  };

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        {
          role: "system",
          content:
            "You are a public-service analytics advisor for RoadReady Traffic Services. Analyse citizen feedback statistics and write a concise briefing in markdown with these sections: '## Overview' (2-3 sentences), '## Key findings' (3-5 bullets with numbers), '## Problem areas' (bullets naming services and issues), '## Recommended actions' (3-5 concrete, practical bullets). Be specific, cite the figures given, and never invent data that is not present.",
        },
        {
          role: "user",
          content: `Here is the current feedback data as JSON:\n\n${JSON.stringify(summary)}`,
        },
      ],
    }),
  });

  if (!response.ok) {
    if (response.status === 429) throw new Error("AI is busy right now — please try again shortly.");
    if (response.status === 402)
      throw new Error("AI credits are exhausted. Add credits in Lovable to continue.");
    const detail = await response.text();
    console.error("AI insights failed", response.status, detail);
    throw new Error("Could not generate insights right now.");
  }

  const payload = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const text = payload.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error("The AI returned an empty response.");
  return text;
}
