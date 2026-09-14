gestion_interconsultas_cesfam

## Descripción

Sistema de gestión y trazabilidad de interconsultas entre atención
primaria (CESFAM) y atención secundaria (hospitales),
que permite registrar, validar, dar seguimiento y sincronizar
derivaciones médicas incluso sin conexión a internet.

## Integrantes
- Gabriel Hidalgo   
- Manuel Macchiavello
- Dhylan Pizarro

## Arquitectura

Monolítico Modular, 

## Tecnologías

- Frontend: React/Vue.js + Service Worker + IndexedDB (PWA offline)
- Backend: js
- Base de datos: MySQL
- Autenticación: JWT

## Organización del repositorio

- backend: API REST y lógica de negocio (módulos: Autenticación,
  Interconsultas, Notificaciones, Sincronización).
- frontend: Interfaz PWA (login, formularios de interconsulta,
  paneles administrativos).
- docs: Documentación del proyecto .
- tests: Pruebas unitarias e integración.