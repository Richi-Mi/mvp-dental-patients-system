"use client"

import * as React from "react"
import { FileHeart, Loader2, Pencil, Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { ClinicalHistoryForm } from "@/components/custom/clinical-history-form"
import { ResponsiveDialogContent } from "@/components/custom/responsive-dialog"
import { useClinicalHistory } from "@/hooks/useClinicalHistory"
import { clinicalQuestionsFor } from "@/lib/clinic-data"
import { cn } from "@/lib/utils"
import type { Patient } from "@/types/clinic"

/**
 * Historia clínica del paciente (botón "Historia Clínica"). Sin historial
 * muestra "Crear historia clínica"; con historial lo muestra en lectura con
 * "Editar". Crear y editar usan el mismo formulario dentro del diálogo.
 */
export function ClinicalHistoryDialog({ patient }: { patient: Patient }) {
  const [open, setOpen] = React.useState(false)
  const [editing, setEditing] = React.useState(false)
  const {
    clinicalHistory,
    isLoading,
    error,
    createClinicalHistory,
    isCreating,
    updateClinicalHistory,
    isUpdating,
  } = useClinicalHistory(patient.id)
  const questions = clinicalQuestionsFor(patient.gender)

  const title = !editing
    ? "Historia clínica"
    : clinicalHistory
      ? "Editar historia clínica"
      : "Crear historia clínica"

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        // Al abrir se muestra el historial, no el formulario.
        if (next) setEditing(false)
        setOpen(next)
      }}
    >
      <DialogTrigger
        render={
          <Button size="sm" variant="outline">
            <FileHeart data-icon="inline-start" />
            Historia Clínica
          </Button>
        }
      />
      <ResponsiveDialogContent className="flex max-h-[calc(100dvh-2rem)] flex-col sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {editing
              ? `${patient.name} · Todas las preguntas son opcionales.`
              : patient.name}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Cargando historia clínica...
          </div>
        ) : error ? (
          <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {error instanceof Error
              ? error.message
              : "No se pudo cargar la historia clínica."}
          </p>
        ) : editing ? (
          <ClinicalHistoryForm
            questions={questions}
            initialAnswers={clinicalHistory}
            submitLabel={clinicalHistory ? "Guardar cambios" : "Crear historia clínica"}
            isSaving={isCreating || isUpdating}
            onSubmit={async (answers) => {
              await (clinicalHistory
                ? updateClinicalHistory(answers)
                : createClinicalHistory(answers))
              setEditing(false)
            }}
            onCancel={() => setEditing(false)}
          />
        ) : clinicalHistory ? (
          <>
            <dl className="-mx-6 flex min-h-0 flex-col gap-4 overflow-y-auto px-6 max-sm:-mx-4 max-sm:px-4">
              {questions.map(({ key, label }, index) => (
                <div key={key}>
                  <dt className="text-xs text-muted-foreground">
                    {index + 1}. {label}
                  </dt>
                  <dd
                    className={cn(
                      "mt-0.5 text-sm whitespace-pre-wrap",
                      clinicalHistory[key]
                        ? "text-foreground"
                        : "text-muted-foreground italic",
                    )}
                  >
                    {clinicalHistory[key] || "Sin responder"}
                  </dd>
                </div>
              ))}
            </dl>
            <DialogFooter>
              <Button onClick={() => setEditing(true)}>
                <Pencil data-icon="inline-start" />
                Editar
              </Button>
            </DialogFooter>
          </>
        ) : (
          <Empty className="rounded-lg border border-dashed p-8">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <FileHeart />
              </EmptyMedia>
              <EmptyTitle>Sin historia clínica</EmptyTitle>
              <EmptyDescription>
                Este paciente todavía no tiene una historia clínica registrada.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button size="sm" onClick={() => setEditing(true)}>
                <Plus data-icon="inline-start" />
                Crear historia clínica
              </Button>
            </EmptyContent>
          </Empty>
        )}
      </ResponsiveDialogContent>
    </Dialog>
  )
}
