#!/usr/bin/env python3
"""
Reorganiza SIPROVIAL en subdirectorios por departamento.
Mueve archivos con git mv y actualiza todos los imports.
"""

import os
import re
import subprocess
from pathlib import Path

REPO  = Path(r"c:\Users\chris\OneDrive\Escritorio\proyectoProvialMovilWeb")
BACK  = REPO / "backend" / "src"
WEB   = REPO / "web" / "src"

# ──────────────────────────────────────────────────────────────
# MAPAS DE MOVIMIENTOS  (relativo al src raíz de cada proyecto)
# ──────────────────────────────────────────────────────────────

BACKEND_MOVES = {
    # ── MODELS ─────────────────────────────────────────────
    # cop
    "models/situacion.model.ts":          "models/cop/situacion.model.ts",
    "models/situacionDetalle.model.ts":   "models/cop/situacionDetalle.model.ts",
    "models/actividad.model.ts":          "models/cop/actividad.model.ts",
    "models/evento.model.ts":             "models/cop/evento.model.ts",
    "models/capaMapa.model.ts":           "models/cop/capaMapa.model.ts",
    "models/ubicacionBrigada.model.ts":   "models/cop/ubicacionBrigada.model.ts",
    # operaciones
    "models/asignacionAvanzada.model.ts": "models/operaciones/asignacionAvanzada.model.ts",
    "models/operaciones.model.ts":        "models/operaciones/operaciones.model.ts",
    "models/grupo.model.ts":              "models/operaciones/grupo.model.ts",
    "models/movimiento.model.ts":         "models/operaciones/movimiento.model.ts",
    "models/configuracionSede.model.ts":  "models/operaciones/configuracionSede.model.ts",
    # transportes
    "models/inspeccion360.model.ts":      "models/transportes/inspeccion360.model.ts",
    # accidentologia
    "models/accidentologia.model.ts":     "models/accidentologia/accidentologia.model.ts",
    "models/incidente.model.ts":          "models/accidentologia/incidente.model.ts",
    "models/grua.model.ts":               "models/accidentologia/grua.model.ts",
    "models/gruaMaster.model.ts":         "models/accidentologia/gruaMaster.model.ts",
    "models/ajustador.model.ts":          "models/accidentologia/ajustador.model.ts",
    "models/aseguradora.model.ts":        "models/accidentologia/aseguradora.model.ts",
    # comunicacion
    "models/comunicacionSocial.model.ts": "models/comunicacion/comunicacionSocial.model.ts",
    # admin
    "models/administracion.model.ts":     "models/admin/administracion.model.ts",
    "models/auditoria.model.ts":          "models/admin/auditoria.model.ts",
    "models/dispositivo.model.ts":        "models/admin/dispositivo.model.ts",
    # common
    "models/usuario.model.ts":            "models/common/usuario.model.ts",
    "models/geografia.model.ts":          "models/common/geografia.model.ts",
    "models/multimedia.model.ts":         "models/common/multimedia.model.ts",
    "models/persona.model.ts":            "models/common/persona.model.ts",
    "models/salida.model.ts":             "models/common/salida.model.ts",
    "models/turno.model.ts":              "models/common/turno.model.ts",
    "models/vehiculo.model.ts":           "models/common/vehiculo.model.ts",
    "models/piloto.model.ts":             "models/common/piloto.model.ts",

    # ── SERVICES ───────────────────────────────────────────
    # common
    "services/socket.service.ts":              "services/common/socket.service.ts",
    "services/pushNotification.service.ts":    "services/common/pushNotification.service.ts",
    "services/firebase.service.ts":            "services/common/firebase.service.ts",
    "services/cloudinary.service.ts":          "services/common/cloudinary.service.ts",
    "services/storage.service.ts":             "services/common/storage.service.ts",
    "services/alertas.service.ts":             "services/common/alertas.service.ts",
    "services/reportes.service.ts":            "services/common/reportes.service.ts",
    # admin
    "services/dashboard.service.ts":           "services/admin/dashboard.service.ts",
    "services/importExcel.service.ts":         "services/admin/importExcel.service.ts",
    # accidentologia
    "services/estadisticas.service.ts":        "services/accidentologia/estadisticas.service.ts",
    # operaciones
    "services/generador-turnos.service.ts":    "services/operaciones/generador-turnos.service.ts",
    # transportes
    "services/pdf360.service.ts":              "services/transportes/pdf360.service.ts",

    # ── CONTROLLERS ────────────────────────────────────────
    # cop
    "controllers/situacion.controller.ts":         "controllers/cop/situacion.controller.ts",
    "controllers/actividad.controller.ts":         "controllers/cop/actividad.controller.ts",
    "controllers/salida.controller.ts":            "controllers/cop/salida.controller.ts",
    "controllers/evento.controller.ts":            "controllers/cop/evento.controller.ts",
    "controllers/alertas.controller.ts":           "controllers/cop/alertas.controller.ts",
    "controllers/conflictos.controller.ts":        "controllers/cop/conflictos.controller.ts",
    "controllers/drafts.controller.ts":            "controllers/cop/drafts.controller.ts",
    "controllers/ingreso.controller.ts":           "controllers/cop/ingreso.controller.ts",
    "controllers/capaMapa.controller.ts":          "controllers/cop/capaMapa.controller.ts",
    "controllers/ubicacionBrigada.controller.ts":  "controllers/cop/ubicacionBrigada.controller.ts",
    "controllers/aprobaciones.controller.ts":      "controllers/cop/aprobaciones.controller.ts",
    "controllers/solicitudesSalidaController.ts":  "controllers/cop/solicitudesSalidaController.ts",
    # operaciones
    "controllers/operaciones.controller.ts":       "controllers/operaciones/operaciones.controller.ts",
    "controllers/asignacionesController.ts":       "controllers/operaciones/asignacionesController.ts",
    "controllers/asignacionAvanzada.controller.ts":"controllers/operaciones/asignacionAvanzada.controller.ts",
    "controllers/generador-turnos.controller.ts":  "controllers/operaciones/generador-turnos.controller.ts",
    "controllers/brigadas.controller.ts":          "controllers/operaciones/brigadas.controller.ts",
    "controllers/grupo.controller.ts":             "controllers/operaciones/grupo.controller.ts",
    "controllers/reasignacion.controller.ts":      "controllers/operaciones/reasignacion.controller.ts",
    "controllers/movimiento.controller.ts":        "controllers/operaciones/movimiento.controller.ts",
    # transportes
    "controllers/unidades.controller.ts":          "controllers/transportes/unidades.controller.ts",
    "controllers/reparaciones.controller.ts":      "controllers/transportes/reparaciones.controller.ts",
    "controllers/inspeccion360.controller.ts":     "controllers/transportes/inspeccion360.controller.ts",
    # accidentologia
    "controllers/accidentologia.controller.ts":    "controllers/accidentologia/accidentologia.controller.ts",
    "controllers/estadisticas.controller.ts":      "controllers/accidentologia/estadisticas.controller.ts",
    "controllers/intelligence.controller.ts":      "controllers/accidentologia/intelligence.controller.ts",
    # comunicacion
    "controllers/comunicacionSocial.controller.ts":"controllers/comunicacion/comunicacionSocial.controller.ts",
    # admin
    "controllers/administracion.controller.ts":    "controllers/admin/administracion.controller.ts",
    "controllers/roles.controller.ts":             "controllers/admin/roles.controller.ts",
    "controllers/dispositivo.controller.ts":       "controllers/admin/dispositivo.controller.ts",
    "controllers/importExcel.controller.ts":       "controllers/admin/importExcel.controller.ts",
    "controllers/auditoria.controller.ts":         "controllers/admin/auditoria.controller.ts",
    "controllers/dashboard.controller.ts":         "controllers/admin/dashboard.controller.ts",
    "controllers/passwordReset.controller.ts":     "controllers/admin/passwordReset.controller.ts",
    "controllers/testModeController.ts":           "controllers/admin/testModeController.ts",
    # common
    "controllers/auth.controller.ts":              "controllers/common/auth.controller.ts",
    "controllers/multimedia.controller.ts":        "controllers/common/multimedia.controller.ts",
    "controllers/cloudinary.controller.ts":        "controllers/common/cloudinary.controller.ts",
    "controllers/notificaciones.controller.ts":    "controllers/common/notificaciones.controller.ts",
    "controllers/reportes.controller.ts":          "controllers/common/reportes.controller.ts",
    "controllers/geografia.controller.ts":         "controllers/common/geografia.controller.ts",
    "controllers/sede.controller.ts":              "controllers/common/sede.controller.ts",
    "controllers/turno.controller.ts":             "controllers/common/turno.controller.ts",

    # ── ROUTES ─────────────────────────────────────────────
    # cop
    "routes/salida.routes.ts":            "routes/cop/salida.routes.ts",
    "routes/situaciones.routes.ts":       "routes/cop/situaciones.routes.ts",
    "routes/actividad.routes.ts":         "routes/cop/actividad.routes.ts",
    "routes/evento.routes.ts":            "routes/cop/evento.routes.ts",
    "routes/alertas.routes.ts":           "routes/cop/alertas.routes.ts",
    "routes/drafts.routes.ts":            "routes/cop/drafts.routes.ts",
    "routes/ingreso.routes.ts":           "routes/cop/ingreso.routes.ts",
    "routes/capaMapa.routes.ts":          "routes/cop/capaMapa.routes.ts",
    "routes/ubicacionBrigada.routes.ts":  "routes/cop/ubicacionBrigada.routes.ts",
    "routes/aprobaciones.routes.ts":      "routes/cop/aprobaciones.routes.ts",
    "routes/solicitudesSalida.ts":        "routes/cop/solicitudesSalida.ts",
    # operaciones
    "routes/operaciones.routes.ts":       "routes/operaciones/operaciones.routes.ts",
    "routes/asignaciones.ts":             "routes/operaciones/asignaciones.ts",
    "routes/asignacionAvanzada.routes.ts":"routes/operaciones/asignacionAvanzada.routes.ts",
    "routes/generador-turnos.routes.ts":  "routes/operaciones/generador-turnos.routes.ts",
    "routes/brigadas.routes.ts":          "routes/operaciones/brigadas.routes.ts",
    "routes/grupos.routes.ts":            "routes/operaciones/grupos.routes.ts",
    "routes/reasignacion.routes.ts":      "routes/operaciones/reasignacion.routes.ts",
    "routes/movimientos.routes.ts":       "routes/operaciones/movimientos.routes.ts",
    # transportes
    "routes/unidades.routes.ts":          "routes/transportes/unidades.routes.ts",
    "routes/reparaciones.routes.ts":      "routes/transportes/reparaciones.routes.ts",
    "routes/inspeccion360.routes.ts":     "routes/transportes/inspeccion360.routes.ts",
    # accidentologia
    "routes/accidentologia.routes.ts":    "routes/accidentologia/accidentologia.routes.ts",
    "routes/estadisticas.routes.ts":      "routes/accidentologia/estadisticas.routes.ts",
    "routes/intelligence.routes.ts":      "routes/accidentologia/intelligence.routes.ts",
    # comunicacion
    "routes/comunicacionSocial.routes.ts":"routes/comunicacion/comunicacionSocial.routes.ts",
    # admin
    "routes/administracion.routes.ts":    "routes/admin/administracion.routes.ts",
    "routes/roles.routes.ts":             "routes/admin/roles.routes.ts",
    "routes/dispositivo.routes.ts":       "routes/admin/dispositivo.routes.ts",
    "routes/importExcel.routes.ts":       "routes/admin/importExcel.routes.ts",
    "routes/auditoria.routes.ts":         "routes/admin/auditoria.routes.ts",
    "routes/dashboard.routes.ts":         "routes/admin/dashboard.routes.ts",
    "routes/passwordReset.routes.ts":     "routes/admin/passwordReset.routes.ts",
    "routes/testMode.routes.ts":          "routes/admin/testMode.routes.ts",
    # common
    "routes/auth.routes.ts":              "routes/common/auth.routes.ts",
    "routes/multimedia.routes.ts":        "routes/common/multimedia.routes.ts",
    "routes/cloudinary.routes.ts":        "routes/common/cloudinary.routes.ts",
    "routes/notificaciones.routes.ts":    "routes/common/notificaciones.routes.ts",
    "routes/reportes.routes.ts":          "routes/common/reportes.routes.ts",
    "routes/geografia.routes.ts":         "routes/common/geografia.routes.ts",
    "routes/sede.routes.ts":              "routes/common/sede.routes.ts",
    "routes/turno.routes.ts":             "routes/common/turno.routes.ts",
}

