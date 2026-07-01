import { supabase } from "./supabase";
import { uploadImage } from "./cats";

export type CatPhoto = {
  id: string;
  catId: string;
  url: string;
  createdAt: string;
};

function mapRow(row: any): CatPhoto | null {
  if (!row) return null;
  return {
    id: String(row.id),
    catId: String(row.cat_id),
    url: row.url,
    createdAt: row.created_at,
  };
}

export async function fetchCatPhotos(catId: string): Promise<CatPhoto[]> {
  const { data, error } = await supabase
    .from("cat_photos")
    .select("*")
    .eq("cat_id", catId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data || []).map(mapRow).filter(Boolean) as CatPhoto[];
}

export async function addCatPhoto(catId: string, localUri: string): Promise<CatPhoto> {
  const url = await uploadImage(localUri);

  let uploadedBy: string | null = null;
  try {
    const { data } = await supabase.auth.getUser();
    uploadedBy = (data as any)?.user?.id ?? null;
  } catch {}

  const { data, error } = await supabase
    .from("cat_photos")
    .insert({ cat_id: catId, url, uploaded_by: uploadedBy })
    .select()
    .maybeSingle();
  if (error) throw error;

  // Keep cats.image in sync so map markers always show the latest photo
  await supabase.from("cats").update({ image: url }).eq("id", catId);

  return mapRow(data) as CatPhoto;
}

// Upload several local images at once and attach them to a cat. Used by the
// create flow so a new cat can start with multiple photos. The first photo
// becomes the primary cats.image shown on the map marker and in lists.
export async function addCatPhotos(catId: string, localUris: string[]): Promise<CatPhoto[]> {
  let uploadedBy: string | null = null;
  try {
    const { data } = await supabase.auth.getUser();
    uploadedBy = (data as any)?.user?.id ?? null;
  } catch {}

  const created: CatPhoto[] = [];
  for (const uri of localUris) {
    const url = await uploadImage(uri);
    const { data, error } = await supabase
      .from("cat_photos")
      .insert({ cat_id: catId, url, uploaded_by: uploadedBy })
      .select()
      .maybeSingle();
    if (error) throw error;
    const photo = mapRow(data);
    if (photo) created.push(photo);
  }

  if (created[0]) {
    await supabase.from("cats").update({ image: created[0].url }).eq("id", catId);
  }
  return created;
}

export async function deleteCatPhoto(id: string): Promise<void> {
  const { error } = await supabase.from("cat_photos").delete().eq("id", id);
  if (error) throw error;
}
