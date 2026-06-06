import { supabase } from "./supabase";

export type Checkin = {
  id: string;
  catId: string;
  note: string;
  createdAt: string;
  authorName: string | null;
};

function mapRow(row: any): Checkin | null {
  if (!row) return null;
  return {
    id: String(row.id),
    catId: String(row.cat_id),
    note: row.note,
    createdAt: row.created_at,
    authorName: row.author_name ?? null,
  };
}

export async function fetchCheckins(catId: string): Promise<Checkin[]> {
  const { data, error } = await supabase
    .from("checkins")
    .select("*")
    .eq("cat_id", catId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []).map(mapRow).filter(Boolean) as Checkin[];
}

export async function addCheckin(catId: string, note: string): Promise<Checkin> {
  let authorId: string | null = null;
  let authorName: string | null = null;
  try {
    const { data } = await supabase.auth.getUser();
    const user = (data as any)?.user;
    authorId = user?.id ?? null;
    authorName = user?.user_metadata?.username ?? null;
  } catch {
    authorId = null;
  }
  const { data, error } = await supabase
    .from("checkins")
    .insert({ cat_id: catId, note: note.trim(), author: authorId, author_name: authorName })
    .select()
    .maybeSingle();
  if (error) throw error;
  return mapRow(data) as Checkin;
}

export async function deleteCheckin(id: string): Promise<void> {
  const { error } = await supabase.from("checkins").delete().eq("id", id);
  if (error) throw error;
}
