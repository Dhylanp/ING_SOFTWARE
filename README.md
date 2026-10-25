# gestion_interconsultas_cesfam

Sistema de gestión y trazabilidad de interconsultas entre atención primaria (CESFAM) y atención secundaria (hospitales). Permite registrar, validar, dar seguimiento y sincronizar derivaciones médicas, incluso sin conexión a internet.

Proyecto de Ingeniería de Software (PTEC105-8573, UNAB).

## Integrantes

- Gabriel Hidalgo
- Manuel Macchiavello
- Dhylan Pizarro

## Estado del proyecto (Sprint 3, cerrado el 21/10/2026)

Se completaron las 11 historias de usuario del Sprint 3 (HU03, HU05A, HU05B, HU07, HU09, HU15, HU16, HU17, HU19, HU21 y HU23). Todo está integrado en `develop` (PR #58).

| HU | Qué resuelve |
|----|--------------|
| HU03 | Editar datos administrativos de una interconsulta |
| HU05A | Ver el motivo de devolución |
| HU05B | Corregir y reenviar una interconsulta devuelta |
| HU07 | Historial de estados (línea de tiempo) |
| HU09 | Cierre con causal oficial |
| HU15 | Correo al paciente por cada cambio de estado (sin datos clínicos) |
| HU16 | Alertas de interconsultas devueltas |
| HU17 | Asignar hora médica y avisar al paciente |
| HU19 | Registro sin conexión (IndexedDB + Service Worker) |
| HU21 | Sincronización automática al reconectar (idempotente por `uuidLocal`) |
| HU23 | Bandeja del especialista: aceptar o devolver con motivo |

Estados de una interconsulta: `Registrada` → `Tramitada` → `En lista de espera` → `Agendada` → `Finalizada`, y `Devuelta` cuando el especialista la devuelve.

Roles: 1 administrativo CESFAM, 2 especialista de hospital, 3 paciente, 4 gestor de roles.

## Arquitectura y tecnologías

Monolítico modular.

- **Backend:** Python 3.11 + FastAPI (`DATA/main.py`, `DATA/servicios.py`), autenticación con JWT.
- **Base de datos:** MySQL. La migración del Sprint 3 se aplica sola al arrancar la API (`AUTO_MIGRAR=1`, equivale a `DATA/migraciones/001_sprint3.sql`).
- **Frontend:** React + Vite, PWA con Service Worker e IndexedDB para el modo sin conexión.
- **Correo:** SMTP (`enviar_correo` en `DATA/servicios.py`). Con `SMTP_HOST` vacío los correos se simulan y quedan en la tabla `notificacion_correo`. El envío real se verificó el 21/10/2026 en el despliegue de Railway.
- **Despliegue:** API en Railway (`Procfile`: `uvicorn DATA.main:app`).
- `backend/` contiene un servidor Express antiguo que ya no se usa.

## Organización del repositorio

- `DATA/`: API FastAPI, servicios, migraciones, colección Postman y pruebas (`DATA/tests`).
- `frontend/`: interfaz React (páginas, componentes, `offline/` y `public/sw.js`).
- `docs/sprint3/`: guía del Sprint 3 y scripts de prueba con MySQL y modo sin conexión.
- `HANDOFF.md`: traspaso del trabajo del Sprint 3.

## Cómo ejecutarlo

Backend (Python 3.11; pydantic 2.9.2 no tiene wheel para 3.13 en Windows):

```bash
py -3.11 -m venv .venv
.venv/Scripts/activate
pip install -r requirements-dev.txt
# configurar variables a partir de DATA/.env.example (el código NO lee .env: van como variables de entorno)
uvicorn DATA.main:app --reload
```

Variables principales: `MYSQLHOST`, `MYSQLPORT`, `MYSQLDATABASE`, `MYSQLUSER`, `MYSQLPASSWORD`, `JWT_SECRET`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM`, `CESFAM_CORREO_DEFAULT`.

Frontend:

```bash
cd frontend
npm install
npm run dev
```

El Service Worker solo se registra en la versión compilada: para probar el modo sin conexión usar `npm run build && npm run preview`.

## Pruebas

Verificadas el 21/10/2026 sobre `develop` (commit `1430f82`):

- Backend: `python -m pytest DATA/tests`, 72 pruebas aprobadas.
- Frontend: `cd frontend && npm test`, 63 pruebas aprobadas (Vitest + React Testing Library).
- HU13 y HU14 solo tienen prueba manual.

## Seguimiento

Tablero en Taiga: proyecto «Gestión de listas de espera en atención primaria». Las minutas de las dailys, el DoD, las retrospectivas y la matriz de trazabilidad están en los documentos del Sprint.
