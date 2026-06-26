import { useCallback, useEffect, useState } from "react"
import type { AffectedSite, AffectedSiteDraft } from "../types/registry"
import {
  affectedSiteRowToRecord,
  draftToAffectedSiteInsert,
  type AffectedSiteRow,
} from "../lib/registryMapper"
import { supabase } from "../lib/supabase"
import { validateAffectedSiteDraft, validateImageFile } from "../lib/registryValidation"

function fileExtension(file: File) {
  const fallback = file.type.split("/")[1] || "jpg"
  return file.name.split(".").pop()?.toLowerCase() || fallback
}

async function uploadSitePhoto(file: File) {
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

export function useAffectedSites() {
  const [sites, setSites] = useState<AffectedSite[]>([])
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState("")

  const loadSites = useCallback(async () => {
    setLoaded(false)
    setError("")

    const { data, error: requestError } = await supabase
      .from("affected_sites")
      .select("*")
      .order("created_at", { ascending: false })

    if (requestError) {
      setError(requestError.message)
      setSites([])
      setLoaded(true)
      return
    }

    setSites(((data ?? []) as AffectedSiteRow[]).map(affectedSiteRowToRecord))
    setLoaded(true)
  }, [])

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void loadSites()
    }, 0)
    return () => window.clearTimeout(timeout)
  }, [loadSites])

  const addSite = useCallback(async (draft: AffectedSiteDraft, photoFile: File) => {
    const cleanDraft = validateAffectedSiteDraft(draft)
    const photoUrl = await uploadSitePhoto(photoFile)

    const { data, error: insertError } = await supabase
      .from("affected_sites")
      .insert(draftToAffectedSiteInsert(cleanDraft, photoUrl))
      .select("*")
      .single()

    if (insertError) throw new Error(insertError.message)

    const next = affectedSiteRowToRecord(data as AffectedSiteRow)
    setSites((current) => [next, ...current])
    return next
  }, [])

  return { sites, loaded, error, addSite, refresh: loadSites }
}

export type AffectedSitesState = ReturnType<typeof useAffectedSites>
