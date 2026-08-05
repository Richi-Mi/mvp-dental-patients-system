"use client"

import * as React from "react"
import { CalendarDays, LayoutDashboard, Users } from "lucide-react"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
// import { PatientsView } from "@/components/patients-view"
// import { AgendaView } from "@/components/agenda-view"
// import { DashboardView } from "@/components/dashboard-view"
import { ClinicProvider } from "./context/ClinicProvider"
import { PatientsView } from "./pages/PatientsView"
import { AgendaView } from "./pages/AgendaView"
import { DashboardView } from "./pages/DashboardView"

const NAV = [
  { value: "agenda", label: "Agenda", icon: CalendarDays },
  { value: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { value: "pacientes", label: "Pacientes", icon: Users },
] as const

export function ClinicApp() {
  return (
    <ClinicProvider>
      <Tabs
        defaultValue="agenda"
        orientation="vertical"
        className="min-h-screen w-full flex-col gap-0 bg-background lg:flex-row"
      >
        {/* Sidebar */}
        <aside className="flex flex-col gap-6 border-b border-border bg-sidebar px-4 py-5 lg:h-screen lg:w-64 lg:shrink-0 lg:border-r lg:border-b-0 lg:sticky lg:top-0">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary overflow-hidden">
              <img src="/icon_local.png" alt="DentalCare" className="size-full object-cover" />
            </div>
            <div className="leading-tight">
              <p className="text-sm font-semibold text-foreground">Odontologia familiar</p>
              <p className="text-xs text-muted-foreground">Consultorio dental</p>
            </div>
          </div>

          <TabsList
            variant="line"
            className="h-auto w-full flex-row gap-1 bg-transparent p-0 lg:flex-col"
          >
            {NAV.map((item) => (
              <TabsTrigger
                key={item.value}
                value={item.value}
                className="w-full justify-start gap-2.5 rounded-lg px-3 py-2 text-foreground/70 data-active:bg-primary/10 data-active:text-primary lg:h-9"
              >
                <item.icon className="size-4" />
                {item.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <div className="mt-auto hidden rounded-lg bg-muted p-3 text-xs text-muted-foreground lg:block">
            <p className="font-medium text-foreground">Dr. Gustavo Martínez </p>
            <p>Odontólogo general</p>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <div className="mx-auto max-w-6xl">
            <TabsContent value="agenda">
              <AgendaView />
            </TabsContent>
            <TabsContent value="dashboard">
              <DashboardView />
            </TabsContent>
            <TabsContent value="pacientes">
              <PatientsView />
            </TabsContent>
          </div>
        </main>
      </Tabs>
    </ClinicProvider>
  )
}
