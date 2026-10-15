import type { Patient } from "@/types/clinic"

/** Texto en minúsculas y sin acentos: "José" y "jose" quedan iguales. */
function normalize(text: string): string {
  return text.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase()
}

/**
 * Pacientes cuyo nombre, correo o teléfono contienen `term`, sin distinguir
 * mayúsculas ni acentos. Un término vacío los devuelve todos.
 */
export function filterPatients(patients: Patient[], term: string): Patient[] {
  const needle = normalize(term.trim())
  if (!needle) return patients
  return patients.filter(
    (p) =>
      normalize(p.name).includes(needle) ||
      normalize(p.email).includes(needle) ||
      normalize(p.phone).includes(needle),
  )
}
