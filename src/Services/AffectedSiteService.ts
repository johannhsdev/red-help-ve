import { supabase } from "../lib/supabase"
import { validateAffectedSiteDraft, validateImageFile } from "../lib/registryValidation"
import {
  affectedSiteRowToRecord,
  draftToAffectedSiteInsert,
  type AffectedSiteRow,
} from "../lib/registryMapper"
import type { IAffectedSite, IAffectedSiteDraft } from "../Interfaces/IAffectedSite"

function fileExtension(file: File) {
  const fallback = file.type.split("/")[1] || "jpg"
  return file.name.split(".").pop()?.toLowerCase() || fallback
}

export async function AffectedSiteUploadPhoto(file: File): Promise<string> {
  validateImageFile(file)

  const path = `${crypto.randomUUID()}.${fileExtension(file)}`
  const { error } = await supabase.storage.from("affected-sites").upload(path, file, {
    cacheControl: "31536000",
    upsert: false,
  })

  if (error) throw new Error(`No se pudo subir la foto: ${error.message}`)

  const { data } = supabase.storage.from("affected-sites").getPublicUrl(path)
  return data.publicUrl
}

export async function AffectedSiteList(): Promise<IAffectedSite[]> {
  const { data, error } = await supabase
    .from("affected_sites")
    .select("*")
    .order("created_at", { ascending: false })

  if (error) throw new Error(error.message)
  return ((data ?? []) as AffectedSiteRow[]).map(affectedSiteRowToRecord) as IAffectedSite[]
}

export async function AffectedSiteCreate(
  draft: IAffectedSiteDraft,
  photoFile: File,
): Promise<IAffectedSite> {
  const cleanDraft = validateAffectedSiteDraft(draft)
  const photoUrl = await AffectedSiteUploadPhoto(photoFile)

  const { data, error } = await supabase
    .from("affected_sites")
    .insert(draftToAffectedSiteInsert(cleanDraft, photoUrl))
    .select("*")
    .single()

  if (error) throw new Error(error.message)
  return affectedSiteRowToRecord(data as AffectedSiteRow) as IAffectedSite
}
