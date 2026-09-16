"use client"

import * as React from "react"

import { Button } from "@/components/ui/button"
import { DialogFooter } from "@/components/ui/dialog"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Textarea } from "@/components/ui/textarea"
import type { ClinicalQuestion } from "@/lib/clinic-data"
import type { ClinicalHistory } from "@/types/clinic"

type ClinicalHistoryFormProps = {
  /** Preguntas a mostrar (ver `clinicalQuestionsFor`). */
  questions: readonly ClinicalQuestion[]
  /** Respuestas guardadas al editar; `null` al crear. */
  initialAnswers: ClinicalHistory | null
  submitLabel: string
  isSaving: boolean
  /** Recibe solo las preguntas mostradas; `""` = sin responder. */
  onSubmit: (answers: Partial<ClinicalHistory>) => Promise<unknown>
  onCancel: () => void
}

/**
 * Cuestionario del historial clínico, el mismo para crear y para editar. Todas
 * las preguntas son opcionales: se puede guardar con respuestas en blanco.
 */
export function ClinicalHistoryForm({
  questions,
  initialAnswers,
  submitLabel,
  isSaving,
  onSubmit,
  onCancel,
}: ClinicalHistoryFormProps) {
  const [answers, setAnswers] = React.useState<Partial<ClinicalHistory>>(() =>
    Object.fromEntries(
      questions.map(({ key }) => [key, initialAnswers?.[key] ?? ""]),
    ),
  )
  const [error, setError] = React.useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (isSaving) return
    setError(null)
    try {
      await onSubmit(answers)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo guardar el historial clínico.",
      )
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex min-h-0 flex-col gap-4">
      <FieldGroup className="-mx-6 min-h-0 gap-5 overflow-y-auto px-6 py-1 max-sm:-mx-4 max-sm:w-auto max-sm:px-4">
        {questions.map(({ key, label }, index) => (
          <Field key={key}>
            <FieldLabel htmlFor={`ch-${key}`}>
              {index + 1}. {label}
            </FieldLabel>
            <Textarea
              id={`ch-${key}`}
              className="min-h-9"
              placeholder="Sin responder"
              value={answers[key] ?? ""}
              onChange={(e) =>
                setAnswers((prev) => ({ ...prev, [key]: e.target.value }))
              }
            />
          </Field>
        ))}
      </FieldGroup>

      {error && (
        <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </p>
      )}

      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSaving}
        >
          Cancelar
        </Button>
        <Button type="submit" disabled={isSaving}>
          {isSaving ? "Guardando..." : submitLabel}
        </Button>
      </DialogFooter>
    </form>
  )
}