WEB_MOVES = {
    # ── PAGES ──────────────────────────────────────────────
    # common
    "pages/LoginPage.tsx":                   "pages/common/LoginPage.tsx",
    "pages/EventosPage.tsx":                 "pages/common/EventosPage.tsx",
    # admin
    "pages/AdminHubPage.tsx":                "pages/admin/AdminHubPage.tsx",
    "pages/AdminPanelPage.tsx":              "pages/admin/AdminPanelPage.tsx",
    "pages/SuperAdminPage.tsx":              "pages/admin/SuperAdminPage.tsx",
    "pages/ConfiguracionSedesPage.tsx":      "pages/admin/ConfiguracionSedesPage.tsx",
    "pages/ControlAccesoPage.tsx":           "pages/admin/ControlAccesoPage.tsx",
    "pages/ImportExcelPage.tsx":             "pages/admin/ImportExcelPage.tsx",
    "pages/DashboardEjecutivoPage.tsx":      "pages/admin/DashboardEjecutivoPage.tsx",
    "pages/DashboardSedesPage.tsx":          "pages/admin/DashboardSedesPage.tsx",
    # cop
    "pages/COPBitacoraDiaPage.tsx":          "pages/cop/COPBitacoraDiaPage.tsx",
    "pages/COPBitacoraPage.tsx":             "pages/cop/COPBitacoraPage.tsx",
    "pages/COPMapaPage.tsx":                 "pages/cop/COPMapaPage.tsx",
    "pages/COPSituacionesPage.tsx":          "pages/cop/COPSituacionesPage.tsx",
    "pages/BitacoraPage.tsx":                "pages/cop/BitacoraPage.tsx",
    "pages/VerActividadPage.tsx":            "pages/cop/VerActividadPage.tsx",
    "pages/EditarSituacionPage.tsx":         "pages/cop/EditarSituacionPage.tsx",
    # operaciones
    "pages/OperacionesPage.tsx":             "pages/operaciones/OperacionesPage.tsx",
    "pages/BrigadasPage.tsx":                "pages/operaciones/BrigadasPage.tsx",
    "pages/GestionBrigadasPage.tsx":         "pages/operaciones/GestionBrigadasPage.tsx",
    "pages/GestionUnidadesPage.tsx":         "pages/operaciones/GestionUnidadesPage.tsx",
    "pages/GeneradorTurnosPage.tsx":         "pages/operaciones/GeneradorTurnosPage.tsx",
    "pages/CrearAsignacionPage.tsx":         "pages/operaciones/CrearAsignacionPage.tsx",
    "pages/MovimientosBrigadasPage.tsx":     "pages/operaciones/MovimientosBrigadasPage.tsx",
    "pages/SituacionesFijasPage.tsx":        "pages/operaciones/SituacionesFijasPage.tsx",
    "pages/SituacionesPersistentesPage.tsx": "pages/operaciones/SituacionesPersistentesPage.tsx",
    # transportes
    "pages/TransportesHubPage.tsx":          "pages/transportes/TransportesHubPage.tsx",
    "pages/UnidadesPage.tsx":                "pages/transportes/UnidadesPage.tsx",
    # accidentologia
    "pages/DashboardEstadisticasPage.tsx":   "pages/accidentologia/DashboardEstadisticasPage.tsx",
    "pages/DispositivosPage.tsx":            "pages/accidentologia/DispositivosPage.tsx",
    "pages/GaleriaMultimediaPage.tsx":       "pages/accidentologia/GaleriaMultimediaPage.tsx",

    # ── COMPONENTS ─────────────────────────────────────────
    # cop (raíz)
    "components/AlertasPanel.tsx":           "components/cop/AlertasPanel.tsx",
    "components/FormularioEmergencia.tsx":   "components/cop/FormularioEmergencia.tsx",
    "components/FormularioHechoTransito.tsx":"components/cop/FormularioHechoTransito.tsx",
    "components/FormularioOtros.tsx":        "components/cop/FormularioOtros.tsx",
    "components/FormularioPatrullaje.tsx":   "components/cop/FormularioPatrullaje.tsx",
    "components/ResumenUnidadesTable.tsx":   "components/cop/ResumenUnidadesTable.tsx",
    "components/SituacionEditModal.tsx":     "components/cop/SituacionEditModal.tsx",
    "components/SituacionFormSelector.tsx":  "components/cop/SituacionFormSelector.tsx",
    "components/SituacionMultimediaUploader.tsx": "components/cop/SituacionMultimediaUploader.tsx",
    # cop/forms
    "components/forms/AsistenciaFormModal.tsx":    "components/cop/forms/AsistenciaFormModal.tsx",
    "components/forms/COPSalidaEmergenciaModal.tsx":"components/cop/forms/COPSalidaEmergenciaModal.tsx",
    "components/forms/CrearActividadModal.tsx":    "components/cop/forms/CrearActividadModal.tsx",
    "components/forms/CrearSituacionModal.tsx":    "components/cop/forms/CrearSituacionModal.tsx",
    "components/forms/DynamicActivityFields.tsx":  "components/cop/forms/DynamicActivityFields.tsx",
    "components/forms/IncidenteFormModal.tsx":     "components/cop/forms/IncidenteFormModal.tsx",
    "components/forms/SalidaCOPModal.tsx":         "components/cop/forms/SalidaCOPModal.tsx",
    "components/forms/index.ts":                   "components/cop/forms/index.ts",
    # cop/situaciones
    "components/situaciones/AutoridadesSocorroForm.tsx": "components/cop/situaciones/AutoridadesSocorroForm.tsx",
    "components/situaciones/ObstruccionForm.tsx":        "components/cop/situaciones/ObstruccionForm.tsx",
    "components/situaciones/index.ts":                   "components/cop/situaciones/index.ts",
    # accidentologia/forms
    "components/forms/AjustadorFormWeb.tsx":   "components/accidentologia/forms/AjustadorFormWeb.tsx",
    "components/forms/AutoridadSocorroWeb.tsx":"components/accidentologia/forms/AutoridadSocorroWeb.tsx",
    "components/forms/CausasSelectorWeb.tsx":  "components/accidentologia/forms/CausasSelectorWeb.tsx",
    "components/forms/GruaFormWeb.tsx":        "components/accidentologia/forms/GruaFormWeb.tsx",
    "components/forms/VehiculoFormWeb.tsx":    "components/accidentologia/forms/VehiculoFormWeb.tsx",
    "components/forms/VictimasFields.tsx":     "components/accidentologia/forms/VictimasFields.tsx",
    # transportes
    "components/Inspeccion360Historial.tsx":   "components/transportes/Inspeccion360Historial.tsx",
    # common
    "components/CambiarPasswordModal.tsx":     "components/common/CambiarPasswordModal.tsx",
    "components/ConfiguracionColumnas.tsx":    "components/common/ConfiguracionColumnas.tsx",
    "components/HeatmapLayer.tsx":             "components/common/HeatmapLayer.tsx",
    "components/PageHeader.tsx":               "components/common/PageHeader.tsx",
    "components/SituacionIcon.tsx":            "components/common/SituacionIcon.tsx",
    "components/ThemeToggle.tsx":              "components/common/ThemeToggle.tsx",
    # common/forms
    "components/forms/CondicionesViaFields.tsx":   "components/common/forms/CondicionesViaFields.tsx",
    "components/forms/CrearPuntoMapaModal.tsx":    "components/common/forms/CrearPuntoMapaModal.tsx",
    "components/forms/MapPickerModal.tsx":         "components/common/forms/MapPickerModal.tsx",
    "components/forms/ObstruccionSelectorWeb.tsx": "components/common/forms/ObstruccionSelectorWeb.tsx",
    "components/forms/RecursosSection.tsx":        "components/common/forms/RecursosSection.tsx",
    "components/forms/UbicacionFields.tsx":        "components/common/forms/UbicacionFields.tsx",

    # ── SERVICES ───────────────────────────────────────────
    "services/administracion.service.ts":      "services/admin/administracion.service.ts",
    "services/asignaciones.service.ts":        "services/operaciones/asignaciones.service.ts",
    "services/asignacionesAvanzadas.service.ts":"services/operaciones/asignacionesAvanzadas.service.ts",
    "services/generador.service.ts":           "services/operaciones/generador.service.ts",
    "services/movimientos.service.ts":         "services/operaciones/movimientos.service.ts",
    "services/operaciones.service.ts":         "services/operaciones/operaciones.service.ts",
    "services/transportes.service.ts":         "services/transportes/transportes.service.ts",
    "services/turnos.service.ts":              "services/common/turnos.service.ts",
}

