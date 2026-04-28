import { isStaff } from "@/lib/auth/staff";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { redirect } from "next/navigation";
import { AdminTabs } from "@/app/admin/components/AdminTabs";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const supabase = await createClient();
  if (!supabase) {
    redirect("/");
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isStaff(user)) {
    redirect("/");
  }

  const service = createServiceRoleClient();
  const sb = service ?? supabase;

  // Buscar dados iniciais
  const [videosRes, profilesRes, generationsRes] = await Promise.all([
    sb
      .from("videos")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .select("id, title, video_url, thumbnail_url, prompt, video_tags!inner(tags!inner(name))")
      .order("id", { ascending: false }),
    sb.from("profiles").select("*").order("created_at", { ascending: false }),
    sb
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from("generations" as any)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .select(`
        *,
        profiles!inner(email, display_name)
      `)
      .order("created_at", { ascending: false }),
  ]);

  const videos = videosRes.data || [];
  const profiles = profilesRes.data || [];
  const generations = generationsRes.data || [];

  return <AdminTabs initialVideos={videos} initialProfiles={profiles} initialGenerations={generations} />;
}
