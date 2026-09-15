# API — Proyecto Dental (backend)

Backend de consultorio dental construido con [Elysia](https://elysiajs.com/) sobre [Bun](https://bun.sh/). Todas las rutas devuelven JSON.

- **Base URL (dev):** `http://localhost:3000`
- **Documentación interactiva (OpenAPI/Scalar):** `GET /openapi` (generada automáticamente por `@elysia/openapi` a partir de los esquemas de cada ruta).

## Índice

- [Autenticación](#autenticación)
- [Manejo de errores](#manejo-de-errores)
- [Modelos de datos](#modelos-de-datos)
- [`/auth`](#auth)
- [`/user`](#user)
- [`/pacientes`](#pacientes)
- [`/citas`](#citas)
- [Ruta no encontrada](#ruta-no-encontrada)

---

## Autenticación

Todas las rutas **excepto** `POST /auth/register` y `PUT /auth` requieren un JWT enviado en un **header** (no en `Authorization`, sino en un header propio):

```
token: <jwt>
```

El token se obtiene al hacer login (`PUT /auth`) y se firma con el payload:

```json
{ "correo": "usuario@correo.com", "tipo": "medico" }
```

- Expira en **1 día** (`exp: "1d"`).
- Si el header `token` falta o el JWT es inválido/expiró, la API responde `401` con `{ "message": "Token inválido o expirado" }`.
- Algunas rutas además requieren que `tipo` sea `"medico"` (ver columna **Rol** en cada tabla). Si el usuario autenticado no cumple el rol, responde `403` con `{ "message": "Acceso denegado: Se requiere medico y tienes <tipo_actual>" }`.

## Manejo de errores

Todas las rutas comparten el mismo formato de error: `{ "message": string }`.

| Código | Cuándo ocurre |
|---|---|
| `400` | Error de validación de query/params (`code: "VALIDATION"` genérico de Elysia; los `body` inválidos normalmente devuelven `422`, ver nota abajo). |
| `401` | Token ausente, inválido o expirado; o credenciales de login incorrectas. |
| `403` | El usuario autenticado no tiene el rol requerido (`authRole("medico")`). |
| `404` | El recurso solicitado no existe (paciente, usuario, cita, médico referenciado, etc.), o la ruta no coincide con ninguna definida. |
| `409` | Conflicto: correo ya registrado, o cita duplicada para el mismo médico/horario. |
| `422` | El `body`/`headers`/`query` no cumple el esquema (`t.Object(...)`) declarado por la ruta — validación nativa de Elysia/TypeBox, ocurre **antes** de llegar al controlador. |
| `500` | Error no controlado. |

> Nota: la mayoría de errores de validación de **body** que arma Elysia internamente devuelven `422` con un cuerpo detallado (`type`, `on`, `summary`, `expected`, `found`, …), distinto al `{ message }` simple de `CustomError`.

## Modelos de datos

Formas de salida más comunes (ya sin `password` y con relaciones aplanadas). Los campos `null` se muestran cuando la columna es nullable.

**Usuario**
```ts
{
  correo: string,       // PK
  nombre: string,
  tipo: "medico" | "asistente",
  activo: boolean
  // password nunca se incluye en las respuestas
}
```

**Paciente**
```ts
{
  id: number,
  cp: string | null,
  direccion: string | null,
  fecha_nacimiento: string | null, // "YYYY-MM-DD"; null en pacientes anteriores al cambio
  correo: string | null,
  telefono: string | null,
  notas: string | null,
  nombre: string,
  sexo: string,
  isActive: boolean,
  correo_medico: string | null,
  medico?: Usuario | null,          // solo si la ruta carga la relación
  tratamientos?: Tratamiento[],     // solo en GET /pacientes/:id y tras PUT con `tratamientos`
  proximasCitas?: Cita[]            // solo en GET /pacientes/:id
}
```

**Tratamiento**
```ts
{
  id: string,            // generado por el backend: `${id_paciente}-${fecha(YYYY-MM-DD)}`
  fecha: Date,
  nombre: string,
  costo: number | null,
  cuenta: number | null,
  id_paciente: number
}
```

**Cita**
```ts
{
  id: string,             // generado por el backend: `${correo_medico}_${fecha_cita.toISOString()}`
  fecha_cita: Date,
  motivo: string,
  estatus: string,
  correo_medico: string,
  id_paciente: number,
  medico?: Usuario,
  paciente?: Paciente
}
```

---

## `/auth`

Rutas públicas de registro y login.

### `POST /auth/register`

Registra un usuario nuevo. **Siempre** se crea con `tipo: "asistente"` (para crear un `"medico"` usar `POST /user/admin/register`, que requiere estar autenticado como médico).

- **Auth:** no requerida.
- **Headers:** `Content-Type: application/json`.
- **Body:**

| Campo | Tipo | Requerido | Notas |
|---|---|---|---|
| `nombre` | `string` | Sí | |
| `correo` | `string` | Sí | Debe ser único. |
| `password` | `string` | Sí | Se guarda hasheada (`Bun.password.hash`). |

```json
{ "nombre": "José Ricardo", "correo": "test@gmail.com", "password": "12345678" }
```

- **Respuesta `201`:**
```json
{ "message": "Usuario con test@gmail.com creado" }
```
- **Errores:** `409` si el correo ya está registrado; `422` si falta algún campo.

### `PUT /auth`

Login. Devuelve un JWT y los datos del usuario (sin password).

- **Auth:** no requerida.
- **Body:**

| Campo | Tipo | Requerido |
|---|---|---|
| `correo` | `string` | Sí |
| `password` | `string` | Sí |

```json
{ "correo": "test@gmail.com", "password": "12345678" }
```

- **Respuesta `200`:**
```json
{
  "token": "<jwt>",
  "usuario": {
    "correo": "test@gmail.com",
    "nombre": "José Ricardo",
    "tipo": "asistente",
    "activo": true
  }
}
```
- **Errores:**

| Código | Causa |
|---|---|
| `401` | El correo no existe. |
| `403` | El usuario existe pero está inactivo (`activo: false`) — mensaje: *"Usuario inactivo, contacta a un administrador"*. |
| `401` | La contraseña no coincide. |

---

## `/user`

Gestión del usuario autenticado y, para médicos, administración de todo el staff. Todas las rutas requieren header `token`.

### `GET /user`

Obtiene la información del usuario autenticado (según el `correo` del token).

- **Auth:** sí. **Rol:** cualquiera.
- **Headers:** `token: <jwt>`.
- **Body / Params / Query:** ninguno.
- **Respuesta `200`:** objeto `Usuario`.
- **Errores:** `401` sin token válido; `404` si el usuario del token ya no existe.

### `PUT /user/update`

Actualiza el nombre del propio usuario autenticado.

- **Auth:** sí. **Rol:** cualquiera.
- **Headers:** `token: <jwt>`.
- **Body:**

| Campo | Tipo | Requerido |
|---|---|---|
| `nombre` | `string` | No |

- **Respuesta `200`:** objeto `Usuario` actualizado.

### `GET /user/medicos`

Lista los médicos **activos** del consultorio, ordenados por nombre. A diferencia de `GET /user/all`, no requiere rol `medico`: un asistente la necesita para elegir de qué médico ve la agenda y a nombre de quién agenda una cita.

- **Auth:** sí. **Rol:** cualquiera.
- **Headers:** `token: <jwt>`.
- **Respuesta `200`:** `Usuario[]` (solo `tipo: "medico"` con `activo: true`).

### `GET /user/all`

Lista todos los usuarios del sistema.

- **Auth:** sí. **Rol:** `medico`.
- **Headers:** `token: <jwt>`.
- **Respuesta `200`:** `Usuario[]` (sin `password`; la columna tiene `select: false` en la entidad, así que se excluye por defecto de cualquier consulta que no la pida explícitamente).
- **Errores:** `403` si el usuario autenticado no es médico.

### `GET /user/admin/:correo`

Obtiene la información de cualquier usuario por su correo.

- **Auth:** sí. **Rol:** `medico`.
- **Headers:** `token: <jwt>`.
- **Params:** `correo` (`string`).
- **Respuesta `200`:** objeto `Usuario`.
- **Errores:** `403` si no es médico; `404` si el correo no existe.

### `PUT /user/admin/:correo`

Actualiza cualquier campo de un usuario, incluyendo `tipo` y `activo` (baja/alta lógica de staff).

- **Auth:** sí. **Rol:** `medico`.
- **Headers:** `token: <jwt>`.
- **Params:** `correo` (`string`).
- **Body:**

| Campo | Tipo | Requerido |
|---|---|---|
| `nombre` | `string` | No |
| `tipo` | `"medico" \| "asistente"` | No |
| `activo` | `boolean` | No |

- **Respuesta `200`:** objeto `Usuario` actualizado.
- **Errores:** `403` si no es médico; `404` si el correo no existe.

### `POST /user/admin/register`

Crea un usuario nuevo pudiendo elegir el `tipo` (incluido `"medico"`). Internamente delega en `AuthController.doRegister`.

- **Auth:** sí. **Rol:** `medico`.
- **Headers:** `token: <jwt>`.
- **Body:**

| Campo | Tipo | Requerido |
|---|---|---|
| `nombre` | `string` | Sí |
| `correo` | `string` | Sí |
| `password` | `string` | Sí |
| `tipo` | `"medico" \| "asistente"` | Sí |

- **Respuesta `201`:**
```json
{ "message": "Usuario con nuevo@correo.com creado" }
```
- **Errores:** `403` si no es médico; `409` si el correo ya existe.

---

## `/pacientes`

Gestión de pacientes. Todas las rutas requieren header `token`; los pacientes quedan **asociados al médico autenticado**.

### `GET /pacientes`

Lista los pacientes activos **del médico autenticado** (filtra por `correo_medico` = correo del token), o los del médico indicado en la query.

- **Auth:** sí.
- **Headers:** `token: <jwt>`.
- **Query:**

| Campo | Tipo | Requerido | Notas |
|---|---|---|---|
| `correo_medico` | `string` | No | Lista los pacientes de ese médico en lugar de los del token. Lo usa un asistente, que no tiene pacientes propios. |

- **Respuesta `200`:** `Paciente[]` (incluye `medico` cargado).

### `GET /pacientes/:id`

Obtiene un paciente activo, su lista de tratamientos y sus próximas citas.

- **Auth:** sí.
- **Headers:** `token: <jwt>`.
- **Params:** `id` (`number`).
- **Respuesta `200`:**
```json
{
  "id": 1,
  "nombre": "Juan Pérez",
  "...": "...resto de campos de Paciente...",
  "medico": { "correo": "medico@gmail.com", "...": "..." },
  "tratamientos": [ { "id": "1-2026-09-10", "nombre": "Limpieza", "costo": 500, "cuenta": 0, "fecha": "2026-09-10", "id_paciente": 1 } ],
  "proximasCitas": [ { "id": "medico@gmail.com_2026-09-15T15:00:00.000Z", "fecha_cita": "2026-09-15T15:00:00.000Z", "motivo": "Revisión", "estatus": "pendiente" } ]
}
```
- `proximasCitas` son las citas del paciente (de cualquier médico) con `fecha_cita >= ahora`, ordenadas ascendentemente.
- **Errores:** `404` si el paciente no existe o está inactivo (`isActive: false`).

### `POST /pacientes`

Crea un paciente nuevo.

- **Auth:** sí.
- **Headers:** `token: <jwt>`.
- **Body:**

| Campo | Tipo | Requerido | Notas |
|---|---|---|---|
| `nombre` | `string` | Sí | |
| `sexo` | `string` | Sí | |
| `cp` | `string` | Sí | |
| `direccion` | `string` | Sí | |
| `fecha_nacimiento` | `string` (`YYYY-MM-DD`) | Sí | Si falta o no es una fecha válida, `400` con `{ message }`. |
| `correo` | `string` | Sí | |
| `telefono` | `string` | Sí | |
| `notas` | `string` | No | |
| `correo_medico` | `string` | No | Correo de un `Usuario` existente; si se envía y no existe, `404`. Si se omite, el paciente queda sin médico asignado. |

- **Respuesta `201`:** objeto `Paciente` creado.
- **Errores:** `404` si `correo_medico` no corresponde a ningún usuario; `422` si faltan campos requeridos.

### `PUT /pacientes/:id`

Actualiza los datos de un paciente. Todos los campos son opcionales (actualización parcial).

- **Auth:** sí.
- **Headers:** `token: <jwt>`.
- **Params:** `id` (`number`).
- **Body:**

| Campo | Tipo | Requerido | Notas |
|---|---|---|---|
| `cp`, `direccion`, `correo`, `telefono`, `notas`, `nombre`, `sexo` | `string` | No | |
| `fecha_nacimiento` | `string` (`YYYY-MM-DD`) \| `null` | No | Omitida: no cambia. `null`: se borra. |
| `correo_medico` | `string` | No | Reasigna el médico del paciente. |
| `tratamientos` | `Tratamiento[]` (ver abajo) | No | **Reemplaza por completo** la lista de tratamientos guardados (ver detalle). |

Cada elemento de `tratamientos`:

| Campo | Tipo | Requerido |
|---|---|---|
| `fecha` | `string` (fecha ISO) | Sí |
| `nombre` | `string` | Sí |
| `costo` | `number \| null` | No |
| `cuenta` | `number \| null` | No |

> **Semántica de `tratamientos`:** si el campo viene en el body (aunque sea `[]`), el backend **borra todos** los tratamientos guardados del paciente y **crea de nuevo** los que vienen en el arreglo (no hace merge por id). Es decir, el cliente debe mandar la lista completa y final que quiere que quede guardada: si trae el arreglo completo obtenido de `GET /pacientes/:id`, editado/con altas/bajas, el servidor sincroniza exactamente a ese estado. Si el campo `tratamientos` se omite del body, los tratamientos existentes no se tocan.

```json
{
  "nombre": "Juan Pérez",
  "correo_medico": "medico@gmail.com",
  "tratamientos": [
    { "fecha": "2026-09-10", "nombre": "Limpieza", "costo": 500, "cuenta": 0 },
    { "fecha": "2026-09-20", "nombre": "Extracción", "costo": 1200 }
  ]
}
```

- **Respuesta `200`:** objeto `Paciente` actualizado (incluye `tratamientos` solo si se envió ese campo).
- **Errores:** `404` si el paciente o el `correo_medico` no existen.

### `DELETE /pacientes/:id`

Baja lógica del paciente (`isActive = false`); **no** borra el registro.

- **Auth:** sí.
- **Headers:** `token: <jwt>`.
- **Params:** `id` (`number`).
- **Respuesta `200`:** objeto `Paciente` con `isActive: false`.
- **Errores:** `404` si el paciente no existe.

---

## `/citas`

Agenda de citas del médico autenticado. Todas las rutas requieren header `token`; las citas quedan asociadas al médico del token.

### `GET /citas`

Lista las citas del médico autenticado, agrupadas por día y ordenadas por hora ascendente, filtrables por semana/mes y por texto libre.

- **Auth:** sí.
- **Headers:** `token: <jwt>`.
- **Query:**

| Campo | Tipo | Requerido | Notas |
|---|---|---|---|
| `year` | `number` | No | Default: año actual. |
| `month` | `number` (1–12) | No | Default: mes actual. Ignorado si se envía `week`. |
| `week` | `number` (1–53) | No | Semana ISO (lunes a domingo) del `year` indicado; tiene prioridad sobre `month`. |
| `query` | `string` | No | Filtra por nombre del paciente o motivo (`ILIKE`, insensible a mayúsculas). |

- **Respuesta `200`:** objeto agrupado por fecha (`YYYY-MM-DD`), cada valor es un arreglo de `Cita` ordenado por `fecha_cita` ascendente:
```json
{
  "2026-09-10": [
    { "id": "medico@gmail.com_2026-09-10T09:00:00.000Z", "fecha_cita": "2026-09-10T09:00:00.000Z", "motivo": "Revisión", "estatus": "pendiente", "paciente": { "...": "..." } }
  ],
  "2026-09-11": [ "..." ]
}
```

### `POST /citas`

Crea una nueva cita para el médico autenticado.

- **Auth:** sí.
- **Headers:** `token: <jwt>`.
- **Body:**

| Campo | Tipo | Requerido |
|---|---|---|
| `id_paciente` | `number` | Sí |
| `fecha_cita` | `string` (fecha/hora ISO) | Sí |
| `motivo` | `string` | Sí |
| `estatus` | `string` | Sí |

```json
{ "id_paciente": 1, "fecha_cita": "2026-09-10T15:00:00.000Z", "motivo": "Revisión", "estatus": "pendiente" }
```

- **Respuesta `201`:** objeto `Cita` creado (`id` generado por el backend).
- **Errores:** `404` si el paciente no existe o está inactivo; `409` si el médico ya tiene una cita registrada exactamente en ese horario.

### `GET /citas/medico/:correo`

Igual que `GET /citas`, pero sobre la agenda del médico indicado en la URL en vez de la del token. Pensada para que un **asistente** consulte la agenda de cualquier médico.

- **Auth:** sí. **Rol:** cualquiera.
- **Headers:** `token: <jwt>`.
- **Params:** `correo` (`string`) — debe ser un usuario existente, de `tipo: "medico"` y `activo: true`.
- **Query:** los mismos campos que `GET /citas` (`year`, `month`, `week`, `query`).
- **Respuesta `200`:** citas agrupadas por fecha, idéntico a `GET /citas`.
- **Errores:** `404` si el correo no existe, no es de un médico o el médico está inactivo.

### `POST /citas/medico/:correo`

Crea una cita **a nombre del médico indicado en la URL**, no del usuario autenticado. Es la ruta con la que un asistente agenda por un médico.

- **Auth:** sí. **Rol:** cualquiera.
- **Headers:** `token: <jwt>`.
- **Params:** `correo` (`string`) — mismo criterio de validación que arriba.
- **Body:** idéntico al de `POST /citas` (`id_paciente`, `fecha_cita`, `motivo`, `estatus`).
- **Respuesta `201`:** objeto `Cita` creado (su `id` se compone con el correo del médico de la URL).
- **Errores:** `404` si el médico o el paciente no existen; `409` si ese médico ya tiene una cita en ese horario.

> Nota: `PUT /citas/:id` y `DELETE /citas/:id` siguen filtrando por el médico del token, así que un asistente no puede editar ni borrar citas ajenas (responden `404`).

### `PUT /citas/:id`

Actualiza una cita existente del médico autenticado. Todos los campos son opcionales.

- **Auth:** sí.
- **Headers:** `token: <jwt>`.
- **Params:** `id` (`string`, el id compuesto de la cita).
- **Body:**

| Campo | Tipo | Requerido |
|---|---|---|
| `id_paciente` | `number` | No — si se envía, reasigna el paciente de la cita. |
| `fecha_cita` | `string` (fecha/hora ISO) | No |
| `motivo` | `string` | No |
| `estatus` | `string` | No |

- **Respuesta `200`:** objeto `Cita` actualizado.
- **Errores:** `404` si la cita no existe o no pertenece al médico autenticado; `404` si el nuevo `id_paciente` no existe/está inactivo.

### `DELETE /citas/:id`

Elimina una cita **físicamente** de la base de datos (no es baja lógica).

- **Auth:** sí.
- **Headers:** `token: <jwt>`.
- **Params:** `id` (`string`).
- **Respuesta `200`:**
```json
{ "message": "Cita eliminada" }
```
- **Errores:** `404` si la cita no existe o no pertenece al médico autenticado.

---

## Ruta no encontrada

Cualquier ruta/método no definido responde:

- **Respuesta `404`:**
```json
{ "message": "Ruta no encontrada" }
```
