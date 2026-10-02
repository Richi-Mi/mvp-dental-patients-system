import { calculateAge, todayISO } from "@/lib/clinic-data"
import type { Patient } from "@/types/clinic"

/** Columnas del CSV, en orden. Las fechas van como `yyyy-mm-dd`. */
const COLUMNS: {
  header: string
  value: (patient: Patient, today: string) => string
}[] = [
  { header: "Nombre", value: (p) => p.name },
  { header: "Fecha de nacimiento", value: (p) => p.birthDate ?? "" },
  {
    header: "Edad",
    value: (p, today) =>
      p.birthDate ? String(calculateAge(p.birthDate, today)) : "",
  },
  { header: "Sexo", value: (p) => p.gender },
  { header: "Teléfono", value: (p) => p.phone },
  { header: "Correo", value: (p) => p.email },
  { header: "Dirección", value: (p) => p.address },
  { header: "CP", value: (p) => p.cp },
  { header: "Notas", value: (p) => p.notes },
  { header: "Fecha de registro", value: (p) => p.createdAt },
]

/**
 * Un valor de CSV (RFC 4180): entre comillas si trae coma, comillas o saltos
 * de línea, con las comillas internas duplicadas. Si empieza con `=`, `+`,
 * `-`, `@`, tabulador o retorno, Excel lo tomaría como fórmula (también un
 * teléfono `+52…`): se le antepone un apóstrofo para que quede como texto.
 */
export function csvField(value: string): string {
  const text = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text
}

/**
 * Pacientes como CSV: separado por comas (el separador de Excel en es-MX),
 * renglones `\r\n` y BOM para que Excel lea bien los acentos.
 */
export function patientsToCsv(
  patients: Patient[],
  today: string = todayISO(),
): string {
  const rows = [
    COLUMNS.map((column) => column.header),
    ...patients.map((patient) =>
      COLUMNS.map((column) => column.value(patient, today)),
    ),
  ]
  return `\uFEFF${rows.map((row) => row.map(csvField).join(",")).join("\r\n")}\r\n`
}

/** Descarga los pacientes como `pacientes-yyyy-mm-dd.csv`. */
export function downloadPatientsCsv(patients: Patient[]): void {
  const today = todayISO()
  const blob = new Blob([patientsToCsv(patients, today)], {
    type: "text/csv;charset=utf-8",
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = `pacientes-${today}.csv`
  // Algunos navegadores solo descargan desde enlaces que están en el documento.
  document.body.append(link)
  link.click()
  link.remove()
  // Revocarlo en el acto puede cancelar la descarga en algunos navegadores.
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
