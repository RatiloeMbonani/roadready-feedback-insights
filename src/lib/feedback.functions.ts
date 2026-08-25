import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const submitSchema = z.object({
  serviceSlug: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().min(3).max(2000),
});

export const listServices = createServerFn({ method: "GET" }).handler(async () => {
  const { getPublicClient } = await import("./supabase-public.server");
  const { data, error } = await getPublicClient()
    .from("service_types")
    .select("id, slug, name, description")
    .order("name");
  if (error) throw new Error(error.message);
  return data ?? [];
});

export const submitFeedback = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => submitSchema.parse(input))
  .handler(async ({ data }) => {
    const { getPublicClient } = await import("./supabase-public.server");
    const { analyseSentiment } = await import("./sentiment.server");
    const supabase = getPublicClient();

    const { data: service, error: serviceError } = await supabase
      .from("service_types")
      .select("id, name")
      .eq("slug", data.serviceSlug)
      .maybeSingle();
    if (serviceError) throw new Error(serviceError.message);
    if (!service) throw new Error("Unknown service");

    const result = await analyseSentiment(data.comment);

    const { error } = await supabase.from("feedback").insert({
      service_id: service.id,
      rating: data.rating,
      comment: data.comment,
      sentiment: result.sentiment,
      vader_compound: result.vaderCompound,
      model_label: result.modelLabel,
      model_confidence: result.modelConfidence,
    });
    if (error) throw new Error(error.message);

    return {
      service: service.name,
      sentiment: result.sentiment,
      vaderCompound: result.vaderCompound,
      modelLabel: result.modelLabel,
      modelConfidence: result.modelConfidence,
    };
  });

export const getMyAccess = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    return { isAdmin: Boolean(data) };
  });

/** Bootstrap: the first signed-in user to ask becomes the administrator. */
export const claimAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { count, error: countError } = await supabaseAdmin
      .from("user_roles")
      .select("id", { count: "exact", head: true })
      .eq("role", "admin");
    if (countError) throw new Error(countError.message);
    if ((count ?? 0) > 0) return { granted: false, reason: "An administrator already exists." };

    const { error } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: context.userId, role: "admin" });
    if (error) throw new Error(error.message);
    return { granted: true, reason: null };
  });

export const getDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden: administrator access required.");

    const [{ data: rows, error }, { data: services, error: servicesError }] = await Promise.all([
      context.supabase
        .from("feedback")
        .select("id, service_id, rating, comment, sentiment, vader_compound, created_at")
        .order("created_at", { ascending: false })
        .limit(2000),
      context.supabase.from("service_types").select("id, name"),
    ]);
    if (error) throw new Error(error.message);
    if (servicesError) throw new Error(servicesError.message);

    const { buildDashboard } = await import("./dashboard-stats");
    return buildDashboard(rows ?? [], services ?? []);
  });
