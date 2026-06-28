import { useShelters } from "../../hooks/useShelters"
import { ShelterList } from "./components/ShelterList"

export function SheltersPage() {
  const { shelters, loaded, error, addShelter, addPerson, updatePersonVerification } = useShelters()

  return (
    <ShelterList
      shelters={shelters}
      loaded={loaded}
      error={error}
      onAdd={addShelter}
      onAddPerson={addPerson}
      onUpdateVerification={updatePersonVerification}
    />
  )
}
