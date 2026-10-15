"use client"

import * as React from "react"
import { useLocation, useNavigate, useSearchParams } from "react-router"
import { Loader2, Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogClose,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { DatePicker } from "@/components/custom/calendar"
import { PatientPickerDialog } from "@/components/custom/patient-picker-dialog"
import { ResponsiveDialogContent } from "@/components/custom/responsive-dialog"
import { MINUTE_STEP, TimePicker } from "@/components/custom/time-picker"
import { useAgenda } from "@/hooks/useAgenda"
import { useWorkingHours } from "@/hooks/useAjustes"
import { useNewAppointmentDialog } from "@/hooks/useNewAppointmentDialog"
import { usePatients } from "@/hooks/usePatients"
import {
    STATUS_META,
    appointmentTimeBounds,
    formatDuration,
    inactiveDayMessage,
    isClosedDay,
    minutesToTime,
    shiftEndTime,
    timeToMinutes,
    weekdayName,
} from "@/lib/clinic-data"
import { MOBILE_FAB } from "@/lib/responsive"
import { useUiStore, type AppointmentDraft } from "@/store/ui.store"
import type { Appointment, AppointmentStatus } from "@/types/clinic"

const fieldControl =
    "flex h-9 w-full min-w-0 cursor-pointer rounded-lg border border-input bg-transparent px-3 text-sm shadow-xs outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 max-sm:text-base"

/** Una cita ya guardada, como borrador del formulario. */
function draftFromAppointment(appointment: Appointment): AppointmentDraft {
    return {
        patientId: String(appointment.patientId),
        date: appointment.date,
        time: appointment.time,
        endTime: appointment.endTime,
        status: appointment.status,
        motivo: appointment.motivo,
    }
}

/**
 * Diálogo de cita, en sus dos modos (ver `useNewAppointmentDialog`):
 *
 * - `?cita=nueva`: alta. El borrador vive en `ui.store` para que el rodeo a
 *   `/pacientes/nuevo` no lo borre, y `?paciente=<id>` preselecciona al
 *   paciente que se acaba de crear.
 * - `?cita=<id>`: edición de esa cita (el botón "Editar" de la agenda). Aquí
 *   el formulario es estado local, cargado de la cita: así una edición no pisa
 *   el borrador del alta, que sigue esperando en el store.
 */
export function NewAppointmentDialog() {
    const [searchParams, setSearchParams] = useSearchParams()
    const { open, editingId, setOpen } = useNewAppointmentDialog()
    const navigate = useNavigate()
    const location = useLocation()

    const { patients, isLoading: patientsLoading } = usePatients()
    const {
        appointments,
        isLoading,
        findTimeConflict,
        isDayInactive,
        createAppointment,
        isCreating,
        createError,
        updateAppointment,
        isUpdating,
        updateError,
        isAsistente,
        medicos,
        medicoEmail,
        medicoActivo,
        setMedico,
    } = useAgenda()

    const hours = useWorkingHours()
    // Los selectores de hora siguen el horario del usuario (Ajustes).
    const { firstStart, lastStart, lastEnd } = appointmentTimeBounds(hours, MINUTE_STEP)

    const storedDraft = useUiStore((s) => s.appointmentDraft)
    // Un alta cuya hora quedó fuera del horario del usuario (el borrador nace a
    // las 10:00, o el horario cambió en Ajustes) empieza a la hora de apertura.
    // La cita que se edita conserva la suya aunque esté fuera.
    const draft =
        storedDraft.time < firstStart || storedDraft.time > lastStart
            ? {
                  ...storedDraft,
                  time: firstStart,
                  endTime: shiftEndTime(
                      storedDraft.time,
                      storedDraft.endTime,
                      firstStart,
                      hours,
                  ),
              }
            : storedDraft
    const setDraft = useUiStore((s) => s.setAppointmentDraft)
    const resetDraft = useUiStore((s) => s.resetAppointmentDraft)

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

    // La cita que se edita sale de la agenda ya cargada. Su formulario se
    // llena al abrirlo (o en cuanto la cita aparece, si la agenda todavía se
    // estaba cargando) y se descarta al cerrar el diálogo.
    const editing = editingId
        ? appointments.find((a) => a.id === editingId)
        : undefined

    const [edit, setEdit] = React.useState<{
        id: string
        values: AppointmentDraft
    } | null>(null)

    if (editing && edit?.id !== editing.id) {
        setEdit({ id: editing.id, values: draftFromAppointment(editing) })
    } else if (!editingId && edit) {
        setEdit(null)
    }

    const values = edit ? edit.values : draft
    const setValues = (patch: Partial<AppointmentDraft>) => {
        if (edit) {
            setEdit((prev) =>
                prev ? { ...prev, values: { ...prev.values, ...patch } } : prev,
            )
        } else {
            setDraft(patch)
        }
    }

    const closedDay = isClosedDay(values.date)
    // Un día inactivo bloquea agendar ahí o mover la cita hacia él; la cita
    // que ya estaba ese día se puede seguir editando, igual que en el backend.
    const inactiveDay =
        !closedDay &&
        isDayInactive(values.date) &&
        (!edit || values.date !== editing?.date)
    const dateError = closedDay || inactiveDay
    // Las dos son `HH:mm` de 24 h, así que se comparan como texto.
    const invalidRange = values.endTime <= values.time
    const startMinutes = timeToMinutes(values.time) ?? hours.opening * 60
    const duration = (timeToMinutes(values.endTime) ?? 0) - startMinutes
    // El backend solo rechaza el horario ocupado al crear la cita (ver
    // `findTimeConflict`), así que al editar este aviso es la única red.
    const conflict = findTimeConflict(values.date, values.time, edit?.id)
    const isSaving = isCreating || isUpdating
    const saveError = edit ? updateError : createError

    // Un asistente agenda a nombre del médico elegido: sin médico no hay a
    // dónde mandar el POST.
    const canSubmit =
        Boolean(values.patientId) &&
        Boolean(values.date) &&
        !dateError &&
        !invalidRange &&
        !conflict &&
        (!isAsistente || Boolean(medicoEmail))

    function goToNewPatient() {
        // Vuelve a este mismo diálogo (y a la misma semana y búsqueda de la
        // agenda); el borrador queda en el store.
        const params = new URLSearchParams(searchParams)
        params.set("cita", "nueva")
        params.delete("paciente")
        const backTo = `${location.pathname}?${params}`
        navigate(`/pacientes/nuevo?redirectTo=${encodeURIComponent(backTo)}`)
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        if (!canSubmit || isSaving) return

        const input = {
            patientId: Number(values.patientId),
            date: values.date,
            time: values.time,
            endTime: values.endTime,
            status: values.status,
            motivo: values.motivo.trim() || "Consulta general",
        }
        // Solo se usa si la cita se guarda sin conexión (ver `useAgenda`): ahí
        // no hay respuesta del servidor de la que tomar el nombre.
        const patientName = patients.find(
            (p) => String(p.id) === values.patientId,
        )?.name

        try {
            if (edit) {
                await updateAppointment({ id: edit.id, input, patientName })
            } else {
                await createAppointment({ ...input, patientName })
                resetDraft()
            }
        } catch {
            // El mensaje se muestra abajo; el diálogo se queda abierto para
            // corregir o reintentar.
            return
        }

        setOpen(false)
    }

    return (
        <>
            <Button
                size="sm"
                className={MOBILE_FAB}
                onClick={() => setOpen(true)}
                title="Nueva cita (Shift + ↑)"
                aria-keyshortcuts="Shift+ArrowUp"
            >
                <Plus data-icon="inline-start" />
                Nueva Cita
            </Button>

            <Dialog open={open} onOpenChange={setOpen}>
                {/* Se oculta mientras está abierta la ventana de "Seleccionar
                    paciente" (un diálogo anidado), y reaparece al cerrarla. */}
                <ResponsiveDialogContent className="sm:max-w-md data-nested-dialog-open:opacity-0">
                    {editingId && !edit ? (
                        <MissingAppointment isLoading={isLoading} />
                    ) : (
                        <form onSubmit={handleSubmit}>
                            <DialogHeader>
                                <DialogTitle>
                                    {edit ? "Editar cita" : "Nueva cita"}
                                </DialogTitle>
                                <DialogDescription>
                                    {edit
                                        ? "Cambia los datos o el estatus de la cita."
                                        : isAsistente && medicoActivo
                                          ? `Programa una cita en la agenda de ${medicoActivo.nombre}.`
                                          : "Programa una cita para un paciente registrado."}
                                </DialogDescription>
                            </DialogHeader>

                            <FieldGroup className="py-4">
                                {isAsistente && !edit && (
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
                                    {/* El rodeo a "Nuevo paciente" vuelve al alta
                                        (`?cita=nueva`), así que no cabe al editar. */}
                                    <PatientPickerDialog
                                        id="na-patient"
                                        patients={patients}
                                        isLoading={patientsLoading}
                                        selectedId={values.patientId}
                                        onSelect={(p) => setValues({ patientId: String(p.id) })}
                                        onNewPatient={edit ? undefined : goToNewPatient}
                                    />
                                </Field>

                                <Field>
                                    <FieldLabel htmlFor="na-date">Fecha</FieldLabel>
                                    <DatePicker
                                        id="na-date"
                                        value={values.date}
                                        onChange={(date) => setValues({ date })}
                                        isDateInactive={isDayInactive}
                                        aria-invalid={dateError}
                                        aria-describedby={
                                            dateError ? "na-date-error" : undefined
                                        }
                                    />
                                </Field>

                                <div className="flex flex-col gap-3">
                                    <div className="grid grid-cols-2 gap-4">
                                        <Field>
                                            <FieldLabel id="na-time-label" htmlFor="na-time">
                                                Hora de inicio
                                            </FieldLabel>
                                            {/* Mover el inicio arrastra el fin: la cita
                                                conserva su duración (una hora, de entrada). */}
                                            <TimePicker
                                                id="na-time"
                                                aria-labelledby="na-time-label"
                                                min={firstStart}
                                                max={lastStart}
                                                value={values.time}
                                                onChange={(time) =>
                                                    setValues({
                                                        time,
                                                        endTime: shiftEndTime(
                                                            values.time,
                                                            values.endTime,
                                                            time,
                                                            hours,
                                                        ),
                                                    })
                                                }
                                            />
                                        </Field>
                                        <Field>
                                            <FieldLabel id="na-end-time-label" htmlFor="na-end-time">
                                                Hora de fin
                                            </FieldLabel>
                                            {/* Un `min` que sigue al inicio deshabilita
                                                todo lo anterior: la duración nunca llega
                                                a cero ni queda negativa. */}
                                            <TimePicker
                                                id="na-end-time"
                                                aria-labelledby="na-end-time-label"
                                                min={minutesToTime(startMinutes + MINUTE_STEP)}
                                                max={lastEnd}
                                                invalid={invalidRange}
                                                value={values.endTime}
                                                onChange={(endTime) => setValues({ endTime })}
                                            />
                                        </Field>
                                    </div>
                                    {!invalidRange && (
                                        <p role="status" className="text-sm text-muted-foreground">
                                            Duración: {formatDuration(duration)}
                                        </p>
                                    )}
                                </div>

                                {invalidRange && (
                                    <p
                                        role="alert"
                                        className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700"
                                    >
                                        La hora de fin debe ser posterior a la de inicio.
                                    </p>
                                )}

                                {closedDay && (
                                    <p
                                        id="na-date-error"
                                        role="alert"
                                        className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700"
                                    >
                                        El consultorio no atiende los {weekdayName(values.date)}s.
                                        Elige otro día.
                                    </p>
                                )}

                                {inactiveDay && (
                                    <p
                                        id="na-date-error"
                                        role="alert"
                                        className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700"
                                    >
                                        {inactiveDayMessage(values.date)}
                                    </p>
                                )}

                                {!dateError && conflict && (
                                    <p
                                        role="alert"
                                        className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700"
                                    >
                                        Ya hay una cita a esa hora
                                        {conflict.patientName ? ` (${conflict.patientName})` : ""}.
                                        Elige otro horario.
                                    </p>
                                )}

                                <Field>
                                    <FieldLabel htmlFor="na-status">Estatus</FieldLabel>
                                    <select
                                        id="na-status"
                                        className={fieldControl}
                                        value={values.status}
                                        onChange={(e) =>
                                            setValues({
                                                status: e.target.value as AppointmentStatus,
                                            })
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
                                    <FieldLabel htmlFor="na-motivo"> Tratamiento a realizar </FieldLabel>
                                    <Input
                                        id="na-motivo"
                                        placeholder="Ej. Limpieza dental"
                                        value={values.motivo}
                                        onChange={(e) => setValues({ motivo: e.target.value })}
                                    />
                                </Field>

                                {saveError && (
                                    <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">
                                        {saveError instanceof Error
                                            ? saveError.message
                                            : edit
                                              ? "No se pudo guardar la cita."
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
                                <Button type="submit" disabled={!canSubmit || isSaving}>
                                    {isSaving
                                        ? "Guardando..."
                                        : edit
                                          ? "Guardar cambios"
                                          : "Guardar cita"}
                                </Button>
                            </DialogFooter>
                        </form>
                    )}
                </ResponsiveDialogContent>
            </Dialog>
        </>
    )
}

/**
 * `?cita=<id>` de una cita que no está en la agenda cargada: se borró, o el
 * enlace apunta a otra semana. Mientras la agenda carga, solo se espera.
 */
function MissingAppointment({ isLoading }: { isLoading: boolean }) {
    return (
        <>
            <DialogHeader>
                <DialogTitle>Editar cita</DialogTitle>
                <DialogDescription>
                    {isLoading
                        ? "Cargando la cita..."
                        : "No se encontró la cita: pudo eliminarse o estar en otra semana."}
                </DialogDescription>
            </DialogHeader>

            <div className="flex items-center justify-center py-6 text-sm text-muted-foreground">
                {isLoading && <Loader2 className="size-4 animate-spin" />}
            </div>

            <DialogFooter>
                <DialogClose
                    render={
                        <Button type="button" variant="outline">
                            Cerrar
                        </Button>
                    }
                />
            </DialogFooter>
        </>
    )
}
