# Base de datos — ProVial

Esta carpeta contiene el snapshot completo de la base de datos de producción
y los scripts para montarla localmente.

## Archivos

| Archivo | Descripción |
|---|---|
| `seed.sql` | Snapshot completo: esquema + todos los datos de producción |
| `setup_local.sh` | Script de instalación para Linux / Mac |
| `setup_local.ps1` | Script de instalación para Windows (PowerShell) |

---

## Requisitos

- PostgreSQL 14 o superior instalado y corriendo
- `psql` disponible en el PATH

---

## Instrucciones — Linux / Mac

```bash
bash database/setup_local.sh
```

Crea la base de datos `provial_local` y restaura todos los datos automáticamente.

---

## Instrucciones — Windows (PowerShell)

```powershell
.\database\setup_local.ps1
```

---

## Parámetros opcionales

Se puede cambiar el nombre de la BD y el usuario:

```bash
# Linux / Mac
bash database/setup_local.sh mi_bd mi_usuario

# Windows
.\database\setup_local.ps1 -DbName mi_bd -DbUser mi_usuario
```

---

## Después de instalar

Configura el backend con la cadena de conexión local.
Edita `backend/.env` y cambia `DATABASE_URL`:

```
DATABASE_URL=postgresql://postgres:TU_PASSWORD@localhost:5432/provial_local
```

---

## Actualizar el snapshot

Cuando la base de datos de producción cambia, el administrador del sistema
ejecuta desde la raíz del proyecto:

```bash
DATABASE_URL="postgresql://..." bash scripts/dump_bd.sh
git add database/seed.sql
git commit -m "chore(db): actualizar snapshot BD"
git push origin main
```

El equipo de Informática hace `git pull` y vuelve a correr `setup_local`.
