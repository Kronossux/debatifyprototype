import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";

export const logUserIP = createServerFn({ method: "POST" })
  .inputValidator((d: { userId: string }) => ({ userId: String(d.userId) }))
  .handler(async ({ data }) => {
    // Extract IP from request headers
    const request = getRequest();
    let ipAddress = "unknown";
    
    if (request?.headers) {
      // Try various headers that might contain the client IP
      ipAddress =
        request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        request.headers.get("x-real-ip") ||
        request.headers.get("cf-connecting-ip") ||
        request.headers.get("x-client-ip") ||
        "unknown";
    }

    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      
      // Upsert: insert or update the last_seen timestamp for this user+IP combination
      const { error } = await supabaseAdmin
        .from("user_ip_log")
        .upsert(
          {
            user_id: data.userId,
            ip_address: ipAddress,
            last_seen: new Date().toISOString(),
          },
          {
            onConflict: "user_id,ip_address",
          }
        );

      if (error) {
        console.error("Failed to log user IP:", error);
        // Don't throw - this shouldn't break auth
      }
    } catch (err) {
      console.error("Error logging user IP:", err);
      // Silently fail - IP logging shouldn't break the auth flow
    }

    return { ok: true as const };
  });
