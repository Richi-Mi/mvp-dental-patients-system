import { describe, expect, test } from "bun:test"

import { filterPatients } from "@/lib/patient-search"
import type { Patient } from "@/types/clinic"

function paciente(id: number, name: string, extra: Partial<Patient> = {}): Patient {
  return {
    id,
    name,
    birthDate: null,
    gender: "Femenino",
    phone: "",
    email: "",
    address: "",
    cp: "",
    notes: "",
    medicoEmail: "medico@gmail.com",
    createdAt: "2026-09-16",
    treatments: [],
    upcoming: [],
    clinicalHistory: null,
    ...extra,
  }
}

const ANA = paciente(1, "Ana López", { phone: "5512345678", email: "ana@gmail.com" })
const JOSE = paciente(2, "José Pérez", { phone: "5587654321" })
const MARIA = paciente(3, "MARÍA Núñez", { email: "maria.nunez@hotmail.com" })
const TODOS = [ANA, JOSE, MARIA]

const ids = (patients: Patient[]) => patients.map((p) => p.id)

describe("filterPatients", () => {
  test("un término vacío o de puros espacios devuelve todos", () => {
    expect(filterPatients(TODOS, "")).toBe(TODOS)
    expect(filterPatients(TODOS, "   ")).toBe(TODOS)
  })

  test("no distingue mayúsculas", () => {
    expect(ids(filterPatients(TODOS, "ANA"))).toEqual([1])
    expect(ids(filterPatients(TODOS, "maría"))).toEqual([3])
  })

  test("no distingue acentos, ni en el término ni en el nombre", () => {
    expect(ids(filterPatients(TODOS, "jose"))).toEqual([2])
    expect(ids(filterPatients(TODOS, "lopez"))).toEqual([1])
    expect(ids(filterPatients(TODOS, "nunez"))).toEqual([3])
    expect(ids(filterPatients(TODOS, "Pérez"))).toEqual([2])
  })

  test("busca por teléfono y por correo", () => {
    expect(ids(filterPatients(TODOS, "8765"))).toEqual([2])
    expect(ids(filterPatients(TODOS, "hotmail"))).toEqual([3])
  })

  test("ignora los espacios alrededor del término", () => {
    expect(ids(filterPatients(TODOS, "  ana  "))).toEqual([1])
  })

  test("sin coincidencias devuelve una lista vacía", () => {
    expect(filterPatients(TODOS, "zzz")).toEqual([])
  })
})
