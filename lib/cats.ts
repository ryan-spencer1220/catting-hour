import { supabase } from "./supabase";

export type Cat = {
  id: string;
  name: string;
  type?: string;
  temperament?: string;
  indoor?: boolean;
  notes?: string;
  lat?: number;
  lng?: number;
  image?: string | null;
  createdAt?: string | null;
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
  };
}

export async function fetchAllCats(): Promise<Cat[]> {
  const { data, error } = await supabase.from("cats").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []).map(mapRow).filter(Boolean) as Cat[];
}

export async function fetchCatById(id: string): Promise<Cat | null> {
  const { data, error } = await supabase.from("cats").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return mapRow(data);
}

export async function createCat(payload: Partial<Cat>): Promise<Cat> {
  // try to include the current authenticated user as the owner when available
  let ownerId: string | null = null;
  try {
    const { data: userData } = await supabase.auth.getUser();
    ownerId = (userData as any)?.user?.id ?? null;
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
  const { error } = await supabase.from("cats").delete().eq("id", id);
  if (error) throw error;
}

// Upload an image URI (local file or remote) to the 'cat-images' storage bucket and return a public URL.
export async function uploadImage(uri: string): Promise<string> {
  if (!uri) throw new Error("No image uri provided");

  // fetch the file data from the given URI
  const response = await fetch(uri);
  const blob = await response.blob();

  // derive an extension from the URI if possible
  const extMatch = uri.split(".").pop()?.split("?")[0];
  const ext = extMatch && extMatch.length <= 5 ? extMatch : "jpg";

  const fileName = `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
  const bucket = "cat-images";
  const path = fileName;

  // upload the blob to Supabase Storage
  const { data, error } = await supabase.storage.from(bucket).upload(path, blob as any, {
    // contentType may be empty on some platforms; supply blob.type when available
    contentType: (blob as any).type || undefined,
    upsert: false,
  });
  if (error) throw error;

  // get public URL for the uploaded file (bucket must be public)
  const { data: publicData } = supabase.storage.from(bucket).getPublicUrl(path);
  return publicData.publicUrl;
}
