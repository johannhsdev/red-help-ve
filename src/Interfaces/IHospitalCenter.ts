export interface IHospitalPatient {
  id: number
  hospitalCenterId: number
  nationalId?: string
  name: string
  age?: number
  notes?: string
  verifiedInHospital: boolean
  foundByFamily: boolean
  verifiedAt?: number
  familyFoundAt?: number
  createdAt: number
}

export interface IHospitalCenter {
  id: number
  name: string
  city: string
  state?: string
  address: string
  contactPhone?: string
  notes?: string
  status: "active" | "closed"
  patients: IHospitalPatient[]
  createdAt: number
}

export type IHospitalCenterDraft = Omit<IHospitalCenter, "id" | "patients" | "createdAt" | "status">

export type IHospitalPatientDraft = Omit<
  IHospitalPatient,
  | "id"
  | "hospitalCenterId"
  | "verifiedInHospital"
  | "foundByFamily"
  | "verifiedAt"
  | "familyFoundAt"
  | "createdAt"
>