# ──────────────────────────────────────────────────────────────
# LÓGICA PRINCIPAL
# ──────────────────────────────────────────────────────────────

def build_abs_maps(moves, src):
    old_to_new = {}
    for old_rel, new_rel in moves.items():
        old_abs = (src / old_rel).resolve()
        new_abs = (src / new_rel).resolve()
        old_to_new[old_abs] = new_abs
    new_to_old = {v: k for k, v in old_to_new.items()}
    return old_to_new, new_to_old

def create_dirs(moves, src):
    seen = set()
    for new_rel in moves.values():
        d = (src / new_rel).parent
        if d not in seen:
            d.mkdir(parents=True, exist_ok=True)
            seen.add(d)

def git_mv(moves, src, repo):
    errors = []
    for old_rel, new_rel in moves.items():
        old_abs = src / old_rel
        new_abs = src / new_rel
        if not old_abs.exists():
            print(f"  SKIP (no existe): {old_rel}")
            continue
        r = subprocess.run(
            ["git", "mv", str(old_abs), str(new_abs)],
            cwd=str(repo), capture_output=True, text=True
        )
        if r.returncode != 0:
            errors.append(f"{old_rel}: {r.stderr.strip()}")
            print(f"  ERR  {old_rel}: {r.stderr.strip()}")
        else:
            print(f"  OK   {old_rel}")
    return errors

