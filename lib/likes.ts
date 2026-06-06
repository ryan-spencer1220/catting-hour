import { supabase } from "./supabase";

export type LikeState = {
  count: number;
  likedByUser: boolean;
};

export async function fetchLikes(catId: string): Promise<LikeState> {
  const [{ count }, sessionResult] = await Promise.all([
    supabase.from("cat_likes").select("*", { count: "exact", head: true }).eq("cat_id", catId),
    supabase.auth.getSession(),
  ]);

  const userId = sessionResult.data.session?.user?.id;
  let likedByUser = false;

  if (userId) {
    const { count: userLikeCount } = await supabase
      .from("cat_likes")
      .select("*", { count: "exact", head: true })
      .eq("cat_id", catId)
      .eq("user_id", userId);
    likedByUser = (userLikeCount ?? 0) > 0;
  }

  return { count: count ?? 0, likedByUser };
}

export async function likeCat(catId: string): Promise<void> {
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user?.id;
  if (!userId) throw new Error("Not authenticated");
  const { error } = await supabase.from("cat_likes").insert({ cat_id: catId, user_id: userId });
  if (error) throw error;
}

export async function unlikeCat(catId: string): Promise<void> {
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user?.id;
  if (!userId) throw new Error("Not authenticated");
  const { error } = await supabase
    .from("cat_likes")
    .delete()
    .eq("cat_id", catId)
    .eq("user_id", userId);
  if (error) throw error;
}
