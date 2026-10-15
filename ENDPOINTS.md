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
- [`/pacientes/:id/fotos`](#pacientesidfotos)
- [`/citas`](#citas)
- [`/historial`](#historial)
- [`/ajustes`](#ajustes)
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

- Expira en **3 días** (`exp: "3d"`).
- Si el header `token` falta o el JWT es inválido/expiró, la API responde `401` con `{ "message": "Token inválido o expirado" }`.
- Algunas rutas además requieren que `tipo` sea `"medico"` (ver columna **Rol** en cada tabla). Si el usuario autenticado no cumple el rol, responde `403` con `{ "message": "Acceso denegado: Se requiere medico y tienes <tipo_actual>" }`.

## Manejo de errores

Todas las rutas comparten el mismo formato de error: `{ "message": string }`.

| Código | Cuándo ocurre |
|---|---|
| `400` | El controlador rechaza la petición por una regla de negocio que el esquema no puede expresar (`CustomError`), p. ej. una `horaFin` que no es posterior a la hora de inicio de la cita, una carga de fotos que dejaría al paciente con más de 5, o un archivo que no es una imagen válida. |
| `401` | Token ausente, inválido o expirado; o credenciales de login incorrectas. |
| `403` | El usuario autenticado no tiene el rol requerido (`authRole("medico")`). |
| `404` | El recurso solicitado no existe (paciente, usuario, cita, médico referenciado, etc.), o la ruta no coincide con ninguna definida. |
| `409` | Conflicto: correo ya registrado, cita duplicada para el mismo médico/horario, o paciente que ya tiene historial clínico. |
| `422` | El `body`, la `query` o los `params` no cumplen el esquema (`t.Object(...)`) de la ruta: falta un campo requerido, un valor tiene otro tipo o está fuera de rango… Lo valida Elysia/TypeBox **antes** de llegar al controlador. |
| `500` | Error no controlado. |

> Nota: el `message` de un `422` es el texto que el esquema define para ese campo (p. ej. `"El mes debe ser un número entre 1 y 12"`). Si el campo no define uno, Elysia pone en `message` el detalle de la validación como JSON en texto (`type`, `on`, `property`, `summary`, `expected`, `found`, …).

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
  fecha_nacimiento: string | null, // "YYYY-MM-DD"; null si no se capturó (o en pacientes anteriores al cambio)
  correo: string | null,
  telefono: string | null,
  notas: string | null,
  nombre: string,
  sexo: string,
  isActive: boolean,
  fecha_creacion: string,           // timestamp ISO; lo asigna el backend al crear el paciente
  correo_medico: string | null,
  medico?: Usuario | null,          // solo si la ruta carga la relación
  tratamientos?: Tratamiento[],     // solo en GET /pacientes/:id y tras PUT con `tratamientos`
  proximasCitas?: Cita[],           // solo en GET /pacientes/:id
  historialClinico?: HistorialClinico | null // solo en GET /pacientes/:id; null si no tiene
}
```

> `cp`, `direccion`, `correo` y `telefono` se guardan en tablas aparte (relaciones 1 -> 1): `paciente_contacto` (teléfono), `paciente_correo` (correo) y `paciente_direccion` (`cp` y `direccion`). El API los sigue exponiendo **planos** en el paciente, también cuando el paciente viene dentro de una `Cita`. Valen `null` si no se capturaron: los strings vacíos (o solo espacios) se guardan como `null`, y cada tabla solo tiene registro si alguno de sus campos tiene valor.

**Tratamiento**
```ts
{
  id: string,            // generado por el backend: `${id_paciente}-${fecha(YYYY-MM-DD)}`
  fecha: Date,
  nombre: string,        // "SIN_MOTIVO" si se registró sin nombre (solo importes); el frontend lo muestra vacío
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
  horaFin: string,        // "HH:MM" (24 h) en el reloj del consultorio (ver nota)
  motivo: string,
  estatus: string,
  correo_medico: string,
  id_paciente: number,
  medico?: Usuario,
  paciente?: Paciente
}
```

> `fecha_cita` es un instante (ISO en UTC), pero `horaFin` es la hora a la que termina la cita en el reloj del consultorio (`ZONA_HORARIA` del backend, por defecto `America/Mexico_City`), que es en el que el frontend muestra ambas: `fecha_cita: "2026-09-10T16:00:00.000Z"` con `horaFin: "11:30"` es una cita de 10:00 a 11:30. Siempre es posterior a la hora de inicio (una cita no cruza la medianoche). Las citas anteriores a esta columna quedaron de una hora.

> `estatus` es texto libre para el backend (`varchar(50)`); el cliente maneja `confirmada`, `completada`, `no_asistio` y `cancelada` (`AppointmentStatus`), y cualquier otro valor (incluido el antiguo `pendiente`) lo muestra como `no_asistio` («No asistió»). Si el médico activó el autocompletado (`/ajustes`), el backend cambia solo las `confirmada` a `completada` 24 h después de su `fecha_cita`.

**Ajustes**
```ts
{
  autocompletarCitas: boolean                    // false si nunca se guardó; solo tiene efecto en un médico
  horario: { apertura: number; cierre: number }  // primera y última hora de la agenda (0–23); { 10, 20 } por defecto
  tamanoLetra: number                            // porcentaje del tamaño de letra (90–130, pasos de 5); 100 por defecto
}
```

**HistorialClinico**
```ts
{
  id_paciente: number,   // PK y FK a Paciente: un solo historial por paciente
  historial: {           // siempre trae las 10 preguntas
    pregunta_1: string | null,   // null = sin responder
    // ...
    pregunta_10: string | null
  }
}
```

> Los textos de las preguntas viven en el frontend (`CLINICAL_HISTORY_QUESTIONS` en `src/lib/clinic-data.ts`); el backend solo guarda las respuestas. La pregunta 10 (embarazo) solo se muestra a pacientes de sexo femenino, pero el backend no lo valida.

**Foto**
```ts
{
  img_name: string,      // PK e identificador de la foto: `${id_paciente}_${UUID v7}.webp`
  fecha_subida: string,  // ISO; las fotos de una misma carga comparten la fecha
  id_paciente: number,
  url: string            // ruta del API que devuelve la imagen: /pacientes/:id/fotos/:img_name
}
```

> `url` exige el header `token` como cualquier otra ruta, así que no sirve directo en un `<img src>`: el frontend descarga la imagen con Axios (`responseType: "blob"`) y la muestra con un object URL (`PhotoImage`).

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
  "proximasCitas": [ { "id": "medico@gmail.com_2026-09-15T15:00:00.000Z", "fecha_cita": "2026-09-15T15:00:00.000Z", "horaFin": "10:00", "motivo": "Revisión", "estatus": "confirmada" } ],
  "historialClinico": { "id_paciente": 1, "historial": { "pregunta_1": "No", "pregunta_2": null, "...": "...", "pregunta_10": null } }
}
```
- `proximasCitas` son las citas del paciente (de cualquier médico) con `fecha_cita >= ahora`, ordenadas ascendentemente.
- `historialClinico` siempre viene: es `null` si el paciente todavía no tiene historial clínico. Es la única forma de consultarlo (no hay `GET /historial`).
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
| `cp` | `string \| null` | No | Dato de contacto (ver nota abajo). |
| `direccion` | `string \| null` | No | Dato de contacto. |
| `fecha_nacimiento` | `string` (`YYYY-MM-DD`) \| `null` | No | Omitida o `null`: el paciente queda sin fecha. Si no es una fecha válida, `422` con `{ message }`. |
| `correo` | `string \| null` | No | Dato de contacto. |
| `telefono` | `string \| null` | No | Dato de contacto. |
| `notas` | `string` | No | |
| `correo_medico` | `string` | No | Correo de un `Usuario` existente; si se envía y no existe, `404`. Si se omite, el paciente queda sin médico asignado. |

> **Datos de contacto:** omitir un campo, mandarlo en `null` o como `""` (o solo espacios) es equivalente: se guarda como `null`, y los strings se guardan sin espacios al inicio ni al final. Solo se crean los registros de contacto (teléfono, correo, dirección) que tengan algún valor; si los cuatro quedan en `null`, el paciente se crea sin ninguno. Un valor que no sea `string` ni `null` responde `422`.

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
| `notas`, `nombre`, `sexo` | `string` | No | |
| `cp`, `direccion`, `correo`, `telefono` | `string \| null` | No | Omitido: no cambia. `null` o `""`: se borra ese dato. Cada registro de contacto (teléfono, correo, dirección) se elimina si sus campos quedan en `null`, y se crea si no existía y se manda algún valor. |
| `fecha_nacimiento` | `string` (`YYYY-MM-DD`) \| `null` | No | Omitida: no cambia. `null`: se borra. |
| `correo_medico` | `string` | No | Reasigna el médico del paciente. |
| `tratamientos` | `Tratamiento[]` (ver abajo) | No | **Reemplaza por completo** la lista de tratamientos guardados (ver detalle). |

Cada elemento de `tratamientos`:

| Campo | Tipo | Requerido |
|---|---|---|
| `fecha` | `string` (fecha ISO) | Sí |
| `nombre` | `string \| null` | No |
| `costo` | `number \| null` | No |
| `cuenta` | `number \| null` | No |

> **Tratamiento sin nombre:** si `nombre` se omite, es `null` o viene en blanco, el backend lo guarda como `"SIN_MOTIVO"`, siempre que traiga `costo` o `cuenta` (un `0` cuenta como dato). Sin nombre ni importes responde `400`. El nombre se guarda sin espacios al inicio ni al final.

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
- **Errores:** `404` si el paciente o el `correo_medico` no existen. `400` si un tratamiento no trae nombre, `costo` ni `cuenta` (`"Un tratamiento sin nombre debe tener costo o a cuenta"`); en ese caso no se guarda ningún cambio.

### `DELETE /pacientes/:id`

Baja lógica del paciente (`isActive = false`); **no** borra el registro.

- **Auth:** sí.
- **Headers:** `token: <jwt>`.
- **Params:** `id` (`number`).
- **Respuesta `200`:** objeto `Paciente` con `isActive: false`.
- **Errores:** `404` si el paciente no existe.

---

## `/pacientes/:id/fotos`

Fotos de un paciente. Todas las rutas requieren header `token` y sirven para cualquier rol. El backend convierte cada imagen a **WebP al 75%** con el lado más largo en **2560 px** como máximo (nunca la agranda), y un paciente tiene como **máximo 5** fotos. Detalles de almacenamiento y formatos en el README del backend ("Fotos de pacientes").

### `GET /pacientes/:id/fotos`

Lista las fotos del paciente en el orden en que se subieron (las de una misma carga, en el orden en que se eligieron).

- **Auth:** sí.
- **Headers:** `token: <jwt>`.
- **Params:** `id` (`number`).
- **Respuesta `200`:** `Foto[]` (vacío si no tiene).
- **Errores:** `404` si el paciente no existe o está inactivo.

### `POST /pacientes/:id/fotos`

Sube de 1 a 5 imágenes. Es **todo o nada**: si una no es válida, o si con ellas el paciente pasaría de 5 fotos, no se guarda ninguna.

- **Auth:** sí.
- **Headers:** `token: <jwt>`. El cuerpo es `multipart/form-data` (sin `Content-Type: application/json`).
- **Params:** `id` (`number`).
- **Body (`multipart/form-data`):**

| Campo | Tipo | Requerido | Notas |
|---|---|---|---|
| `fotos` | `File` (repetido) | Sí | De 1 a 5 archivos de hasta 20 MB cada uno. JPEG, PNG, WebP, GIF (solo el primer cuadro) o BMP; HEIC, AVIF y TIFF no se aceptan. |

```bash
curl -H "token: $TOKEN" -F "fotos=@frente.jpg" -F "fotos=@perfil.png" http://localhost:3000/pacientes/1/fotos
```

- **Respuesta `201`:** `Foto[]` con las fotos creadas.
- **Errores:**
  - `422` sin archivos, con más de 5 o con uno de más de 20 MB: `{ "message": "Envía de 1 a 5 imágenes de hasta 20 MB cada una" }`.
  - `400` si el paciente pasaría de 5 fotos, p. ej. `{ "message": "El paciente ya tiene 4 imágenes: solo puedes subir 1 más (máximo 5)." }`.
  - `400` si un archivo no es una imagen válida en un formato aceptado (el mensaje dice cuál), o si pasa de 120 megapíxeles.
  - `404` si el paciente no existe o está inactivo.

### `GET /pacientes/:id/fotos/:nombre`

Devuelve la imagen (la `url` de cada `Foto`).

- **Auth:** sí.
- **Headers:** `token: <jwt>`.
- **Params:** `id` (`number`), `nombre` (`img_name` de la foto).
- **Respuesta `200`:** la imagen, `Content-Type: image/webp`, con `Cache-Control: private, max-age=31536000, immutable` (el contenido de un nombre nunca cambia).
- **Errores:** `404` si la foto no existe, es de otro paciente o el paciente está dado de baja (sus fotos se conservan, pero ya no se sirven); `422` si `nombre` no tiene la forma de un `img_name`.

### `DELETE /pacientes/:id/fotos/:nombre`

Elimina la foto y su archivo.

- **Auth:** sí.
- **Headers:** `token: <jwt>`.
- **Params:** `id` (`number`), `nombre` (`img_name`).
- **Respuesta `200`:** la `Foto` eliminada.
- **Errores:** `404` si la foto no existe, es de otro paciente o el paciente está dado de baja (sus fotos se conservan, pero ya no se sirven); `422` si `nombre` no tiene la forma de un `img_name`.

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
    { "id": "medico@gmail.com_2026-09-10T16:00:00.000Z", "fecha_cita": "2026-09-10T16:00:00.000Z", "horaFin": "11:00", "motivo": "Revisión", "estatus": "confirmada", "paciente": { "...": "..." } }
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
| `horaFin` | `string` (`HH:MM`, 24 h) | No — si se omite, la cita dura una hora. |
| `motivo` | `string` | Sí |
| `estatus` | `string` | Sí |

```json
{ "id_paciente": 1, "fecha_cita": "2026-09-10T15:00:00.000Z", "horaFin": "10:30", "motivo": "Revisión", "estatus": "confirmada" }
```

- **Respuesta `201`:** objeto `Cita` creado (`id` generado por el backend).
- **Errores:** `422` si `horaFin` no tiene el formato `HH:MM`; `400` si no es posterior a la hora de inicio, o si el día está marcado como inactivo (ver [Días inactivos](#días-inactivos)); `404` si el paciente no existe o está inactivo; `409` si el médico ya tiene una cita registrada exactamente en ese horario.

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
- **Body:** idéntico al de `POST /citas` (`id_paciente`, `fecha_cita`, `horaFin`, `motivo`, `estatus`).
- **Respuesta `201`:** objeto `Cita` creado (su `id` se compone con el correo del médico de la URL).
- **Errores:** `422` o `400` por `horaFin`, igual que en `POST /citas`; `404` si el médico o el paciente no existen; `409` si ese médico ya tiene una cita en ese horario.

### `PUT /citas/medico/:correo/:id`

Actualiza una cita **del médico indicado en la URL**, no del usuario autenticado. Es la ruta con la que un asistente edita (o cambia el estatus de) una cita de la agenda que consulta.

- **Auth:** sí. **Rol:** cualquiera.
- **Headers:** `token: <jwt>`.
- **Params:** `correo` (`string`, mismo criterio de validación que arriba) e `id` (`string`, el id compuesto de la cita).
- **Body:** idéntico al de `PUT /citas/:id`.
- **Respuesta `200`:** objeto `Cita` actualizado.
- **Errores:** los de `PUT /citas/:id`; `404` si el médico no existe o la cita no pertenece a ese médico.

### `DELETE /citas/medico/:correo/:id`

Elimina **físicamente** una cita del médico indicado en la URL (la ruta con la que un asistente borra citas de la agenda que consulta).

- **Auth:** sí. **Rol:** cualquiera.
- **Headers:** `token: <jwt>`.
- **Params:** `correo` e `id`, como en la ruta anterior.
- **Respuesta `200`:** `{ "message": "Cita eliminada" }`.
- **Errores:** `404` si el médico no existe o la cita no pertenece a ese médico.

> Nota: `PUT /citas/:id` y `DELETE /citas/:id` siguen filtrando por el médico del token; un asistente debe usar las rutas `/citas/medico/:correo/:id` (en `/citas/:id` responderían `404`).

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
| `horaFin` | `string` (`HH:MM`, 24 h) | No — si se cambia `fecha_cita` sin enviarla, la cita conserva su duración. |
| `motivo` | `string` | No |
| `estatus` | `string` | No |

- **Respuesta `200`:** objeto `Cita` actualizado.
- **Errores:** `422` si `horaFin` no tiene el formato `HH:MM`; `400` si no queda después de la hora de inicio (la nueva, si también cambia `fecha_cita`), o si `fecha_cita` mueve la cita a **otro** día que está inactivo (una cita que ya estaba en un día inactivo se puede seguir editando ahí); `404` si la cita no existe o no pertenece al médico autenticado; `404` si el nuevo `id_paciente` no existe/está inactivo.

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

### Días inactivos

Fechas sueltas en que un médico no atiende (vacaciones, un congreso…), que él o un asistente marcan desde la agenda. `fecha` es el día `YYYY-MM-DD` en el reloj del **consultorio** (`ZONA_HORARIA`). Ese día `POST /citas` responde `400` y un `PUT` que **mueve** una cita hacia él también; las citas que ya estaban ahí se quedan y se pueden seguir editando. Los días que el consultorio cierra cada semana (domingo) no son días inactivos: solo los conoce el frontend.

| Método | Ruta | Respuesta `200` |
|---|---|---|
| `GET` | `/citas/dias-inactivos` | `string[]`: las fechas del médico del token, ordenadas. |
| `PUT` | `/citas/dias-inactivos/:fecha` | `{ "fecha": "2026-10-20", "inactivo": true }`. Idempotente: marcarlo dos veces no es un error. |
| `DELETE` | `/citas/dias-inactivos/:fecha` | `{ "fecha": "2026-10-20", "inactivo": false }`. Idempotente: si no estaba inactivo, no hace nada. |
| `GET` | `/citas/medico/:correo/dias-inactivos` | Igual, en la agenda de ese médico (un asistente). |
| `PUT` | `/citas/medico/:correo/dias-inactivos/:fecha` | Igual. |
| `DELETE` | `/citas/medico/:correo/dias-inactivos/:fecha` | Igual. |

- **Auth:** sí. **Rol:** cualquiera.
- **Headers:** `token: <jwt>`.
- **Errores:** `422` si `fecha` no tiene el formato `YYYY-MM-DD`; `400` si es un día que no existe (`2026-02-30`); `404` en las rutas `/medico/:correo` si el médico no existe o está inactivo.

---

## `/historial`

Historial clínico del paciente: un cuestionario de 10 preguntas con respuesta de texto libre. Cada paciente tiene **como máximo uno** (relación 1 -> 1). Todas las rutas requieren header `token` y sirven para cualquier rol. Para consultarlo se usa `GET /pacientes/:id` (`historialClinico`). No se puede borrar por separado: se elimina con el paciente cuando su registro se borra de la base.

### `POST /historial`

Crea el historial clínico de un paciente.

- **Auth:** sí.
- **Headers:** `token: <jwt>`.
- **Body:**

| Campo | Tipo | Requerido | Notas |
|---|---|---|---|
| `id_paciente` | `number` | Sí | Paciente activo. |
| `historial` | `object` | Sí | Respuestas `pregunta_1` … `pregunta_10`, cada una `string \| null` y opcional. Puede ir vacío (`{}`). |

> **Respuestas:** una pregunta omitida, en `null` o como `""` (o solo espacios) queda sin responder (`null`); los textos se guardan sin espacios al inicio ni al final. Las claves que no son del cuestionario se ignoran. Un valor que no sea `string` ni `null` responde `422`.

```json
{ "id_paciente": 1, "historial": { "pregunta_1": "No", "pregunta_3": "Penicilina" } }
```

- **Respuesta `201`:** objeto `HistorialClinico` con las 10 preguntas.
- **Errores:** `404` si el paciente no existe o está inactivo; `409` si el paciente ya tiene historial clínico.

### `PUT /historial`

Actualiza el historial clínico de un paciente. Actualización parcial por pregunta.

- **Auth:** sí.
- **Headers:** `token: <jwt>`.
- **Body:** mismos campos que `POST /historial`.

| En `historial` | Efecto |
|---|---|
| Pregunta omitida | No cambia. |
| `null`, `""` o solo espacios | Se borra la respuesta (queda `null`). |
| Texto | Reemplaza la respuesta. |

```json
{ "id_paciente": 1, "historial": { "pregunta_1": "Sí, diabetes", "pregunta_3": null } }
```

- **Respuesta `200`:** objeto `HistorialClinico` actualizado, con las 10 preguntas.
- **Errores:** `404` si el paciente no tiene historial clínico.

---

## `/ajustes`

Ajustes del usuario autenticado (médico o asistente): cada usuario tiene los suyos, iguales en todos sus dispositivos. Todas las rutas requieren header `token`.

### `GET /ajustes`

- **Auth:** sí. **Rol:** cualquiera.
- **Headers:** `token: <jwt>`.
- **Respuesta `200`:** objeto `Ajustes`. Si el usuario nunca los guardó, los valores por defecto:
```json
{ "autocompletarCitas": false, "horario": { "apertura": 10, "cierre": 20 }, "tamanoLetra": 100 }
```
- **Errores:** `401` sin token válido.

### `PUT /ajustes`

Guarda los ajustes del usuario. Un campo omitido no cambia.

- **Auth:** sí. **Rol:** cualquiera; `autocompletarCitas` solo `medico`.
- **Headers:** `token: <jwt>`.
- **Body:**

| Campo | Tipo | Requerido | Notas |
|---|---|---|---|
| `autocompletarCitas` | `boolean` | No | Solo un médico (un asistente recibe `403`). Activo: las citas `confirmada` cuya `fecha_cita` fue hace más de 24 h pasan a `completada`. Las de otro estatus no se tocan. |
| `horario` | `{ apertura: number, cierre: number }` | No | Va completo. Enteros de 0 a 23, `apertura <= cierre`. La última hora es un bloque completo: con `cierre: 20` se puede agendar hasta las 20:55. El backend no restringe las citas con él: lo usa el frontend para la agenda y el diálogo de cita. |
| `tamanoLetra` | `number` | No | Entero de 90 a 130, múltiplo de 5. |

```json
{ "horario": { "apertura": 8, "cierre": 18 }, "tamanoLetra": 115 }
```

- **Respuesta `200`:** `Ajustes` completos más `citasCompletadas`, las citas que se completaron al guardar (0 si la petición no activó el autocompletado):
```json
{ "autocompletarCitas": true, "horario": { "apertura": 8, "cierre": 18 }, "tamanoLetra": 115, "citasCompletadas": 0 }
```
- **Errores:** `401` sin token válido; `403` si un asistente manda `autocompletarCitas`; `400` si `horario.apertura` es posterior a `horario.cierre` (`"La hora de apertura no puede ser posterior a la de cierre"`); `422` si un campo no es válido (`"autocompletarCitas debe ser true o false"`, `"horario.cierre debe ser una hora entera de 0 a 23"`, `"tamanoLetra debe ser un entero de 90 a 130 en pasos de 5"`).

> Al activar el autocompletado (`autocompletarCitas: true`), el backend completa en ese momento **todas** las citas confirmadas vencidas del médico, también las antiguas; después lo repite al arrancar el servidor y cada hora. Desactivarlo no deshace nada. Guardar otro ajuste con el autocompletado ya activo no toca las citas.

---

## Ruta no encontrada

Cualquier ruta/método no definido responde:

- **Respuesta `404`:**
```json
{ "message": "Ruta no encontrada" }
```