def find_ts_files(src):
    result = []
    for root, dirs, files in os.walk(src):
        dirs[:] = [d for d in dirs if d not in ('node_modules', 'dist', '.git')]
        for f in files:
            if f.endswith(('.ts', '.tsx')) and not f.endswith('.d.ts'):
                result.append(Path(root) / f)
    return result

# Regex: captura cualquier string relativo entre comillas  './x' o '../x'
_IMPORT_RE = re.compile(r"""(['"])(\.\.?/[^'"]+)\1""")

def update_imports_in_file(file_path: Path, old_to_new: dict, new_to_old: dict):
    try:
        content = file_path.read_text(encoding='utf-8', errors='replace')
    except Exception as e:
        print(f"  ERR lectura {file_path}: {e}")
        return

    # Ubicación antigua del archivo (si fue movido)
    file_abs = file_path.resolve()
    old_file_loc: Path = new_to_old.get(file_abs, file_abs)

    changed = False

    def replacer(m):
        nonlocal changed
        q    = m.group(1)
        ipath = m.group(2)

        # Resolver la ruta desde la ubicación antigua del archivo
        raw = (old_file_loc.parent / ipath).resolve()

        # Buscar con extensiones
        new_target = None
        for suffix in ('', '.ts', '.tsx'):
            cand = Path(str(raw) + suffix) if suffix else raw
            if cand in old_to_new:
                new_target = old_to_new[cand]
                break
            if cand.exists():
                new_target = cand
                break

        if new_target is None:
            return m.group(0)

        # Calcular ruta relativa nueva (sin extensión, como convención TS)
        no_ext = new_target.with_suffix('') if new_target.suffix in ('.ts', '.tsx') else new_target
        new_rel = os.path.relpath(str(no_ext), str(file_path.parent))
        new_rel = new_rel.replace('\\', '/')
        if not new_rel.startswith('.'):
            new_rel = './' + new_rel

        if new_rel != ipath:
            changed = True
            return f"{q}{new_rel}{q}"
        return m.group(0)

    new_content = _IMPORT_RE.sub(replacer, content)

    if changed:
        try:
            file_path.write_text(new_content, encoding='utf-8')
            print(f"  imports OK: {file_path.relative_to(file_path.parents[4])}")
        except Exception as e:
            print(f"  ERR escritura {file_path}: {e}")

