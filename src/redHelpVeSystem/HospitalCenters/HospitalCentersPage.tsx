import { useHospitalCenters } from "../../hooks/useHospitalCenters"
import { HospitalCenterList } from "./components/HospitalCenterList"
import { HospitalCenterForm } from "./components/HospitalCenterForm"

export function HospitalCentersPage() {
  const { centers, loaded, error, addCenter, addPatient, updatePatientVerification } = useHospitalCenters()

  return (
    <HospitalCenterList
      centers={centers}
      loaded={loaded}
      error={error}
      onAddCenter={addCenter}
      onAddPatient={addPatient}
      onUpdatePatientVerification={updatePatientVerification}
      renderForm={() => <HospitalCenterForm onAdd={addCenter} />}
    />
  )
}
