import { SentimentIntensityAnalyzer } from "vader-sentiment";

export type SentimentLabel = "Positive" | "Neutral" | "Negative";

export interface SentimentResult {
  sentiment: SentimentLabel;
  vaderCompound: number;
  modelLabel: string | null;
  modelConfidence: number | null;
}

const HF_MODEL = "cardiffnlp/twitter-roberta-base-sentiment-latest";

function labelFromCompound(compound: number): SentimentLabel {
  if (compound >= 0.05) return "Positive";
  if (compound <= -0.05) return "Negative";
  return "Neutral";
}

function normaliseHfLabel(raw: string): SentimentLabel | null {
  const value = raw.toLowerCase();
  if (value.includes("pos") || value === "label_2" || value === "5 stars" || value === "4 stars")
    return "Positive";
  if (value.includes("neg") || value === "label_0" || value === "1 star" || value === "2 stars")
    return "Negative";
  if (value.includes("neu") || value === "label_1" || value === "3 stars") return "Neutral";
  return null;
}

type HfScore = { label: string; score: number };

async function runHuggingFace(
  text: string,
): Promise<{ label: SentimentLabel; rawLabel: string; score: number } | null> {
  const token = process.env["HUGGINGFACE_ACCESS_TOKEN"];
  if (!token) return null;

  try {
    const response = await fetch(`https://api-inference.huggingface.co/models/${HF_MODEL}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ inputs: text, options: { wait_for_model: true } }),
    });

    if (!response.ok) {
      console.error("Hugging Face sentiment request failed", response.status);
      return null;
    }

    const payload = (await response.json()) as HfScore[] | HfScore[][];
    const scores: HfScore[] = Array.isArray(payload[0])
      ? (payload[0] as HfScore[])
      : (payload as HfScore[]);
    if (!scores?.length) return null;

    const best = scores.reduce((a, b) => (b.score > a.score ? b : a));
    const label = normaliseHfLabel(best.label);
    if (!label) return null;
    return { label, rawLabel: best.label, score: best.score };
  } catch (error) {
    console.error("Hugging Face sentiment error", error);
    return null;
  }
}

/**
 * Hybrid sentiment analysis: VADER (lexicon/rule based) combined with a
 * Hugging Face pre-trained transformer model. The transformer wins when
 * available; VADER is always computed and stored as a score.
 */
export async function analyseSentiment(text: string): Promise<SentimentResult> {
  const vader = SentimentIntensityAnalyzer.polarity_scores(text);
  const vaderLabel = labelFromCompound(vader.compound);
  const hf = await runHuggingFace(text);

  if (!hf) {
    return {
      sentiment: vaderLabel,
      vaderCompound: vader.compound,
      modelLabel: null,
      modelConfidence: null,
    };
  }

  return {
    sentiment: hf.label,
    vaderCompound: vader.compound,
    modelLabel: hf.rawLabel,
    modelConfidence: hf.score,
  };
}
