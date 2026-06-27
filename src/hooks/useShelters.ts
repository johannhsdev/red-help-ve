import { useCallback, useEffect, useState } from "react"
import type { Shelter, ShelterDraft, ShelterPerson, ShelterPersonDraft } from "../types/registry"
import {
  draftToShelterInsert,
  draftToShelterPersonRpc,
  shelterPersonRowToRecord,
  shelterRowToRecord,
  type ShelterPersonRow,
  type ShelterRow,
} from "../lib/registryMapper"
import { supabase } from "../lib/supabase"
import { validateShelterDraft, validateShelterPersonDraft } from "../lib/registryValidation"

function sortShelters(shelters: Shelter[]) {
  return [...shelters].sort((a, b) => a.city.localeCompare(b.city) || a.name.localeCompare(b.name))
}

function sortPeople(people: ShelterPerson[]) {
  return [...people].sort((a, b) => b.createdAt - a.createdAt)
}

export function useShelters() {
  const [shelters, setShelters] = useState<Shelter[]>([])
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState("")

  const loadShelters = useCallback(async () => {
    setLoaded(false)
    setError("")

    const [sheltersRequest, peopleRequest] = await Promise.all([
      supabase.from("shelters").select("*").order("city", { ascending: true }),
      supabase.from("shelter_people").select("*").order("created_at", { ascending: false }),
    ])

    const requestError = sheltersRequest.error || peopleRequest.error
    if (requestError) {
      setError(requestError.message)
      setShelters([])
      setLoaded(true)
      return
    }

    const people = (peopleRequest.data ?? []) as ShelterPersonRow[]
    const nextShelters = ((sheltersRequest.data ?? []) as ShelterRow[]).map((row) =>
      shelterRowToRecord(row, people),
    )

    setShelters(sortShelters(nextShelters))
    setLoaded(true)
  }, [])

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void loadShelters()
    }, 0)
    return () => window.clearTimeout(timeout)
  }, [loadShelters])

  const addShelter = useCallback(async (draft: ShelterDraft) => {
    const cleanDraft = validateShelterDraft(draft)
    const { data, error: insertError } = await supabase
      .from("shelters")
      .insert(draftToShelterInsert(cleanDraft))
      .select("*")
      .single()

    if (insertError) throw new Error(insertError.message)

    const next = shelterRowToRecord(data as ShelterRow, [])
    setShelters((current) => sortShelters([next, ...current]))
    return next
  }, [])

  const addPerson = useCallback(async (shelterId: number, draft: ShelterPersonDraft) => {
    const cleanDraft = validateShelterPersonDraft(draft)
    const { data, error: insertError } = await supabase.rpc(
      "add_shelter_person",
      draftToShelterPersonRpc(cleanDraft, shelterId),
    )

    if (insertError) throw new Error(insertError.message)

    const next = shelterPersonRowToRecord(data as ShelterPersonRow)
    setShelters((current) =>
      current.map((shelter) =>
        shelter.id === shelterId
          ? { ...shelter, people: sortPeople([next, ...shelter.people]) }
          : shelter,
      ),
    )
    return next
  }, [])

  const updatePersonVerification = useCallback(
    async (
      personId: number,
      verification: { verifiedInShelter?: boolean; foundByFamily?: boolean },
    ) => {
      const { data, error: updateError } = await supabase.rpc("update_shelter_person_verification", {
        p_person_id: personId,
        p_verified_in_shelter: verification.verifiedInShelter ?? null,
        p_found_by_family: verification.foundByFamily ?? null,
      })

      if (updateError) throw new Error(updateError.message)

      const next = shelterPersonRowToRecord(data as ShelterPersonRow)
      setShelters((current) =>
        current.map((shelter) =>
          shelter.id === next.shelterId
            ? {
                ...shelter,
                people: sortPeople(
                  shelter.people.map((person) => (person.id === next.id ? next : person)),
                ),
              }
            : shelter,
        ),
      )
      return next
    },
    [],
  )

  return { shelters, loaded, error, addShelter, addPerson, updatePersonVerification, refresh: loadShelters }
}

export type SheltersState = ReturnType<typeof useShelters>
