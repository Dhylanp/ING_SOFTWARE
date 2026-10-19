# Guía de implementación – Sprint 3 (Interconsultas CESFAM)

Esta guía explica **todo lo que se construyó en el Sprint 3**, **para qué sirve**, **qué HU resuelve**, y
**cómo subirlo a GitHub por partes** (un commit por bloque, sin un push gigante). También indica
**cómo correr las pruebas** y **de dónde sacar la evidencia** para la demo.

Contenido:

1. [Resumen de lo que se hizo](#1-resumen)
2. [Preparar el entorno (una sola vez)](#2-preparar-el-entorno)
3. [Cómo integrar en GitHub paso a paso (14 commits)](#3-integración-en-github-paso-a-paso)
4. [Cómo funciona cada cosa (backend)](#4-cómo-funciona-el-backend)
5. [Cómo funciona cada cosa (frontend)](#5-cómo-funciona-el-frontend)
6. [Inventario completo de pruebas](#6-inventario-completo-de-pruebas)
7. [Cómo demostrar cada HU](#7-cómo-demostrar-cada-hu)
8. [Tabla HU ↔ criterio ↔ evidencia](#8-tabla-hu--criterio--evidencia)
9. [Base de datos](#9-base-de-datos)
10. [Pendientes / sin verificar](#10-pendientes--sin-verificar)

---

## 1. Resumen

| HU | Qué resuelve | Backend | Frontend |
|----|--------------|---------|----------|
| HU03 | Editar datos administrativos de una interconsulta (prioridad, hospital, especialidad, descripción) | `PATCH /formulario/{id}/administrativo` | `EditarInterconsulta` (modo editar), botón "Editar" en tabla y detalle |
| HU05A | Ver el motivo por el que el especialista devolvió una interconsulta | `GET /formulario/{id}/devolucion` | `InterconsultasDevueltas`, bloque de devolución en `DetalleInterconsulta` |
| HU05B | Corregir y reenviar una interconsulta devuelta | `POST /formulario/{id}/reenviar` | `EditarInterconsulta` (modo corregir) |
| HU07 | Ver el historial de estados (línea de tiempo) | `GET /formulario/{id}/historial` + tabla `formulario_historial` | `LineaTiempo`, `EstadoBadge`, `DetalleInterconsulta` |
| HU09 | Cerrar una interconsulta con causal oficial | `POST /formulario/{id}/cierre` | `ModalCierre` |
| HU15 | Notificar por correo cada cambio de estado (sin datos clínicos) | `notifica_cambio_estado` + tabla `notificacion_correo` + `GET /formulario/{id}/notificaciones` | — (es automático) |
| HU16 | Alertas de interconsultas devueltas para el CESFAM | `GET /alertas/devoluciones`, `POST /alertas/devoluciones/revisar` | `AlertaContador`, `CentroAlertas` |
| HU17 | Asignar hora médica (fecha, hora, centro) y avisar al paciente | `POST /formulario/{id}/cita` | `ModalCita` |
| HU19 | Registrar interconsultas sin conexión | — | IndexedDB (`offline/almacen.js`), `RegistrarInterconsulta`, `PendientesLocales`, Service Worker |
| HU21 | Sincronizar automáticamente lo registrado sin conexión | `POST /sincronizar` (idempotente por `uuidLocal`) | `offline/sync.js`, `useSincronizacion`, `EstadoConexion` |
| HU23 | Bandeja del especialista: aceptar o devolver con motivo | `GET /especialista/bandeja`, `POST /formulario/{id}/revision` | `BandejaEspecialista`, `ModalDevolucion` |

**Estados de una interconsulta** (tabla `estados`):
`1 Registrada` → `4 Tramitada` (enviada/reenviada) → `2 En lista de espera` (aceptada) → `5 Agendada` → `6 Finalizada`;
y `3 Devuelta` cuando el especialista la devuelve.

**Roles**: `1` Administrativo CESFAM, `2` Especialista (hospital), `3` Paciente, `4` Gestor de roles.

**Números finales verificados**: 72 pruebas backend (pytest) y 61 pruebas frontend (vitest), todas en verde.
`npm run lint` limpio y `npm run build` OK. El flujo completo también se probó contra **MySQL 9.7 (misma versión que Railway) con la estructura idéntica a producción**
(ver sección 7.3).

---

## 2. Preparar el entorno

### 2.1 Backend (Python 3.11)

> pydantic 2.9.2 no tiene wheel para Python 3.13/3.14 en Windows: usar **3.11**.

```bash
# desde la raíz del repo
py -3.11 -m venv .venv
.venv/Scripts/activate          # en PowerShell: .venv\Scripts\Activate.ps1
pip install -r requirements-dev.txt
```

Variables de entorno: copiar `DATA/.env.example` y completar (nunca subir el `.env` real):

| Variable | Para qué |
|----------|----------|
| `MYSQLHOST`, `MYSQLPORT`, `MYSQLDATABASE`, `MYSQLUSER`, `MYSQLPASSWORD` | Conexión a MySQL (Railway las inyecta solas) |
| `JWT_SECRET` | Firma de tokens |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM`, `SMTP_TLS`, `SMTP_SSL` | Envío real de correos (HU15). **Si `SMTP_HOST` está vacío el envío se simula** y solo queda registrado en la bitácora |
| `CESFAM_CORREO_DEFAULT` | Correo de respaldo si el CESFAM no tiene `cesfam.correo` |

Levantar la API en local:

```bash
uvicorn DATA.main:app --reload --port 8000
# documentación interactiva: http://127.0.0.1:8000/docs
```

### 2.2 Frontend (React 19 + Vite)

```bash
cd frontend
npm install --include=dev   # --include=dev es necesario si tu máquina tiene NODE_ENV=production
npm run dev                 # http://localhost:5173
```

Para apuntar a una API local: crear `frontend/.env.local` con `VITE_API_URL=http://127.0.0.1:8000`.
Sin esa variable usa la API de Railway.

---

## 3. Integración en GitHub paso a paso

### 3.0 Preparación (una vez)

```bash
cd ~/ING_SOFTWARE                    # tu clon del repo
git checkout develop && git pull
git checkout -b feature/sprint3      # o una rama por HU si el equipo lo prefiere
git config core.autocrlf true        # ya lo tienes así; evita diffs falsos por saltos de línea

# Descomprime el zip en otra carpeta y apunta SRC a la carpeta del proyecto descomprimido
SRC="/c/ruta/donde/descomprimiste/ING_SOFTWARE-develop"

# Función de ayuda: copia archivos desde el zip manteniendo las carpetas
trae() { for f in "$@"; do mkdir -p "$(dirname "$f")"; cp "$SRC/$f" "$f"; done; }
```

> **Importante**: copia **solo** los archivos listados en cada paso. En el zip hay archivos que difieren
> de `develop` únicamente por saltos de línea (CRLF): `backend/*`, YAML de Postman, `.gitignore`,
> `icons.svg`, READMEs, `Tema.jsx`, `EditarPerfil.jsx`, `requirements.txt`. **No los copies**: no tienen cambios reales.
>
> Después de cada `trae ...` revisa con `git status` y `git diff --stat` que solo aparezcan los archivos del paso.
> Antes de cada commit corre la verificación indicada: así cada commit queda "en verde".

> **Probado**: se simularon los 14 commits sobre una copia limpia de `develop`. Cada uno compila (`npm run build`) y sus pruebas pasan
> (backend 22 → 72; frontend 12 → 19 → 27 → 32 → 37 → 48 → 53 → 61). El estado final es idéntico al del zip.

El orden está pensado para que **ningún commit rompa el build**: primero lo que es importado, después
lo que importa. Las páginas nuevas no son visibles hasta el commit 13 (rutas en `App.jsx`).

---

### Commit 1 — Configuración backend y dependencias de pruebas

```bash
trae requirements-dev.txt DATA/.env.example DATA/__init__.py
git add requirements-dev.txt DATA/.env.example DATA/__init__.py
git commit -m "chore(backend): dependencias de pruebas y variables de entorno de ejemplo"
```

| Archivo | Qué es / para qué |
|---------|-------------------|
| `requirements-dev.txt` | Incluye `requirements.txt` + `pytest` y `httpx` (cliente de pruebas de FastAPI) |
| `DATA/.env.example` | Plantilla de todas las variables (MySQL, JWT, SMTP, correo respaldo CESFAM). Sin secretos |
| `DATA/__init__.py` | Convierte `DATA` en paquete para poder hacer `from DATA.main import app` en pruebas y `uvicorn DATA.main:app` |

Verificación: `pip install -r requirements-dev.txt` termina sin errores.

---

### Commit 2 — Reglas de negocio puras (`servicios.py`) — HU09, HU15, HU17, HU23

```bash
trae DATA/servicios.py DATA/tests/__init__.py DATA/tests/test_servicios.py
git add DATA/servicios.py DATA/tests/__init__.py DATA/tests/test_servicios.py
git commit -m "feat(backend): reglas de transición de estados, causales de cierre y plantillas de correo"
```

| Archivo | Qué es / para qué |
|---------|-------------------|
| `DATA/servicios.py` | Lógica **sin base de datos**, fácil de probar: tabla de transiciones permitidas (qué acción se puede hacer desde qué estado), `CAUSALES_CIERRE` oficiales (Atendido, Inasistencia, Rechazo, Fallecimiento, Retiro voluntario) con normalización de mayúsculas, combinación fecha+hora de cita, plantillas de correo **una por etapa** (sin datos clínicos) y `envia_correo` (SMTP real, simulado o fallo controlado) |
| `DATA/tests/test_servicios.py` | 22 pruebas unitarias (ver sección 6) |

Verificación: `python -m pytest DATA/tests/test_servicios.py -q` → **22 passed**.

---

### Commit 3 — API del Sprint 3 — HU03, 05A, 05B, 07, 09, 15, 16, 17, 21, 23

```bash
trae DATA/main.py DATA/tests/test_flujo.py
git add DATA/main.py DATA/tests/test_flujo.py
git commit -m "feat(api): endpoints Sprint 3 (revisión, devolución, reenvío, historial, cita, cierre, alertas, sincronización, notificaciones)"
```

> `DATA/main.py` es un solo archivo con todos los endpoints. Si el equipo exige **un commit por HU** en el backend,
> usa `git add -p DATA/main.py` para elegir los bloques de cada HU (cada bloque está separado por un encabezado de comentario
> `# HU05A: ...`, `# HU23: ...`, etc.). Lo más seguro es un único commit, porque los endpoints comparten helpers
> (`_cambia_estado`, `registra_historial`, `notifica_cambio_estado`, `_verifica_alcance`).

| Archivo | Qué es / para qué |
|---------|-------------------|
| `DATA/main.py` | Todos los endpoints nuevos (sección 4) + `POST /formulario` ahora guarda historial y notifica |
| `DATA/tests/test_flujo.py` | 50 pruebas de los endpoints con una base de datos falsa en memoria (no necesita MySQL) |

Verificación: `python -m pytest DATA/tests -q` → **72 passed**.

---

### Commit 4 — Infraestructura de pruebas frontend + capa offline base — HU19, HU21

```bash
trae frontend/package.json frontend/package-lock.json frontend/vite.config.js \
     frontend/src/setupTests.js frontend/src/test/utils.jsx \
     frontend/src/api/axios.js frontend/src/context/AuthContext.jsx \
     frontend/src/offline/almacen.js frontend/src/offline/almacen.test.js \
     frontend/src/offline/catalogos.js frontend/src/offline/catalogos.test.js \
     frontend/src/offline/sync.js frontend/src/offline/sync.test.js

# `trae` usa rutas desde la raíz del repo: ejecuta todo desde ahí
cd frontend && npm install --include=dev && npm test && cd ..
git add frontend/package.json frontend/package-lock.json frontend/vite.config.js frontend/src/setupTests.js \
        frontend/src/test frontend/src/api/axios.js frontend/src/context/AuthContext.jsx frontend/src/offline
git commit -m "test(frontend): vitest + testing-library y capa offline (IndexedDB, caché de catálogos, sincronización)"
```

Por qué van juntos: `test/utils.jsx` y `AuthContext.jsx` importan `offline/almacen.js` y `offline/catalogos.js`.

| Archivo | Qué es / para qué |
|---------|-------------------|
| `package.json` / `package-lock.json` | Scripts `npm test` (`vitest run`) y `npm run test:watch`; devDependencies: `vitest`, `jsdom`, `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event`, `fake-indexeddb` |
| `vite.config.js` | Bloque `test`: entorno `jsdom`, `setupFiles`, y `NODE_ENV=test` (necesario para que React exporte `act`) |
| `src/setupTests.js` | Carga `jest-dom`, `fake-indexeddb` y limpia el DOM después de cada prueba |
| `src/test/utils.jsx` | Ayudas compartidas: `renderPagina` (router + sesión falsa), `mockApi` (simula axios por "MÉTODO /ruta"), `errorHttp`, `errorDeRed`, `borrarAlmacenLocal`, usuarios `USUARIO_ADMIN` / `USUARIO_ESPECIALISTA` |
| `src/api/axios.js` | Exporta `API_URL` y permite cambiarla con `VITE_API_URL` (para usar API local) |
| `src/context/AuthContext.jsx` | Al cerrar sesión borra la caché de catálogos y el token guardado en IndexedDB (no dejar datos en equipos compartidos). Se quitó un `useEffect` duplicado |
| `src/offline/almacen.js` | **HU19**: guarda en IndexedDB las interconsultas registradas sin conexión (con un `uuidLocal` único) y el token para el Service Worker |
| `src/offline/catalogos.js` | `getConCache`: pide catálogos (especialidades, hospitales…) y los guarda en `localStorage` (`cat:`) para usarlos sin conexión |
| `src/offline/sync.js` | **HU21**: envía los pendientes a `POST /sincronizar`, borra los confirmados, conserva los fallidos y emite el evento `EVENTO_SYNC` para refrescar pantallas |

Verificación: `npm test` → 12 pruebas (almacen 3, catalogos 4, sync 5).

---

### Commit 5 — Arreglos de lint

```bash
trae frontend/eslint.config.js frontend/src/pages/GestorRoles.jsx frontend/src/pages/SignUp.jsx \
     frontend/src/components/UserWidget.jsx frontend/src/pages/Login.jsx \
     frontend/src/components/BotonContacto.jsx frontend/src/components/LoadingOverlay.jsx \
     frontend/src/pages/FichaPaciente.jsx
git add frontend/eslint.config.js frontend/src/pages/GestorRoles.jsx frontend/src/pages/SignUp.jsx \
        frontend/src/components/UserWidget.jsx frontend/src/pages/Login.jsx \
        frontend/src/components/BotonContacto.jsx frontend/src/components/LoadingOverlay.jsx \
        frontend/src/pages/FichaPaciente.jsx
git commit -m "chore(frontend): corrige errores de eslint y configura globals de pruebas y service worker"
```

`develop` tenía 20 errores de lint (variables sin usar, dependencias de hooks, `catch` sin uso). `eslint.config.js`
permite exportar `useAuth`/`getNombreRol`/`getDescripcionRol` junto a componentes (regla `react-refresh`) y desactiva
esa regla en utilidades y archivos de prueba.

Verificación: `cd frontend && npm run lint` → queda **1 solo error** (`nombresEstado` sin usar en `TablaInterconsultas.jsx`,
que ya venía de `develop`). Se corrige en el commit 7, porque ese archivo pasa a usar `EstadoBadge`. Desde el commit 7 el lint queda limpio.

---

### Commit 6 — Utilidades compartidas (estados, fechas, avisos) + estilos

```bash
trae frontend/src/lib/estados.js frontend/src/lib/estados.test.js frontend/src/lib/fechas.js \
     frontend/src/lib/fechas.test.js frontend/src/lib/avisos.js frontend/src/index.css
git add frontend/src/lib frontend/src/index.css
git commit -m "feat(frontend): catálogo de estados, formato de fechas y avisos reutilizables"
```

| Archivo | Para qué |
|---------|----------|
| `lib/estados.js` | Única fuente de los 6 estados (id, nombre, color) y `CAUSALES_CIERRE`. Evita repetir números mágicos |
| `lib/fechas.js` | Formatea fechas/horas en formato chileno y maneja fechas UTC del backend |
| `lib/avisos.js` | Envuelve SweetAlert (`exito`, `error`, `confirmar`). En pruebas se espía con `vi.spyOn(avisos, ...)` |
| `index.css` | Clase `.btn-secundario` y `:focus-visible` (foco visible para teclado, accesibilidad) |

Verificación: `npm test` → +7 pruebas.

---

### Commit 7 — Componentes base + tabla con estados — HU07

```bash
trae frontend/src/components/EstadoBadge.jsx frontend/src/components/EstadoBadge.test.jsx \
     frontend/src/components/Modal.jsx \
     frontend/src/components/LineaTiempo.jsx frontend/src/components/LineaTiempo.test.jsx \
     frontend/src/components/TablaInterconsultas.jsx
git add frontend/src/components/EstadoBadge.jsx frontend/src/components/EstadoBadge.test.jsx \
        frontend/src/components/Modal.jsx frontend/src/components/LineaTiempo.jsx \
        frontend/src/components/LineaTiempo.test.jsx frontend/src/components/TablaInterconsultas.jsx
git commit -m "feat(frontend): badge de estado, modal accesible y línea de tiempo (HU07)"
```

| Archivo | Para qué |
|---------|----------|
| `EstadoBadge.jsx` | Etiqueta de color con el nombre del estado |
| `Modal.jsx` | Diálogo accesible (`role="dialog"`, `aria-modal`, cierra con Esc, foco inicial). Lo usan los modales de cierre, cita y devolución |
| `LineaTiempo.jsx` | **HU07**: lista cronológica de cambios de estado con fecha, responsable y observación |
| `TablaInterconsultas.jsx` | Usa `EstadoBadge`; filtra por el hospital (especialista) o CESFAM (administrativo) del usuario; enlace "Editar" para rol 1 si no está finalizada; prop `refresco` para recargar después de sincronizar |

---

### Commit 8 — Bandeja del especialista — HU23

```bash
trae frontend/src/components/ModalDevolucion.jsx frontend/src/components/ModalDevolucion.test.jsx \
     frontend/src/pages/BandejaEspecialista.jsx frontend/src/pages/BandejaEspecialista.test.jsx
git add frontend/src/components/ModalDevolucion.* frontend/src/pages/BandejaEspecialista.*
git commit -m "feat(HU23): bandeja del especialista para aceptar o devolver interconsultas"
```

- `BandejaEspecialista`: lista las interconsultas pendientes (Registrada/Tramitada) del hospital del especialista,
  ordenadas por prioridad. Botones **Aceptar** (pide confirmación) y **Devolver**.
- `ModalDevolucion`: exige el **motivo** (obligatorio, máx. 300) y permite observaciones (máx. 500).

---

### Commit 9 — Devueltas, edición y reenvío — HU05A, HU05B, HU03

```bash
trae frontend/src/pages/InterconsultasDevueltas.jsx frontend/src/pages/InterconsultasDevueltas.test.jsx \
     frontend/src/pages/EditarInterconsulta.jsx frontend/src/pages/EditarInterconsulta.test.jsx
git add frontend/src/pages/InterconsultasDevueltas.* frontend/src/pages/EditarInterconsulta.*
git commit -m "feat(HU03,HU05A,HU05B): ver devueltas con su motivo, editar datos administrativos y reenviar"
```

- `InterconsultasDevueltas` (**HU05A**): lista las devueltas del CESFAM con motivo y observaciones, y botón "Corregir".
- `EditarInterconsulta` tiene dos modos:
  - `modo="editar"` (**HU03**): solo campos administrativos; envía **solo lo que cambió** con `PATCH`; si nada cambió,
    avisa y no llama a la API; si está Finalizada, bloquea la edición.
  - `modo="corregir"` (**HU05B**): muestra el motivo de devolución arriba y reenvía con `POST /reenviar` (pasa a Tramitada).

---

### Commit 10 — Detalle con historial, cita y cierre — HU07, HU09, HU17

```bash
trae frontend/src/components/ModalCierre.jsx frontend/src/components/ModalCierre.test.jsx \
     frontend/src/components/ModalCita.jsx frontend/src/components/ModalCita.test.jsx \
     frontend/src/pages/DetalleInterconsulta.jsx frontend/src/pages/DetalleInterconsulta.test.jsx
git add frontend/src/components/ModalCierre.* frontend/src/components/ModalCita.* frontend/src/pages/DetalleInterconsulta.*
git commit -m "feat(HU07,HU09,HU17): historial en el detalle, asignación de hora y cierre con causal"
```

- `DetalleInterconsulta`: muestra datos, línea de tiempo (HU07), bloque de devolución si corresponde, y **acciones
  según rol y estado** (editar, corregir, asignar hora, cerrar). Finalizada = sin acciones.
- `ModalCita` (**HU17**): fecha (no pasada), hora y centro opcional (si se omite, el backend usa el hospital).
- `ModalCierre` (**HU09**): obliga a elegir una de las causales oficiales.

---

### Commit 11 — Alertas de devolución — HU16

```bash
trae frontend/src/components/AlertaContador.jsx frontend/src/components/AlertaContador.test.jsx \
     frontend/src/pages/CentroAlertas.jsx frontend/src/pages/CentroAlertas.test.jsx
git add frontend/src/components/AlertaContador.* frontend/src/pages/CentroAlertas.*
git commit -m "feat(HU16): contador y centro de alertas de interconsultas devueltas"
```

- `AlertaContador`: globo en el menú con la cantidad de devoluciones nuevas (si no hay nuevas, el total pendiente); sin conexión el enlace sigue disponible.
- `CentroAlertas`: lista las alertas; al abrirla se marcan como revisadas (`POST /alertas/devoluciones/revisar`).

---

### Commit 12 — Registro y sincronización sin conexión — HU19, HU21

```bash
trae frontend/src/hooks/useConexion.js frontend/src/hooks/useRegistrosLocales.js frontend/src/hooks/useSincronizacion.js \
     frontend/src/components/PendientesLocales.jsx frontend/src/components/PendientesLocales.test.jsx \
     frontend/src/components/EstadoConexion.jsx \
     frontend/src/pages/RegistrarInterconsulta.jsx frontend/src/pages/RegistrarInterconsulta.test.jsx \
     frontend/src/pages/ListadoInterconsultas.jsx frontend/src/pages/ListadoInterconsultas.test.jsx \
     frontend/public/sw.js frontend/public/manifest.webmanifest frontend/src/main.jsx frontend/index.html
git add frontend/src/hooks frontend/src/components/PendientesLocales.* frontend/src/components/EstadoConexion.jsx \
        frontend/src/pages/RegistrarInterconsulta.* frontend/src/pages/ListadoInterconsultas.* \
        frontend/public/sw.js frontend/public/manifest.webmanifest frontend/src/main.jsx frontend/index.html
git commit -m "feat(HU19,HU21): registro offline en IndexedDB, service worker y sincronización automática"
```

| Archivo | Para qué |
|---------|----------|
| `hooks/useConexion.js` | Devuelve `true/false` según `navigator.onLine` y escucha los eventos `online`/`offline` |
| `hooks/useRegistrosLocales.js` | Lista reactiva de lo pendiente en IndexedDB |
| `hooks/useSincronizacion.js` | Al volver la conexión (o al iniciar sesión) llama a `sincroniza()` automáticamente |
| `components/EstadoConexion.jsx` | Barra que avisa "Sin conexión" o "N pendientes de sincronizar" (con `aria-live`) |
| `components/PendientesLocales.jsx` | Tabla de pendientes locales con botón "Sincronizar ahora" y descartar |
| `pages/RegistrarInterconsulta.jsx` | Si no hay conexión (o falla la red) **guarda en IndexedDB** en vez de perder el formulario; los catálogos salen de la caché |
| `pages/ListadoInterconsultas.jsx` | Usa estados de `lib/estados`, catálogos con caché, muestra `PendientesLocales` y se refresca con `EVENTO_SYNC` |
| `public/sw.js` | Service Worker: guarda la aplicación (cache `interconsultas-shell-v1`) para abrirla sin internet y hace *background sync* |
| `public/manifest.webmanifest` + `index.html` | Hace instalable la app (PWA); `lang="es"`, título y `theme-color` |
| `src/main.jsx` | Registra el Service Worker **solo en producción** (en `npm run dev` no se activa) |

---

### Commit 13 — Rutas y menú (hace visible todo lo anterior)

```bash
trae frontend/src/App.jsx frontend/src/pages/Interconsultas.jsx
git add frontend/src/App.jsx frontend/src/pages/Interconsultas.jsx
git commit -m "feat(frontend): rutas y menú para bandeja, devueltas, edición, alertas y estado de conexión"
```

Rutas nuevas (`App.jsx`):

| Ruta | Rol | Pantalla |
|------|-----|----------|
| `/especialista/bandeja` | 2 | BandejaEspecialista (HU23) |
| `/interconsultas/devueltas` | 1 | InterconsultasDevueltas (HU05A) |
| `/interconsultas/:id/editar` | 1 | EditarInterconsulta modo editar (HU03) |
| `/interconsultas/:id/corregir` | 1 | EditarInterconsulta modo corregir (HU05B) |
| `/alertas` | 1 | CentroAlertas (HU16) |

Además monta `useSincronizacion()` y `<EstadoConexion />` cuando hay sesión. `Interconsultas.jsx` agrega
los accesos del menú (bandeja para rol 2; devueltas + contador de alertas para rol 1).

Verificación final del frontend: `npm run lint && npm test && npm run build` → 61 pruebas en verde.

---

### Commit 14 — Documentación

```bash
trae HANDOFF.md docs/sprint3/GUIA_SPRINT3.md docs/sprint3/esquema_base_prueba.sql docs/sprint3/prueba_flujo_mysql.py \
     docs/sprint3/prueba_offline_chrome.mjs
git add HANDOFF.md docs/sprint3
git commit -m "docs(sprint3): guía de implementación, scripts de prueba con MySQL y handoff"
```

### 3.15 Subir y abrir el Pull Request

```bash
git push -u origin feature/sprint3
```

En GitHub abre un PR `feature/sprint3 → develop`. En la descripción puedes pegar la tabla de la sección 8.
Si prefieres **un PR por HU**: crea una rama por grupo de commits (`feature/HU23_bandeja`, `feature/HU16_alertas`, …)
siguiendo el mismo orden; los commits 1–7 son la base y deben mergearse primero.

---

## 4. Cómo funciona el backend

### 4.1 Seguridad y alcance

- Todos los endpoints nuevos usan `requiere_rol(...)` (JWT). Rol fuera de la lista → **403**.
- `_ids_centro` lee la tabla `acceso` (solo filas con `Activo='S'`) para saber a qué CESFAM/hospital pertenece la persona.
  `_verifica_alcance` impide ver o tocar interconsultas de **otro** CESFAM/hospital (→ 403). El paciente solo ve las suyas.
- Los modelos Pydantic validan la entrada (largos máximos, `extra="forbid"` en la edición administrativa → 422 si mandan
  campos no permitidos como paciente, fecha o estado).

### 4.2 Cambios de estado seguros (`_cambia_estado`)

1. `servicios.py` verifica que la acción esté permitida desde el estado actual (p. ej. solo se agenda desde "En lista de espera").
2. `UPDATE ... WHERE idEstado = <estado leído>`: si otra persona cambió el estado entre medio, no se actualiza nada y
   se responde **409** (concurrencia optimista: no se pisan cambios).
3. Se guarda una fila en `formulario_historial` (HU07) con estado anterior, nuevo, responsable, fecha y observación.
4. Se programa `notifica_cambio_estado` como *BackgroundTask* (HU15): la respuesta HTTP no espera al correo.

### 4.3 Endpoints

| Método y ruta | Rol | HU | Qué hace | Errores |
|---------------|-----|----|----------|---------|
| `GET /formulario/{id}` | 1,2,3 | soporte | Detalle (el paciente no ve el motivo de devolución) | 403, 404 |
| `GET /especialista/bandeja` | 2 | HU23 | Pendientes del hospital ordenadas por prioridad | — |
| `POST /formulario/{id}/revision` | 2 | HU23 | `{accion: "aceptar"\|"devolver", motivo, observaciones}`. Aceptar → En lista de espera. Devolver → Devuelta + alerta | 400 sin motivo, 409 si ya fue revisada |
| `GET /formulario/{id}/devolucion` | 1 | HU05A | Motivo, observaciones, fecha de devolución | 409 si no está devuelta |
| `PATCH /formulario/{id}/administrativo` | 1 | HU03 | Edita descripción, prioridad, especialidad, hospital (hospital no cambia si ya fue aceptada) | 400 sin campos, 409 finalizada, 422 campo no permitido |
| `POST /formulario/{id}/reenviar` | 1 | HU05B | Corrige (opcional) y pasa Devuelta → Tramitada; vuelve a la bandeja | 409 si no está devuelta |
| `GET /formulario/{id}/historial` | 1,2,3 | HU07 | Eventos en orden cronológico con responsable | 403 |
| `POST /formulario/{id}/cita` | 2 | HU17 | `{fecha, hora, centro?}` → Agendada; correo con fecha/hora/centro | 400 fecha pasada u hora inválida, 409 estado |
| `POST /formulario/{id}/cierre` | 1,2 | HU09 | `{causal}` oficial → Finalizada; guarda causal y fecha | 400 causal inválida, 409 ya cerrada |
| `GET /alertas/devoluciones` | 1 | HU16 | Devueltas no revisadas del CESFAM + contador | — |
| `POST /alertas/devoluciones/revisar` | 1 | HU16 | Marca como revisadas | — |
| `POST /sincronizar` | 1 | HU21 | Lote de registros offline. Idempotente por `uuidLocal` (reintento → `duplicado: true`). Un registro malo no bloquea al resto | 422 lote vacío/enorme |
| `GET /formulario/{id}/notificaciones` | 1,2 | HU15 | Bitácora de correos enviados/simulados/fallidos | 403 |
| `POST /formulario` (modificado) | 1 | HU19 | Además de crear, guarda historial "Registrada" y notifica | — |

### 4.4 Correos (HU15)

- Una plantilla distinta por etapa (registrada, aceptada, devuelta, reenviada, agendada, finalizada), para paciente y CESFAM.
- **Nunca incluyen datos clínicos** (ni descripción ni motivo de devolución); solo número, estado y, en la cita, fecha/hora/centro.
- Destinatarios: el paciente (`persona_correos`) y el CESFAM (`cesfam.correo` o `CESFAM_CORREO_DEFAULT`).
- Cada intento queda en `notificacion_correo` con `estadoEnvio`: `enviado`, `simulado` (sin SMTP), `sin_destinatario` o `fallido`.
  Un fallo de SMTP **no** rompe el cambio de estado.

---

## 5. Cómo funciona el frontend

- **Flujo administrativo (rol 1)**: Registrar → (especialista devuelve) → contador de alertas (HU16) → Devueltas (HU05A)
  → Corregir y reenviar (HU05B). Desde el listado o el detalle: Editar datos administrativos (HU03) y Cerrar (HU09).
- **Flujo especialista (rol 2)**: Bandeja (HU23) → Aceptar / Devolver con motivo → Detalle → Asignar hora (HU17) → Cerrar (HU09).
- **Historial (HU07)**: en el detalle, `LineaTiempo` muestra cada cambio con fecha, estado y responsable.
- **Sin conexión (HU19/HU21)**:
  1. El Service Worker deja la app disponible sin internet (solo en build de producción).
  2. Al registrar sin red, el formulario se guarda en IndexedDB con un `uuidLocal`.
  3. La barra `EstadoConexion` muestra cuántos quedan pendientes.
  4. Al volver la conexión, `useSincronizacion` llama a `POST /sincronizar`; el backend no duplica si se reintenta.
  5. Los confirmados se borran del equipo y el listado se refresca (`EVENTO_SYNC`).
  6. Al cerrar sesión se borran token y catálogos locales.

---

## 6. Inventario completo de pruebas

Todas siguen el patrón **AAA** (Arrange / Act / Assert, marcado con comentarios).

### 6.1 Cómo correrlas

```bash
# Backend (desde la raíz, con el venv activo)
python -m pytest DATA/tests -v            # 72 pruebas
python -m pytest DATA/tests -k HU23 -v    # o por clase: -k RevisionEspecialistaTest

# Frontend
cd frontend
npm test                                  # 61 pruebas
npx vitest run src/pages/BandejaEspecialista.test.jsx   # un archivo
npm run lint
npm run build
```

> Las pruebas backend **no necesitan MySQL**: `test_flujo.py` reemplaza la conexión por una base falsa en memoria
> (`ConexionFalsa` / `CursorFalso`) y ejecuta los *BackgroundTasks* al instante (`BGInmediato`).

### 6.2 Backend — `DATA/tests/test_servicios.py` (22)

| Clase | Qué prueba |
|-------|-----------|
| `TransicionesTest` | Aceptar/devolver solo desde Registrada o Tramitada; reenviar solo desde Devuelta; agendar solo desde En lista de espera; cerrar desde cualquiera salvo Finalizada; acción desconocida |
| `CausalTest` (HU09) | Causales oficiales, normaliza mayúsculas/espacios, obligatoria, inválida |
| `FechasTest` (HU17/HU07) | Combina fecha+hora, hora inválida, ISO UTC e ISO local |
| `PlantillasTest` (HU15/HU17) | Plantilla propia por etapa; correo de cita con fecha, hora y centro (o hospital por defecto); **no se filtran datos clínicos**; correos al CESFAM |
| `EnvioCorreoTest` (HU15) | Sin destinatario, simulado sin SMTP, envío real con SMTP simulado (mock), fallo SMTP no lanza excepción |

### 6.3 Backend — `DATA/tests/test_flujo.py` (50)

| Clase | HU | Pruebas |
|-------|----|---------|
| `RegistroTest` | HU19 | Registro crea estado Registrada + historial + correo |
| `RevisionEspecialistaTest` | HU23 | Bandeja solo de su hospital ordenada por prioridad; aceptar cambia estado y notifica; devolver exige motivo; devolver guarda motivo y genera alerta; correos sin motivo clínico; no revisar otro hospital; no revisar dos veces; acción inválida rechazada |
| `DevolucionTest` | HU05A | Consulta motivo y observaciones; solo para devueltas; otro CESFAM no puede; el paciente no ve el motivo; paciente no ve ajenas |
| `EdicionAdministrativaTest` | HU03 | Solo campos administrativos; actualiza y devuelve datos; sin campos = 400; validaciones; no edita finalizadas ni de otro CESFAM; hospital fijo una vez aceptada; especialista no puede usar el endpoint |
| `ReenvioTest` | HU05B | Corrige y reenvía → Tramitada y vuelve a bandeja; reenvío sin cambios válido; solo devueltas; ciclo devolver-reenviar-aceptar; notifica al paciente |
| `HistorialTest` | HU07 | Orden cronológico con fecha, estados y responsable; alcance por establecimiento |
| `CitaTest` | HU17 | Asigna hora y envía correo con fecha/hora/centro; centro por defecto = hospital; validaciones |
| `CierreTest` | HU09 | Causal obligatoria y válida; cada causal finaliza y guarda fecha/causal; no se cierra dos veces y queda en historial; especialista también puede cerrar |
| `AlertasTest` | HU16 | Contador y revisión; nueva devolución vuelve a alertar; cada CESFAM ve solo las suyas |
| `SincronizacionTest` | HU21 | Inserta lote con historial y correo; idempotente; un registro inválido no bloquea al resto; no permite otro CESFAM; fecha futura se limita a hoy; rechaza lotes vacíos o enormes |
| `NotificacionesTest` | HU15 | Plantilla distinta por etapa; sin correo queda en bitácora; CESFAM sin correo usa respaldo; fallo SMTP no rompe el flujo; bitácora consultable |
| `ConcurrenciaTest` | todas | No pisa un cambio hecho por otra persona (409) |

### 6.4 Frontend (61, vitest)

| Archivo | N° | HU | Qué prueba |
|---------|----|----|-----------|
| `lib/estados.test.js` | 4 | HU07/09 | Seis etapas en orden; `nombreEstado` tolera ids desconocidos; las 5 causales de HU09; `normalizarPrioridad` |
| `lib/fechas.test.js` | 3 | HU07/17 | Fecha día-mes-año sin correr zona horaria; fecha y hora de la cita; instante UTC → hora local |
| `offline/almacen.test.js` | 3 | HU19 | Guarda pendiente con `uuidLocal`; actualizar y borrar sincronizados; datos de sesión para el Service Worker |
| `offline/catalogos.test.js` | 4 | HU19 | Sin red usa la última copia; de pacientes guarda solo lo mínimo (confidencialidad); error del servidor no se tapa con la caché; `limpiarCatalogos` |
| `offline/sync.test.js` | 5 | HU21 | Marca sincronizado con su N°; sin red conserva pendientes; con sesión vencida (401) espera; rechazo deja el detalle del error; sin pendientes no llama a la API |
| `components/EstadoBadge.test.jsx` | 3 | HU07 | Nombre a partir del id; usa el nombre de la API; color propio por estado |
| `components/LineaTiempo.test.jsx` | 5 | HU07 | Un hito por cambio en orden; estado anterior, nuevo y responsable; primer hito = inicio; sin eventos; cargando y errores |
| `components/ModalDevolucion.test.jsx` | 2 | HU23 | Exige motivo; envía motivo y observaciones sin espacios sobrantes |
| `components/ModalCierre.test.jsx` | 4 | HU09 | Ofrece las 5 causales; no confirma sin causal; confirma con la elegida; cancelar |
| `components/ModalCita.test.jsx` | 3 | HU17 | Exige fecha y hora; rechaza fecha pasada; entrega fecha, hora y centro |
| `components/AlertaContador.test.jsx` | 3 | HU16 | Cantidad de alertas nuevas; si no hay, total pendiente; sin conexión enlace sin contador |
| `components/PendientesLocales.test.jsx` | 2 | HU19/21 | Sin registros no muestra nada; distintivo "pendiente" que pasa a "Sincronizado" |
| `pages/BandejaEspecialista.test.jsx` | 3 | HU23 | Aceptar pide confirmación y envía; si no confirma no acepta; devolver exige motivo |
| `pages/InterconsultasDevueltas.test.jsx` | 1 | HU05A | "Ver motivo" muestra motivo, observaciones y hospital |
| `pages/EditarInterconsulta.test.jsx` | 4 | HU03/05B | Envía solo los cambios; sin cambios no llama a la API; finalizada no se modifica; modo corregir reenvía |
| `pages/DetalleInterconsulta.test.jsx` | 4 | HU07/09/17 | Línea de tiempo y acciones por rol/estado; especialista sin edición; finalizada sin acciones; cerrar exige causal |
| `pages/CentroAlertas.test.jsx` | 2 | HU16 | Al abrir marca como revisadas las nuevas; no vuelve a marcar las ya revisadas |
| `pages/ListadoInterconsultas.test.jsx` | 2 | HU07 | "Sin resultados"; 6 estados con nombre y filtro por CESFAM propio |
| `pages/RegistrarInterconsulta.test.jsx` | 4 | HU19 | Campos obligatorios; sin conexión guarda en el dispositivo; si la red cae al enviar también; con conexión registra en el servidor |

---

## 7. Cómo demostrar cada HU

### 7.1 Evidencia automática (lo más rápido para la demo)

```bash
python -m pytest DATA/tests -v > evidencia_backend.txt
cd frontend && npx vitest run --reporter=verbose > ../evidencia_frontend.txt
```

Cada prueba lleva el nombre de lo que demuestra, y la clase o el `describe` indica la HU. Puedes mostrar
`evidencia_backend.txt` y `evidencia_frontend.txt` o correrlo en vivo.

### 7.2 Demo manual en la app

1. `uvicorn DATA.main:app --port 8000` (con `.env` apuntando a la base) y `npm run dev` con `VITE_API_URL=http://127.0.0.1:8000`.
2. Entra como **administrativo (rol 1)** → Registrar interconsulta (**HU19**).
3. Entra como **especialista (rol 2)** → Bandeja (**HU23**) → Devolver con motivo.
4. Vuelve como rol 1 → el contador de alertas muestra 1 (**HU16**) → Centro de alertas → Devueltas: se ve el motivo (**HU05A**)
   → Corregir y reenviar (**HU05B**).
5. Rol 2 → Aceptar → abrir el detalle → Asignar hora (**HU17**).
6. Rol 1 → Editar prioridad (**HU03**) → Detalle: la línea de tiempo muestra todo el recorrido (**HU07**) → Cerrar con causal (**HU09**).
7. Correos (**HU15**): `GET /formulario/{id}/notificaciones` en `/docs`, o en MySQL
   `SELECT tipo, destinatario, asunto, estadoEnvio FROM notificacion_correo;` (sin SMTP aparecen como `simulado`).

### 7.3 Demo del backend contra MySQL real (sin la nube)

Ya probado con MySQL 9.7 en Docker y la estructura copiada de producción: los 16 pasos dan OK y el historial queda
`Registrada → Devuelta → Tramitada → En lista de espera → Agendada → Finalizada`.

```bash
docker run -d --name s3demo -e MYSQL_ROOT_PASSWORD=root -e MYSQL_DATABASE=railway -p 3399:3306 mysql:8
# esperar ~20 s a que arranque
docker exec -i s3demo mysql -uroot -proot --default-character-set=utf8mb4 railway < docs/sprint3/esquema_base_prueba.sql

export MYSQLHOST=127.0.0.1 MYSQLPORT=3399 MYSQLDATABASE=railway MYSQLUSER=root MYSQLPASSWORD=root \
       JWT_SECRET=secreto-demo-local-123456
uvicorn DATA.main:app --port 8000 &
python docs/sprint3/prueba_flujo_mysql.py http://127.0.0.1:8000

docker exec s3demo mysql -uroot -proot railway -e "SELECT * FROM estados; SELECT * FROM formulario_historial; SELECT tipo,destinatario,estadoEnvio FROM notificacion_correo;"
docker rm -f s3demo                          # limpiar
```

Salida esperada del script (resumen):

```
[OK ] HU19 registrar: 201
[OK ] HU23 devolver sin motivo -> 400: 400
[OK ] HU23 devolver con motivo: 200
[OK ] HU16 alertas: 200
[OK ] HU05A ver motivo: 200
[OK ] HU05B corregir y reenviar: 200
[OK ] HU23 aceptar: 200
[OK ] HU03 editar prioridad: 200
[OK ] HU17 asignar hora: 200
[OK ] HU09 cerrar: 200
[OK ] HU03 finalizada no se edita -> 409: 409
[OK ] HU07 historial: 200
        estados: Registrada -> Devuelta -> Tramitada -> En lista de espera -> Agendada -> Finalizada
[OK ] HU21 sincronizar: 200
[OK ] HU21 reintento idempotente: 200
        duplicado: True
[OK ] HU15 bitácora de correos: 200
```

> En la base de prueba el CESFAM no tiene correo, así que sus notificaciones quedan como `sin_destinatario`.
> Para verlas como `simulado` define `CESFAM_CORREO_DEFAULT` o completa `cesfam.correo`.

### 7.4 Demo sin conexión (HU19 / HU21)

El Service Worker solo funciona en build de producción:

```bash
cd frontend
npm run build && npm run preview          # http://localhost:4173
```

1. Inicia sesión como rol 1 y abre "Registrar" una vez con internet (se guardan los catálogos).
2. DevTools (F12) → pestaña **Network** → marcar **Offline**.
3. Aparece la barra "Sin conexión". Registra una interconsulta: se guarda localmente y aparece en "Pendientes".
4. DevTools → **Application** → IndexedDB: se ve el registro con su `uuidLocal`.
5. Quita **Offline**: se sincroniza solo, la barra desaparece y la interconsulta aparece en el listado.
6. Application → Service Workers: `sw.js` activo; Cache Storage → `interconsultas-shell-v1`.

**Versión automática (Chrome real)**. Ya se ejecutó con éxito contra la API y MySQL de la sección 7.3:

```bash
# 1) API + MySQL levantados como en 7.3 (el seed ya trae la clave Clave1234 para los 3 usuarios)
# 2) build apuntando a la API local + preview
cd frontend && VITE_API_URL=http://127.0.0.1:8000 npm run build && npm run preview   # puerto 4173
# 3) en otra terminal (playwright-core se instala FUERA del proyecto y usa tu Chrome instalado)
mkdir -p /tmp/e2e && cd /tmp/e2e && npm init -y && npm install playwright-core
cp <repo>/docs/sprint3/prueba_offline_chrome.mjs . && node prueba_offline_chrome.mjs
```

Resultado obtenido:

```
[OK ] login con API real
[OK ] Service Worker registrado y controlando la página
[OK ] cache del shell: interconsultas-shell-v1
[OK ] sin conexión la pantalla Registrar recarga desde caché (shell + catálogos)
[OK ] aviso "Sin conexión" visible
[OK ] aviso "Guardado sin conexión"
[OK ] IndexedDB guarda 1 pendiente (uuidLocal=...)
[OK ] al volver la conexión se sincroniza solo (estado local: sincronizado)
```

En MySQL queda la interconsulta con su `uuidLocal`, una fila de historial "Registrada sin conexión y sincronizada"
y el correo al paciente en `notificacion_correo`. La captura queda en `offline_final.png`.

---

## 8. Tabla HU ↔ criterio ↔ evidencia

| HU | Criterio de Aceptación | Prueba / Evidencia respaldatoria | Resultado |
|----|------------------------|----------------------------------|-----------|
| HU03 | Solo se editan campos administrativos | `EdicionAdministrativaTest.test_solo_campos_administrativos`, `EditarInterconsulta.test` "envía solo los campos cambiados" | ✅ |
| HU03 | No se edita una finalizada / de otro CESFAM | `test_no_edita_finalizadas_ni_otro_cesfam`, front "finalizada no se puede modificar", MySQL 409 | ✅ |
| HU05A | Se ve el motivo y las observaciones de la devolución | `DevolucionTest.test_consulta_motivo_y_observaciones`, `InterconsultasDevueltas.test` | ✅ |
| HU05A | Solo el CESFAM dueño; el paciente no lo ve | `test_otro_cesfam_no_puede_consultarla`, `test_el_paciente_no_ve_el_motivo_en_el_detalle` | ✅ |
| HU05B | Corregir y reenviar → Tramitada y vuelve a la bandeja | `ReenvioTest.test_corrige_y_reenvia_...`, front "modo corregir reenvía", MySQL paso HU05B | ✅ |
| HU07 | Historial cronológico con fecha, estado y responsable | `HistorialTest.test_orden_cronologico_...`, `LineaTiempo.test`, `DetalleInterconsulta.test`, MySQL (6 eventos) | ✅ |
| HU09 | Cierre con causal oficial obligatoria, guarda fecha | `CierreTest` (4), `CausalTest`, `ModalCierre.test`, "cerrar exige causal y la envía" | ✅ |
| HU15 | Correo en cada cambio de estado, plantilla por etapa, sin datos clínicos | `NotificacionesTest`, `PlantillasTest.test_no_se_filtran_datos_clinicos`, tabla `notificacion_correo` en MySQL | ✅ (simulado) |
| HU16 | Alerta y contador de devueltas, se marcan revisadas | `AlertasTest` (3), `AlertaContador.test`, `CentroAlertas.test` | ✅ |
| HU17 | Asignar fecha/hora/centro y notificar | `CitaTest` (3), `ModalCita.test`, `PlantillasTest.test_correo_de_cita_...` | ✅ |
| HU19 | Registrar sin conexión y no perder datos | `RegistrarInterconsulta.test` (offline), `almacen.test`, `catalogos.test`, E2E Chrome `prueba_offline_chrome.mjs` | ✅ |
| HU21 | Sincronización automática e idempotente | `SincronizacionTest` (6), `sync.test` (5), MySQL `duplicado: True`, E2E Chrome (se sincroniza al reconectar) | ✅ |
| HU23 | Aceptar o devolver con motivo obligatorio | `RevisionEspecialistaTest` (8), `BandejaEspecialista.test`, `ModalDevolucion.test`, MySQL 400 sin motivo | ✅ |

---

## 9. Base de datos

La base de Railway ya tiene aplicados los cambios del Sprint 3, así que la API **no migra nada al arrancar**.
Para una base local, `docs/sprint3/esquema_base_prueba.sql` crea la estructura completa.

| Cambio | Para qué |
|--------|----------|
| `formulario` + `motivoDevolucion`, `observacionDevolucion`, `fechaDevolucion` | HU05A / HU23 |
| `formulario` + `alertaRevisada` | HU16 |
| `formulario` + `causalCierre`, `fechaCierre` | HU09 |
| `formulario` + `fechaCita`, `centroCita` | HU17 |
| `formulario` + `uuidLocal` + índice único `uq_formulario_uuid` | HU21 (evita duplicados al reintentar) |
| `cesfam` + `correo` | HU15 (correo del CESFAM) |
| Tabla nueva `formulario_historial` | HU07 |
| Tabla nueva `notificacion_correo` | HU15 (bitácora) |
| `estados`: 4 "Enviada" → "Tramitada"; nuevos 5 "Agendada" y 6 "Finalizada" | Flujo completo |

**Coherencia con el "Esquema Consolidado"** del equipo: el código usa exactamente esos nombres
(`acceso.Activo='S'`, `persona_correos(correos, idPersona)`, `formulario.prioridadClinica`, `idEspecialidad`, etc.).

**Estructura real de producción** (leída en modo solo lectura de la base de Railway del equipo el 2026-10-19, MySQL 9.7.2).
`esquema_base_prueba.sql` es copia exacta de esa estructura. Diferencias con el documento "Esquema Consolidado":

| Detalle | Producción | Consolidado | Efecto en el código |
|---|---|---|---|
| `persona.fechaNac`, `persona.idComuna` | existen (`NOT NULL`, FK a `comuna`) | no aparecen | el login, registro y perfil las usan → **agregarlas al documento** |
| `formulario.prioridadClinica` | `INT` 1–10 con `CHECK`, default 1 | texto | la API traduce `alta/media/baja` ↔ `1/2/3`; compatible |
| `formulario.descripcion` | minúscula | `Descripcion` | MySQL no distingue mayúsculas en columnas; sin efecto |
| `persona_contactos.contactos` | `INT` | — | sin efecto |
| Claves foráneas | `formulario.idEstado → estados` y otras | — | los estados 5 y 6 ya existen en la base; compatible |


---

## 10. Pendientes / sin verificar

- **SMTP real**: no se probó con un servidor de correo real (solo simulado y con SMTP mockeado). Configurar `SMTP_*` en Railway y probar un envío.
- **Service Worker en otros navegadores**: probado en Chrome real (sección 7.4); no probado en Firefox/Safari ni en móvil.
- **Rol del "encargado de lista de espera"**: se asumió que es el rol 2 (especialista) quien agenda (HU17) y cierra (HU09). Si es otro rol, ajustar `requiere_rol` en esos endpoints.
- **Tamaño del bundle**: `npm run build` avisa que un chunk pesa más de 500 kB (solo advertencia; se puede dividir con `import()` más adelante).
- **Correo del CESFAM**: completar `cesfam.correo` o `CESFAM_CORREO_DEFAULT`; si no, esas notificaciones quedan como `sin_destinatario`.
