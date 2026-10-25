# Gestión de Interconsultas CESFAM

Sistema de gestión y trazabilidad de interconsultas entre atención primaria (CESFAM) y atención secundaria (hospitales). Permite registrar, validar, dar seguimiento y sincronizar derivaciones médicas, incluso sin conexión a internet.

Proyecto de Ingeniería de Software (PTEC105-8573, Universidad Andrés Bello).

## Integrantes

- Gabriel Hidalgo
- Manuel Macchiavello
# Gestión de Interconsultas CESFAM

Sistema de gestión y trazabilidad de interconsultas entre atención priundaria (hospitales). Permite registrar, validar, dar seguimiento ysincronizar derivaciones médicas, incluso sin conexión a internet.

Proyecto de Ingeniería de Software (PTEC105-8573, Universidad Andrés B

## Integrantes

- Gabriel Hidalgo
- Manuel Macchiavello
- Dhylan Pizarro

## Qué hace

**Registro y consulta**
- Registro de interconsultas con validación de datos obligatorios y de prioridad clínica (Alta/Media/Baja).
- Adjuntar antecedentes y fichas a la interconsulta.
- Listado con filtros, y detalle de cada interconsulta.
- Consulta y actualización de los datos de contacto del paciente, por el personal administrativo o por el propio paciente desde su perfil.

**Flujo de derivación**
- El especialista del hospital revisa su bandeja y acepta la interconsulta o la devuelve con un motivo.
- El CESFAM ve las interconsultas devueltas con su motivo y observaciones, las corrige y las reenvía.
- Edición de los datos administrativos de una interconsulta.
- Asignación de hora médica (fecha, hora y centro).
- Cierre con una causal oficial.
- Historial de estados (línea de tiempo) de cada interconsulta.

Estados: `Registrada` → `Tramitada` → `En lista de espera` → `Agendada` → `Finalizada`, y `Devuelta` cuando el especialista la devuelve.

**Notificaciones y alertas**
- Correo al paciente en cada cambio de estado y al asignarle hora médica. Los correos nunca incluyen datos clínicos, solo el número de caso y la etapa.
- Correo al CESFAM de origen cuando el especialista acepta o devuelve.
- Centro de alertas con contador de interconsultas devueltas pendientes de revisar.

**Trabajo sin conexión**
- Los registros se guardan localmente (IndexedDB) cuando no hay red y se muestran como pendientes.
- Al reconectar se sincronizan solos. La sincronización es idempotente (`uuidLocal`), así que un reintento no duplica registros.

**Seguridad y roles**
- Inicio de sesión con JWT y contraseñas con hash (bcrypt).
- Control de acceso por rol: 1 administrativo CESFAM, 2 especialista dtor de roles (asigna roles a los usuarios).

## Arquitectura y tecnologías

Monolítico modular.

| Capa | Tecnología |
|------|------------|
| Backend | Python 3.11, FastAPI (`DATA/main.py`, `DATA/servicios.py`) |
| Base de datos | MySQL |
| Frontend | React + Vite, PWA con Service Worker e IndexedDB |
| Autenticación | JWT |
| Correo | SMTP |
| Pruebas | pytest (backend), Vitest + React Testing Library (frontend) |
| Despliegue | API en Railway (`Procfile`) |

La migración del esquema se aplica sola al arrancar la API (`AUTO_MIGRciones/001_sprint3.sql`).

## Organización del repositorio

- `DATA/`: API FastAPI, servicios, migraciones, colección Postman y pruebas (`DATA/tests`).
- `frontend/`: interfaz React. Páginas en `src/pages`, componentes en `src/components`, modo sin conexión en `src/offline` y Service Worker en `public/sw.js`.
- `docs/`: guías y scripts de prueba con MySQL y modo sin conexión.
- `backend/`: servidor Express antiguo, ya no se usa.

## Cómo ejecutarlo

### Backend

Requiere Python 3.11 (pydantic 2.9.2 no tiene wheel para 3.13 en Windows).

```bash
py -3.11 -m venv .venv
.venv/Scripts/activate        # PowerShell: .venv\Scripts\Activate.ps1
pip install -r requirements-dev.txt
uvicorn DATA.main:app --reload
```

El código no lee archivos `.env`: las variables van como variables de entorno de la terminal o de Railway. `DATA/.env.example` lista cuáles son.

| Variable | Para qué |
|----------|----------|
| `MYSQLHOST`, `MYSQLPORT`, `MYSQLDATABASE`, `MYSQLUSER`, `MYSQLPASSWORD` | Conexión a MySQL (Railway las inyecta solas) |
| `JWT_SECRET` | Firma de los tokens |
| `AUTO_MIGRAR` | `1` aplica la migración al arrancar, `0` la desactiva |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM`,ío real de correos |
| `CESFAM_CORREO_DEFAULT` | Correo de respaldo cuando un CESFAM no tiene uno registrado |

Si `SMTP_HOST` está vacío los correos se simulan: no salen, pero quedan registrados en la tabla `notificacion_correo`.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

El Service Worker solo se registra en la versión compilada. Para proba

```bash
npm run build && npm run preview
```

y en DevTools > Network marcar Offline.

## Endpoints principales

| Área | Endpoints |
|------|-----------|
| Acceso | `POST /login`, `POST /persona`, `GET /persona`, `GET /rol`, `POST /acceso`, `DELETE /acceso/...` |
| Catálogos | `GET /region`, `/comuna/{region}`, `/hospital/{comuna}`, `/cesfam/{comuna}`, `/especialidad` |
| Interconsultas | `POST /formulario`, `GET /formulario/{id}`, `GET /formulario/filtrar`, `PATCH /formulario/{id}/administrativo` |
| Documentos | `POST` y `GET /formulario/{id}/documentos`, `GET /documentos/{id}` |
| Contacto | `GET` y `PATCH /contactos/{persona}`, `GET` y `PUT /perso
| Revisión del especialista | `GET /especialista/bandeja`, `POST /formulario/{id}/revision` |
| Devoluciones | `GET /formulario/{id}/devolucion`, `POST /formulario//devoluciones`, `POST /alertas/devoluciones/revisar` |
| Seguimiento | `GET /formulario/{id}/historial`, `POST /formulario/{id}/cita`, `POST /formulario/{id}/cierre`, `GET /formulario/{id}/notificaciones` |
| Sin conexión | `POST /sincronizar` |

## Pruebas

```bash
python -m pytest DATA/tests          # backend: 72 pruebas
cd frontend && npm test              # frontend: 63 pruebas
cd frontend && npm run lint
```

Además, `docs/` incluye un script que prueba el flujo completo contra ba el modo sin conexión en Chrome.

## Despliegue

La API corre en Railway con el `Procfile`:

```
web: uvicorn DATA.main:app --host 0.0.0.0 --port $PORT
```

Las variables de MySQL las inyecta Railway. Las de SMTP se configuran en el panel del servicio. El envío real de correos se verificó funcionando en Railway.

## Seguimiento del proyecto

El tablero está en Taiga: «Gestión de listas de espera en atención primaria».
