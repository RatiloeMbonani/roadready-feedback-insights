export type SentimentLabel = "Positive" | "Neutral" | "Negative";

export interface FeedbackRow {
  id: string;
  service_id: string;
  rating: number;
  comment: string;
  sentiment: string | null;
  vader_compound: number | null;
  created_at: string;
}

export interface ServiceRow {
  id: string;
  name: string;
}

const STOP_WORDS = new Set([
  "the","and","for","was","were","that","this","with","have","has","had","are","but","not","you","your","they","them","there","their","from","been","very","just","when","what","who","will","would","could","should","about","into","than","then","because","only","also","after","before","while","still","again","much","many","more","most","some","such","over","under","being","did","does","doing","get","got","out","its","it's","i've","i'm","dont","don't","cant","can't","didnt","didn't","too","all","any","own","how","why","which","were","here","she","him","her","his","hers","was","our","ours","one","two","time","times","service","services","staff","office","said","went","take","took","really","made","make","see","need","needed","use","used","even","back","day","days","week","weeks",
]);

export function buildDashboard(rows: FeedbackRow[], services: ServiceRow[]) {
  const serviceName = new Map(services.map((s) => [s.id, s.name]));
  const total = rows.length;

  const counts: Record<SentimentLabel, number> = { Positive: 0, Neutral: 0, Negative: 0 };
  for (const row of rows) {
    const label = (row.sentiment ?? "Neutral") as SentimentLabel;
    if (label in counts) counts[label] += 1;
  }

  const pct = (n: number) => (total ? Math.round((n / total) * 1000) / 10 : 0);

  const byService = services.map((service) => {
    const serviceRows = rows.filter((r) => r.service_id === service.id);
    const c: Record<SentimentLabel, number> = { Positive: 0, Neutral: 0, Negative: 0 };
    for (const row of serviceRows) {
      const label = (row.sentiment ?? "Neutral") as SentimentLabel;
      if (label in c) c[label] += 1;
    }
    const avgRating = serviceRows.length
      ? Math.round((serviceRows.reduce((sum, r) => sum + r.rating, 0) / serviceRows.length) * 10) / 10
      : 0;
    return {
      service: service.name,
      total: serviceRows.length,
      avgRating,
      positive: c.Positive,
      neutral: c.Neutral,
      negative: c.Negative,
    };
  });

  const trendMap = new Map<string, { date: string; Positive: number; Neutral: number; Negative: number }>();
  for (const row of rows) {
    const date = row.created_at.slice(0, 10);
    const entry = trendMap.get(date) ?? { date, Positive: 0, Neutral: 0, Negative: 0 };
    const label = (row.sentiment ?? "Neutral") as SentimentLabel;
    if (label in entry) entry[label] += 1;
    trendMap.set(date, entry);
  }
  const trend = [...trendMap.values()].sort((a, b) => a.date.localeCompare(b.date)).slice(-30);

  const wordCounts = new Map<string, number>();
  for (const row of rows) {
    if ((row.sentiment ?? "") === "Positive") continue;
    const seen = new Set<string>();
    for (const raw of row.comment.toLowerCase().split(/[^a-z']+/)) {
      const word = raw.replace(/^'+|'+$/g, "");
      if (word.length < 4 || STOP_WORDS.has(word) || seen.has(word)) continue;
      seen.add(word);
      wordCounts.set(word, (wordCounts.get(word) ?? 0) + 1);
    }
  }
  const commonIssues = [...wordCounts.entries()]
    .map(([term, count]) => ({ term, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const avgRating = total
    ? Math.round((rows.reduce((sum, r) => sum + r.rating, 0) / total) * 10) / 10
    : 0;

  const recent = rows.slice(0, 12).map((row) => ({
    id: row.id,
    service: serviceName.get(row.service_id) ?? "Unknown",
    rating: row.rating,
    comment: row.comment,
    sentiment: (row.sentiment ?? "Neutral") as SentimentLabel,
    vader: row.vader_compound,
    createdAt: row.created_at,
  }));

  return {
    total,
    avgRating,
    counts,
    percentages: {
      Positive: pct(counts.Positive),
      Neutral: pct(counts.Neutral),
      Negative: pct(counts.Negative),
    },
    byService,
    trend,
    commonIssues,
    recent,
  };
}

export type DashboardData = ReturnType<typeof buildDashboard>;
