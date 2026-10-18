import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/**
 * Exclui a conta do usuário autenticado.
 * A identidade vem do JWT (nunca do corpo). A remoção em auth.users dispara
 * as chaves estrangeiras em cascata: perfil, jogadores, configurações e
 * histórico daquele usuário são apagados junto.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "missing_authorization" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !anonKey || !serviceKey) {
      console.error("delete-account: missing platform configuration");
      return json({ error: "server_not_configured" }, 500);
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userError } =
      await userClient.auth.getUser();

    if (userError || !userData.user) {
      console.error("delete-account: unauthorized", userError?.message);
      return json({ error: "unauthorized" }, 401);
    }

    const admin = createClient(supabaseUrl, serviceKey);
    const { error: deleteError } = await admin.auth.admin.deleteUser(
      userData.user.id,
    );

    if (deleteError) {
      console.error(
        "delete-account: deleteUser failed",
        deleteError.message,
      );
      return json({ error: "delete_failed" }, 500);
    }

    return json({ ok: true });
  } catch (error) {
    console.error("delete-account: unexpected error", error);
    return json({ error: "unexpected" }, 500);
  }
});
