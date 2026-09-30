# gestion_interconsultas_cesfam

## Descripción

Sistema de gestión y trazabilidad de interconsultas entre atención
primaria (CESFAM) y atención secundaria (hospitales), que permite
registrar, validar, dar seguimiento y sincronizar derivaciones médicas
incluso sin conexión a internet.

## Integrantes

- Gabriel Hidalgo — Backend / API (FastAPI)
- Manuel Macchiavello — Frontend (React)
- Dhylan Pizarro — Product Owner / Scrum Master

## Arquitectura

Monolítico Modular.

## Tecnologías

- Frontend: React (offline-first con Service Worker + IndexedDB — planificado, aún no implementado en el Sprint 1)
- Backend: FastAPI (Python) + MySQL
- Base de datos: MySQL
- Autenticación: JWT

## Organización del repositorio

- `backend`: API REST y lógica de negocio (módulos: Autenticación,
  Interconsultas, Notificaciones, Sincronización).
- `frontend`: Interfaz PWA (login, formularios de interconsulta,
  paneles administrativos).
- `docs`: Documentación del proyecto.
- `tests`: Pruebas unitarias e integración.

## Estado actual (Sprint 1)

- API funcional en FastAPI, conectada a MySQL, expuesta mediante un
  túnel de desarrollo por Gabriel para que el resto del equipo pueda
  consumirla localmente.
- Endpoints activos: `/login`, `/persona`, `/formulario`, `/acceso`,
  `/region`, `/comuna/{region}`, `/hospital/{comuna}`,
  `/cesfam/{comuna}`, `/contactos/{persona}`, `/comparaDatos/...`.
- Frontend en React con pantallas de login, registro de persona y
  selección de rol.
