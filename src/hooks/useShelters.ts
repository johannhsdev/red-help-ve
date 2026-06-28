import { useCallback, useEffect, useState } from "react"
import type { IShelter, IShelterDraft, IShelterPerson, IShelterPersonDraft } from "../Interfaces/IShelter"
import {
  ShelterList,
  ShelterCreate,
  ShelterPersonAdd,
  ShelterPersonUpdateVerification,
} from "../Services/ShelterService"

function sortShelters(shelters: IShelter[]) {
  return [...shelters].sort((a, b) => a.city.localeCompare(b.city) || a.name.localeCompare(b.name))
}

function sortPeople(people: IShelterPerson[]) {
  return [...people].sort((a, b) => b.createdAt - a.createdAt)
}

export function useShelters() {
  const [shelters, setShelters] = useState<IShelter[]>([])
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState("")

  const loadShelters = useCallback(async () => {
    setLoaded(false)
    setError("")
    try {
      const data = await ShelterList()
      setShelters(sortShelters(data))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar refugios.")
      setShelters([])
    } finally {
      setLoaded(true)
    }
  }, [])

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void loadShelters()
    }, 0)
    return () => window.clearTimeout(timeout)
  }, [loadShelters])

  const addShelter = useCallback(async (draft: IShelterDraft) => {
    const next = await ShelterCreate(draft)
    setShelters((current) => sortShelters([next, ...current]))
    return next
  }, [])

  const addPerson = useCallback(async (shelterId: number, draft: IShelterPersonDraft) => {
    const next = await ShelterPersonAdd(shelterId, draft)
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
      const next = await ShelterPersonUpdateVerification(personId, verification)
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
