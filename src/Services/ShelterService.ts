import { supabase } from "../lib/supabase"
import { validateShelterDraft, validateShelterPersonDraft } from "../lib/registryValidation"
import {
  draftToShelterInsert,
  draftToShelterPersonRpc,
  shelterPersonRowToRecord,
  shelterRowToRecord,
  type ShelterPersonRow,
  type ShelterRow,
} from "../lib/registryMapper"
import type { IShelter, IShelterDraft, IShelterPerson, IShelterPersonDraft } from "../Interfaces/IShelter"

export async function ShelterList(): Promise<IShelter[]> {
  const [sheltersRequest, peopleRequest] = await Promise.all([
    supabase.from("shelters").select("*").order("city", { ascending: true }),
    supabase.from("shelter_people").select("*").order("created_at", { ascending: false }),
  ])

  if (sheltersRequest.error) throw new Error(sheltersRequest.error.message)
  if (peopleRequest.error) throw new Error(peopleRequest.error.message)

  const people = (peopleRequest.data ?? []) as ShelterPersonRow[]
  return ((sheltersRequest.data ?? []) as ShelterRow[]).map((row) =>
    shelterRowToRecord(row, people),
  ) as IShelter[]
}

export async function ShelterCreate(draft: IShelterDraft): Promise<IShelter> {
  const cleanDraft = validateShelterDraft(draft)
  const { data, error } = await supabase
    .from("shelters")
    .insert(draftToShelterInsert(cleanDraft))
    .select("*")
    .single()

  if (error) throw new Error(error.message)
  return shelterRowToRecord(data as ShelterRow, []) as IShelter
}

export async function ShelterPersonAdd(
  shelterId: number,
  draft: IShelterPersonDraft,
): Promise<IShelterPerson> {
  const cleanDraft = validateShelterPersonDraft(draft)
  const { data, error } = await supabase.rpc(
    "add_shelter_person",
    draftToShelterPersonRpc(cleanDraft, shelterId),
  )

  if (error) throw new Error(error.message)
  return shelterPersonRowToRecord(data as ShelterPersonRow) as IShelterPerson
}

export async function ShelterPersonUpdateVerification(
  personId: number,
  patch: { verifiedInShelter?: boolean; foundByFamily?: boolean },
): Promise<IShelterPerson> {
  const { data, error } = await supabase.rpc("update_shelter_person_verification", {
    p_person_id: personId,
    p_verified_in_shelter: patch.verifiedInShelter ?? null,
    p_found_by_family: patch.foundByFamily ?? null,
  })

  if (error) throw new Error(error.message)
  return shelterPersonRowToRecord(data as ShelterPersonRow) as IShelterPerson
}
