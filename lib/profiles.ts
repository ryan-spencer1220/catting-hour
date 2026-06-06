import { supabase } from "./supabase";

export type Profile = {
  id: string;
  username: string | null;
  avatarUrl: string | null;
  city: string | null;
  createdAt: string | null;
};

export type FollowCounts = {
  followers: number;
  following: number;
};

function mapRow(row: any): Profile {
  return {
    id: row.id,
    username: row.username ?? null,
    avatarUrl: row.avatar_url ?? null,
    city: row.city ?? null,
    createdAt: row.created_at ?? null,
  };
}

export async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw error;
  return data ? mapRow(data) : null;
}

export async function followUser(targetId: string): Promise<void> {
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user?.id;
  if (!userId) throw new Error("Not authenticated");
  const { error } = await supabase
    .from("follows")
    .insert({ follower_id: userId, following_id: targetId });
  if (error) throw error;
}

export async function unfollowUser(targetId: string): Promise<void> {
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user?.id;
  if (!userId) throw new Error("Not authenticated");
  const { error } = await supabase
    .from("follows")
    .delete()
    .eq("follower_id", userId)
    .eq("following_id", targetId);
  if (error) throw error;
}

export async function isFollowing(targetId: string): Promise<boolean> {
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user?.id;
  if (!userId) return false;
  const { count } = await supabase
    .from("follows")
    .select("*", { count: "exact", head: true })
    .eq("follower_id", userId)
    .eq("following_id", targetId);
  return (count ?? 0) > 0;
}

export async function fetchFollowCounts(userId: string): Promise<FollowCounts> {
  const [{ count: followers }, { count: following }] = await Promise.all([
    supabase.from("follows").select("*", { count: "exact", head: true }).eq("following_id", userId),
    supabase.from("follows").select("*", { count: "exact", head: true }).eq("follower_id", userId),
  ]);
  return { followers: followers ?? 0, following: following ?? 0 };
}

export async function fetchFollowingIds(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from("follows")
    .select("following_id")
    .eq("follower_id", userId);
  if (error) throw error;
  return (data ?? []).map((r) => r.following_id);
}

export async function syncProfile(
  updates: Partial<Pick<Profile, "username" | "avatarUrl" | "city">>
): Promise<void> {
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user?.id;
  if (!userId) return;
  const payload: any = {};
  if (updates.username !== undefined) payload.username = updates.username;
  if (updates.avatarUrl !== undefined) payload.avatar_url = updates.avatarUrl;
  if (updates.city !== undefined) payload.city = updates.city;
  const { error } = await supabase.from("profiles").update(payload).eq("id", userId);
  if (error) throw error;
}