def process(label, moves, src, repo, all_old_to_new, all_new_to_old):
    print(f"\n{'='*60}")
    print(f"  {label}")
    print(f"{'='*60}")

    old_to_new, new_to_old = build_abs_maps(moves, src)
    all_old_to_new.update(old_to_new)
    all_new_to_old.update(new_to_old)

    print("  [1] Creando directorios...")
    create_dirs(moves, src)

    print("  [2] Moviendo archivos (git mv)...")
    errs = git_mv(moves, src, repo)
    if errs:
        print(f"  {len(errs)} errores en git mv")

    return old_to_new, new_to_old

if __name__ == '__main__':
    all_o2n = {}
    all_n2o = {}

    # Mover archivos
    process("BACKEND", BACKEND_MOVES, BACK, REPO, all_o2n, all_n2o)
    process("FRONTEND (web)", WEB_MOVES, WEB, REPO, all_o2n, all_n2o)

    # Actualizar imports en TODOS los archivos TS de ambos proyectos
    print(f"\n{'='*60}")
    print("  ACTUALIZANDO IMPORTS")
    print(f"{'='*60}")

    all_files = find_ts_files(BACK) + find_ts_files(WEB)
    print(f"  Procesando {len(all_files)} archivos TypeScript...")

    for f in all_files:
        update_imports_in_file(f, all_o2n, all_n2o)

    print("\n  ¡Listo! Verifica con: cd backend && npx tsc --noEmit")
