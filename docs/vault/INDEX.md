---
tags: [indice, vault]
---

# Vault PROVIAL — Índice

Documentación técnica del sistema PROVIAL. Abrir con Obsidian (`docs/vault/` como carpeta del vault).

## Documentos

| Archivo | Contenido |
|---------|-----------|
| [[SCHEMA]] | Esquema completo de la BD (96 tablas, vistas, funciones PG) |
| [[ARQUITECTURA]] | Stack, infraestructura, middlewares, WebSocket, estructura de carpetas |
| [[FLUJOS]] | Flujos de negocio: jornada brigada, situaciones, inspección 360, turnos |
| [[ROLES_Y_PERMISOS]] | Matriz de permisos por endpoint y rol |
| [[DECISIONES]] | Registro de decisiones de arquitectura y su justificación |
| [[ACCIDENTOLOGIA]] | Boleta UAV-205-13, nomenclatura de sedes, mapeo de campos |
| [[PATRONES]] | Patrones de código reutilizables: queries, auth, offline-first |
| [[MATRIZ_CAMPOS]] | Qué campos aplican por tipo de situación (INCIDENTE/ASISTENCIA/EMERGENCIA) — fuente de verdad para formularios y bitácora |

## Por dónde empezar

- ¿Qué tablas existen y qué columnas tienen? → [[SCHEMA]]
- ¿Cómo está desplegado el sistema? → [[ARQUITECTURA]]
- ¿Cómo funciona el flujo de inicio/fin de jornada? → [[FLUJOS#1. Jornada de una brigada (flujo completo)]]
- ¿Qué rol puede hacer qué endpoint? → [[ROLES_Y_PERMISOS]]
- ¿Por qué se tomó una decisión técnica? → [[DECISIONES]]
- ¿Cómo funciona el tiempo real? → [[ARQUITECTURA#WebSocket (tiempo real)]]
