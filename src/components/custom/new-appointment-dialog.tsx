"use client"

import * as React from "react"
import { useLocation, useNavigate, useSearchParams } from "react-router"
import { Plus, UserPlus } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { DatePicker } from "@/components/custom/calendar"
import { TimePicker } from "@/components/custom/time-picker"
import { useAgenda } from "@/hooks/useAgenda"
import { usePatients } from "@/hooks/usePatients"
import { STATUS_META, isClosedDay, weekdayName } from "@/lib/clinic-data"
import { useUiStore } from "@/store/ui.store"
import type { AppointmentStatus } from "@/types/clinic"

const fieldControl =
    "flex h-9 w-full cursor-pointer rounded-lg border border-input bg-transparent px-3 text-sm shadow-xs outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"

/** `?cita=nueva` abre el diálogo; `?paciente=<id>` preselecciona al paciente. */
const NEW_APPOINTMENT_SEARCH = "cita=nueva"

export function NewAppointmentDialog() {
    const [searchParams, setSearchParams] = useSearchParams()
    const navigate = useNavigate()
    const location = useLocation()

    const { patients } = usePatients()
    const {
        createAppointment,
        isCreating,
        createError,
        isAsistente,
        medicos,
        medicoEmail,
        medicoActivo,
        setMedico,
    } = useAgenda()

    const draft = useUiStore((s) => s.appointmentDraft)
    const setDraft = useUiStore((s) => s.setAppointmentDraft)
    const resetDraft = useUiStore((s) => s.resetAppointmentDraft)

    // El diálogo se controla por URL para poder volver a él después de crear
    // un paciente en otra ruta.
    const open = searchParams.get("cita") === "nueva"
    const patientFromUrl = searchParams.get("paciente")

    // Al volver de "Nuevo paciente" el id llega por la URL: se adopta una sola
    // vez y se limpia el parámetro.
    React.useEffect(() => {
        if (!patientFromUrl) return
        setDraft({ patientId: patientFromUrl })
        setSearchParams(
            (prev) => {
                const next = new URLSearchParams(prev)
                next.delete("paciente")
                return next
            },
            { replace: true },
        )
    }, [patientFromUrl, setDraft, setSearchParams])

    function setOpen(next: boolean) {
        setSearchParams(
            (prev) => {
                const params = new URLSearchParams(prev)
                if (next) params.set("cita", "nueva")
                else {
                    params.delete("cita")
                    params.delete("paciente")
                }
                return params
            },
            { replace: true },
        )
    }

    const closedDay = isClosedDay(draft.date)
    // Un asistente agenda a nombre del médico elegido: sin médico no hay a
    // dónde mandar el POST.
    const canSubmit =
        Boolean(draft.patientId) &&
        Boolean(draft.date) &&
        !closedDay &&
        (!isAsistente || Boolean(medicoEmail))

    function goToNewPatient() {
        // Vuelve a este mismo diálogo; el borrador queda en el store.
        const backTo = `${location.pathname}?${NEW_APPOINTMENT_SEARCH}`
        navigate(`/pacientes/nuevo?redirectTo=${encodeURIComponent(backTo)}`)
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        if (!canSubmit || isCreating) return

        await createAppointment({
            patientId: Number(draft.patientId),
            date: draft.date,
            time: draft.time,
            status: draft.status,
            motivo: draft.motivo.trim() || "Consulta general",
        })

        resetDraft()
        setOpen(false)
    }

    return (
        <>
            <Button size="sm" onClick={() => setOpen(true)}>
                <Plus data-icon="inline-start" />
                Nueva Cita
            </Button>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="sm:max-w-md">
                    <form onSubmit={handleSubmit}>
                        <DialogHeader>
                            <DialogTitle>Nueva cita</DialogTitle>
                            <DialogDescription>
                                {isAsistente && medicoActivo
                                    ? `Programa una cita en la agenda de ${medicoActivo.nombre}.`
                                    : "Programa una cita para un paciente registrado."}
                            </DialogDescription>
                        </DialogHeader>

                        <FieldGroup className="py-4">
                            {isAsistente && (
                                <Field>
                                    <FieldLabel htmlFor="na-medico">Médico</FieldLabel>
                                    <select
                                        id="na-medico"
                                        className={fieldControl}
                                        value={medicoEmail ?? ""}
                                        onChange={(e) => setMedico(e.target.value)}
                                        required
                                    >
                                        <option value="" disabled>
                                            Selecciona un médico
                                        </option>
                                        {medicos.map((medico) => (
                                            <option key={medico.correo} value={medico.correo}>
                                                {medico.nombre}
                                            </option>
                                        ))}
                                    </select>
                                    <p className="text-xs text-muted-foreground">
                                        La cita queda a su nombre y los pacientes que
                                        aparecen abajo son los suyos.
                                    </p>
                                </Field>
                            )}

                            <Field>
                                <FieldLabel htmlFor="na-patient">Paciente</FieldLabel>
                                <div className="flex items-center gap-2">
                                    <select
                                        id="na-patient"
                                        className={fieldControl}
                                        value={draft.patientId}
                                        onChange={(e) => setDraft({ patientId: e.target.value })}
                                        required
                                    >
                                        <option value="" disabled>
                                            Selecciona un paciente
                                        </option>
                                        {patients.map((p) => (
                                            <option key={p.id} value={p.id}>
                                                {p.name}
                                            </option>
                                        ))}
                                    </select>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="shrink-0"
                                        onClick={goToNewPatient}
                                    >
                                        <UserPlus data-icon="inline-start" />
                                        Nuevo paciente
                                    </Button>
                                </div>
                            </Field>

                            <div className="grid grid-cols-[1fr_auto] gap-4">
                                <Field>
                                    <FieldLabel htmlFor="na-date">Fecha</FieldLabel>
                                    <DatePicker
                                        id="na-date"
                                        value={draft.date}
                                        onChange={(date) => setDraft({ date })}
                                        aria-invalid={closedDay}
                                        aria-describedby={closedDay ? "na-date-error" : undefined}
                                    />
                                </Field>
                                <Field>
                                    <FieldLabel htmlFor="na-time">Hora</FieldLabel>
                                    <TimePicker
                                        id="na-time"
                                        value={draft.time}
                                        onChange={(time) => setDraft({ time })}
                                    />
                                </Field>
                            </div>

                            {closedDay && (
                                <p
                                    id="na-date-error"
                                    role="alert"
                                    className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700"
                                >
                                    El consultorio no atiende los {weekdayName(draft.date)}s.
                                    Elige otro día.
                                </p>
                            )}

                            <Field>
                                <FieldLabel htmlFor="na-status">Estatus</FieldLabel>
                                <select
                                    id="na-status"
                                    className={fieldControl}
                                    value={draft.status}
                                    onChange={(e) =>
                                        setDraft({ status: e.target.value as AppointmentStatus })
                                    }
                                >
                                    {Object.entries(STATUS_META).map(([value, meta]) => (
                                        <option key={value} value={value}>
                                            {meta.label}
                                        </option>
                                    ))}
                                </select>
                            </Field>

                            <Field>
                                <FieldLabel htmlFor="na-motivo">Motivo</FieldLabel>
                                <Input
                                    id="na-motivo"
                                    placeholder="Ej. Limpieza dental"
                                    value={draft.motivo}
                                    onChange={(e) => setDraft({ motivo: e.target.value })}
                                />
                            </Field>

                            {createError && (
                                <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">
                                    {createError instanceof Error
                                        ? createError.message
                                        : "No se pudo crear la cita."}
                                </p>
                            )}
                        </FieldGroup>

                        <DialogFooter>
                            <DialogClose
                                render={
                                    <Button type="button" variant="outline">
                                        Cancelar
                                    </Button>
                                }
                            />
                            <Button type="submit" disabled={!canSubmit || isCreating}>
                                {isCreating ? "Guardando..." : "Guardar cita"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    )
}
