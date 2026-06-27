import { Plus } from "lucide-react"
import { Button } from "../components/ui/Button"
import { useMissingPerson } from "../hooks/useMissingPerson"
import { MissingPersonList } from "./components/MissingPersonList"
import { MissingPersonForm } from "./components/MissingPersonForm"
import { FoundDialog } from "./components/FoundDialog"

export function MissingPersonsPage() {
  const {
    persons,
    centers,
    loading,
    registerOpen,
    foundDialogPerson,
    handleNew,
    handleCloseRegister,
    handleSave,
    handleReportFound,
    handleCloseFound,
    handleConfirmFound,
    handleReopen,
  } = useMissingPerson()

  const registerBtn = (
    <Button
      variant="primary"
      size="md"
      className="h-8 min-h-8 gap-2 rounded-full bg-[#f4f4f5] px-3.5 py-1.5 text-sm font-medium text-[#18181b] hover:bg-white"
      onClick={handleNew}
    >
      <Plus className="size-4" />
      Registrar persona
    </Button>
  )

  return (
    <div className="flex flex-col gap-6">
      <MissingPersonList
        persons={persons}
        loading={loading}
        onReportFound={handleReportFound}
        onReopen={handleReopen}
        headerAction={registerBtn}
      />

      <MissingPersonForm open={registerOpen} onClose={handleCloseRegister} onSave={handleSave} />

      <FoundDialog
        person={foundDialogPerson}
        centers={centers}
        onConfirm={handleConfirmFound}
        onClose={handleCloseFound}
      />
    </div>
  )
}
