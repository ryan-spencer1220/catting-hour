import { supabase } from "./supabase";

export type Cat = {
  id: string;
  name: string;
  nameUnknown?: boolean;
  type?: string;
  temperament?: string;
  indoor?: boolean;
  notes?: string;
  lat?: number;
  lng?: number;
  image?: string | null;
  createdAt?: string | null;
  owner?: string | null;
  ownerName?: string | null;
  state?: string | null;
  country?: string | null;
};

function mapRow(row: any): Cat | null {
  if (!row) return null;
  return {
    id: String(row.id),
    name: row.name,
    type: row.type,
    temperament: row.temperament,
    indoor: !!row.indoor,
    notes: row.notes,
    lat: row.lat !== undefined ? Number(row.lat) : undefined,
    lng: row.lng !== undefined ? Number(row.lng) : undefined,
    image: row.image ?? null,
    createdAt: row.created_at ?? row.createdAt ?? null,
    owner: row.owner ?? null,
    ownerName: row.owner_name ?? null,
    nameUnknown: row.name_unknown ?? false,
    state: row.state ?? null,
    country: row.country ?? null,
  };
}

export async function fetchAllCats(): Promise<Cat[]> {
  const { data, error } = await supabase.from("cats").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []).map(mapRow).filter(Boolean) as Cat[];
}

export async function fetchFollowingCats(userId: string): Promise<Cat[]> {
  const { data: follows } = await supabase
    .from("follows")
    .select("following_id")
    .eq("follower_id", userId);
  const ids = (follows ?? []).map((r: any) => r.following_id as string);
  if (ids.length === 0) return [];
  const { data, error } = await supabase
    .from("cats")
    .select("*")
    .in("owner", ids)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []).map(mapRow).filter(Boolean) as Cat[];
}

export async function fetchCatById(id: string): Promise<Cat | null> {
  const { data, error } = await supabase.from("cats").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return mapRow(data);
}

export async function createCat(payload: Partial<Cat>): Promise<Cat> {
  let ownerId: string | null = null;
  let ownerName: string | null = null;
  try {
    const { data: userData } = await supabase.auth.getUser();
    const user = (userData as any)?.user;
    ownerId = user?.id ?? null;
    ownerName = user?.user_metadata?.username ?? null;
  } catch (e) {
    ownerId = null;
  }

  const insert = {
    name: payload.name ?? "Unnamed",
    type: payload.type ?? null,
    temperament: payload.temperament ?? null,
    indoor: payload.indoor ?? false,
    notes: payload.notes ?? null,
    lat: payload.lat ?? null,
    lng: payload.lng ?? null,
    image: payload.image ?? null,
    created_at: new Date().toISOString(),
    owner: ownerId,
    owner_name: ownerName,
    name_unknown: payload.nameUnknown ?? false,
    state: payload.state ?? null,
    country: payload.country ?? null,
  };

  const { data, error } = await supabase.from("cats").insert(insert).select().maybeSingle();
  if (error) throw error;
  return mapRow(data) as Cat;
}

export async function updateCat(id: string, changes: Partial<Cat>): Promise<Cat | null> {
  const payload: any = { ...changes };
  // map createdAt -> created_at if present
  if (payload.createdAt !== undefined) payload.created_at = payload.createdAt;
  delete payload.createdAt;

  const { data, error } = await supabase.from("cats").update(payload).eq("id", id).select().maybeSingle();
  if (error) throw error;
  return mapRow(data);
}

export async function deleteCat(id: string): Promise<void> {
  const { error, count } = await supabase
    .from("cats")
    .delete({ count: "exact" })
    .eq("id", id);
  if (error) throw error;
  if (count === 0) throw new Error("Could not delete — cat not found.");
}

export async function suggestCatName(catId: string, name: string): Promise<void> {
  const { error } = await supabase.rpc("suggest_cat_name", {
    cat_id: catId,
    suggested_name: name.trim(),
  });
  if (error) throw error;
}

// Upload a local image URI to the 'cat-images' storage bucket and return a public URL.
export async function uploadImage(uri: string): Promise<string> {
  if (!uri) throw new Error("No image uri provided");

  const extMatch = uri.split(".").pop()?.split("?")[0]?.toLowerCase();
  const ext = extMatch && extMatch.length <= 5 ? extMatch : "jpg";
  const contentType = ext === "png" ? "image/png" : ext === "gif" ? "image/gif" : "image/jpeg";
  const fileName = `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;

  // React Native's fetch+blob returns 0 bytes for local URIs.
  // Using FormData with the native blob descriptor reads the file correctly.
  const formData = new FormData();
  formData.append("file", { uri, name: fileName, type: contentType } as any);

  const { error } = await supabase.storage
    .from("cat-images")
    .upload(fileName, formData as any, { contentType, upsert: false });
  if (error) throw error;

  const { data } = supabase.storage.from("cat-images").getPublicUrl(fileName);
  return data.publicUrl;
}
