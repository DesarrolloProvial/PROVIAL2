-- Migración 081: Actualizar plantilla de Inspección 360 con nuevo formato PROVIAL
-- Fecha: 2026-01-10
-- Este formulario es UNIVERSAL para todas las unidades durante la fase de pruebas

-- ========================================
-- 1. DESACTIVAR PLANTILLAS ANTERIORES
-- ========================================

UPDATE plantilla_inspeccion_360 SET activa = false WHERE activa = true;

-- ========================================
-- 2. CREAR NUEVA PLANTILLA UNIVERSAL
-- ========================================

INSERT INTO plantilla_inspeccion_360 (tipo_unidad, nombre, descripcion, version, secciones, activa)
VALUES (
    'DEFAULT',
    'Inspección 360 PROVIAL',
    'Formulario universal de inspección vehicular para todas las unidades',
    2,
    '[
        {
            "nombre": "Checklist Básico",
            "descripcion": "Verificación de elementos básicos de la unidad",
            "items": [
                {"codigo": "CB001", "descripcion": "Emblemas", "tipo": "CHECKBOX", "requerido": true},
                {"codigo": "CB002", "descripcion": "Encendedor de cigarros", "tipo": "CHECKBOX", "requerido": true},
                {"codigo": "CB003", "descripcion": "Cámara Interior", "tipo": "CHECKBOX", "requerido": true},
                {"codigo": "CB004", "descripcion": "Antena de cámara frontal", "tipo": "CHECKBOX", "requerido": true},
                {"codigo": "CB005", "descripcion": "Antena de radio musical", "tipo": "CHECKBOX", "requerido": true},
                {"codigo": "CB006", "descripcion": "Llavero", "tipo": "CHECKBOX", "requerido": true},
                {"codigo": "CB007", "descripcion": "Placas", "tipo": "CHECKBOX", "requerido": true},
                {"codigo": "CB008", "descripcion": "Radio", "tipo": "CHECKBOX", "requerido": true},
                {"codigo": "CB009", "descripcion": "Caja de accesorios metálica", "tipo": "CHECKBOX", "requerido": true},
                {"codigo": "CB010", "descripcion": "Tapón de Gas", "tipo": "CHECKBOX", "requerido": true},
                {"codigo": "CB011", "descripcion": "Alfombras", "tipo": "CHECKBOX", "requerido": true},
                {"codigo": "CB012", "descripcion": "Control de Alarma", "tipo": "CHECKBOX", "requerido": true},
                {"codigo": "CB013", "descripcion": "Extintor", "tipo": "CHECKBOX", "requerido": true},
                {"codigo": "CB014", "descripcion": "Triángulos/Conos", "tipo": "CHECKBOX", "requerido": true},
                {"codigo": "CB015", "descripcion": "Vidrios Eléctricos y/o manuales", "tipo": "CHECKBOX", "requerido": true},
                {"codigo": "CB016", "descripcion": "Luces", "tipo": "CHECKBOX", "requerido": true},
                {"codigo": "CB017", "descripcion": "Neblineras", "tipo": "CHECKBOX", "requerido": true},
                {"codigo": "CB018", "descripcion": "Jalador de faja", "tipo": "CHECKBOX", "requerido": true},
                {"codigo": "CB019", "descripcion": "Marca de Batería", "tipo": "CHECKBOX", "requerido": true},
                {"codigo": "CB020", "descripcion": "Soporte de Batería", "tipo": "CHECKBOX", "requerido": true}
            ]
        },
        {
            "nombre": "Balizas y Sonidos",
            "descripcion": "Estado de sistemas de emergencia",
            "items": [
                {"codigo": "BS001", "descripcion": "BALIZAS", "tipo": "CHECKBOX", "requerido": true},
                {"codigo": "BS002", "descripcion": "SONIDOS", "tipo": "CHECKBOX", "requerido": true}
            ]
        },
        {
            "nombre": "Accesorios",
            "descripcion": "Accesorios del vehículo",
            "items": [
                {"codigo": "AC001", "descripcion": "Llanta de Repuesto", "tipo": "CHECKBOX", "requerido": true},
                {"codigo": "AC002", "descripcion": "Llave de Ruedas/Chuchos", "tipo": "CHECKBOX", "requerido": true},
                {"codigo": "AC003", "descripcion": "Tricket", "tipo": "CHECKBOX", "requerido": true},
                {"codigo": "AC004", "descripcion": "POLIZA DE VEHICULO", "tipo": "CHECKBOX", "requerido": true},
                {"codigo": "AC005", "descripcion": "Defensa de tubo", "tipo": "CHECKBOX", "requerido": true},
                {"codigo": "AC006", "descripcion": "Observaciones de accesorios", "tipo": "TEXTO", "requerido": false}
            ]
        },
        {
            "nombre": "Reporte de Daños",
            "descripcion": "Registro de daños existentes en la unidad",
            "tipo_seccion": "DANOS",
            "items": [
                {"codigo": "RD001", "descripcion": "Sin daños", "tipo": "CHECKBOX_BLOQUEO", "requerido": false},
                {"codigo": "RD002", "descripcion": "Lista de daños", "tipo": "DANOS_LISTA", "requerido": false,
                 "config": {
                    "ubicaciones": ["Derecho", "Izquierdo", "Frente", "Atrás", "Arriba", "Abajo"],
                    "clasificaciones": ["Golpe", "Rayón", "Pieza rota", "Falta algo"],
                    "max_fotos": 3
                 }
                }
            ]
        },
        {
            "nombre": "Llaves de Corona Stanley",
            "descripcion": "Marque las llaves que NO estén",
            "tiene_ninguna": true,
            "items": [
                {"codigo": "LC001", "descripcion": "Llave 8", "tipo": "CHECKBOX", "requerido": false},
                {"codigo": "LC002", "descripcion": "Llave 9", "tipo": "CHECKBOX", "requerido": false},
                {"codigo": "LC003", "descripcion": "Llave 10", "tipo": "CHECKBOX", "requerido": false},
                {"codigo": "LC004", "descripcion": "Llave 11", "tipo": "CHECKBOX", "requerido": false},
                {"codigo": "LC005", "descripcion": "Llave 12", "tipo": "CHECKBOX", "requerido": false},
                {"codigo": "LC006", "descripcion": "Llave 13", "tipo": "CHECKBOX", "requerido": false},
                {"codigo": "LC007", "descripcion": "Llave 14", "tipo": "CHECKBOX", "requerido": false},
                {"codigo": "LC008", "descripcion": "Llave 15", "tipo": "CHECKBOX", "requerido": false},
                {"codigo": "LC009", "descripcion": "Llave 16", "tipo": "CHECKBOX", "requerido": false},
                {"codigo": "LC010", "descripcion": "Llave 17", "tipo": "CHECKBOX", "requerido": false},
                {"codigo": "LC011", "descripcion": "Llave 18", "tipo": "CHECKBOX", "requerido": false},
                {"codigo": "LC012", "descripcion": "Llave 19", "tipo": "CHECKBOX", "requerido": false}
            ]
        },
        {
            "nombre": "Desarmadores",
            "descripcion": "Marque los desarmadores que NO estén",
            "tiene_ninguna": true,
            "items": [
                {"codigo": "DS001", "descripcion": "Desarmador plano stanley", "tipo": "SELECT", "requerido": true,
                 "opciones": ["Pequeño", "Mediano", "Grande", "Ninguno falta"]},
                {"codigo": "DS002", "descripcion": "Desarmador en cruz stanley", "tipo": "SELECT", "requerido": true,
                 "opciones": ["Pequeño", "Mediano", "Grande", "Ninguno falta"]}
            ]
        },
        {
            "nombre": "Herramientas del Vehículo",
            "descripcion": "Herramientas presentes",
            "tiene_ninguna": true,
            "items": [
                {"codigo": "HV001", "descripcion": "Cables Para Pasar Corriente", "tipo": "CHECKBOX", "requerido": false},
                {"codigo": "HV002", "descripcion": "Llave de Cruz de 4 Medidas", "tipo": "CHECKBOX", "requerido": false},
                {"codigo": "HV003", "descripcion": "Tricket del Vehículo", "tipo": "CHECKBOX", "requerido": false},
                {"codigo": "HV004", "descripcion": "Llave de Chuchos del Vehiculo", "tipo": "CHECKBOX", "requerido": false},
                {"codigo": "HV005", "descripcion": "Varilla del Tricket", "tipo": "CHECKBOX", "requerido": false}
            ]
        },
        {
            "nombre": "Accesorios para Asistencia Vial",
            "descripcion": "Equipamiento de asistencia",
            "tiene_ninguna": true,
            "items": [
                {"codigo": "AV001", "descripcion": "2 Galones con Agua", "tipo": "CHECKBOX", "requerido": false},
                {"codigo": "AV002", "descripcion": "8 Conos Reflectivos", "tipo": "CHECKBOX", "requerido": false},
                {"codigo": "AV003", "descripcion": "Cinta Perimetral", "tipo": "CHECKBOX", "requerido": false},
                {"codigo": "AV004", "descripcion": "Extinguidor", "tipo": "CHECKBOX", "requerido": false},
                {"codigo": "AV005", "descripcion": "Botiquín", "tipo": "CHECKBOX", "requerido": false},
                {"codigo": "AV006", "descripcion": "2 Linternas marca RAYOVAC", "tipo": "CHECKBOX", "requerido": false},
                {"codigo": "AV007", "descripcion": "Faja para jalar vehículos", "tipo": "CHECKBOX", "requerido": false}
            ]
        },
        {
            "nombre": "Parabrisas",
            "descripcion": "Estado del parabrisas",
            "items": [
                {"codigo": "PB001", "descripcion": "Derecha", "tipo": "ESTADO", "opciones": ["BUENO", "REGULAR", "MALO"], "requerido": true},
                {"codigo": "PB002", "descripcion": "Izquierda", "tipo": "ESTADO", "opciones": ["BUENO", "REGULAR", "MALO"], "requerido": true}
            ]
        },
        {
            "nombre": "Niveles de Líquido",
            "descripcion": "Revisión de niveles",
            "items": [
                {"codigo": "NL001", "descripcion": "Aceite de Motor", "tipo": "ESTADO", "opciones": ["FULL", "MEDIO", "BAJO"], "requerido": true},
                {"codigo": "NL002", "descripcion": "Aceite Hidráulico", "tipo": "ESTADO", "opciones": ["FULL", "MEDIO", "BAJO"], "requerido": true},
                {"codigo": "NL003", "descripcion": "Líquido de Frenos", "tipo": "ESTADO", "opciones": ["FULL", "MEDIO", "BAJO"], "requerido": true},
                {"codigo": "NL004", "descripcion": "Nivel de Agua de Radiador", "tipo": "ESTADO", "opciones": ["FULL", "MEDIO", "BAJO"], "requerido": true},
                {"codigo": "NL005", "descripcion": "Nivel Agua de limpia brisas", "tipo": "ESTADO", "opciones": ["FULL", "MEDIO", "BAJO"], "requerido": true}
            ]
        },
        {
            "nombre": "Control de Llantas",
            "descripcion": "Estado de las llantas",
            "items": [
                {"codigo": "CL001", "descripcion": "Delantera Derecha", "tipo": "ESTADO_OBS", "opciones": ["BUENO", "REGULAR", "MALO"], "requerido": true},
                {"codigo": "CL002", "descripcion": "Delantera Izquierda", "tipo": "ESTADO_OBS", "opciones": ["BUENO", "REGULAR", "MALO"], "requerido": true},
                {"codigo": "CL003", "descripcion": "Trasera Derecha", "tipo": "ESTADO_OBS", "opciones": ["BUENO", "REGULAR", "MALO"], "requerido": true},
                {"codigo": "CL004", "descripcion": "Trasera Izquierda", "tipo": "ESTADO_OBS", "opciones": ["BUENO", "REGULAR", "MALO"], "requerido": true},
                {"codigo": "CL005", "descripcion": "Repuesto", "tipo": "ESTADO_OBS", "opciones": ["BUENO", "REGULAR", "MALO"], "requerido": true},
                {"codigo": "CL006", "descripcion": "04 Tapones de Aros (pickup)", "tipo": "ESTADO_OBS", "opciones": ["BUENO", "REGULAR", "MALO", "N/A"], "requerido": false},
                {"codigo": "CL007", "descripcion": "04 Platos (sedán)", "tipo": "ESTADO_OBS", "opciones": ["BUENO", "REGULAR", "MALO", "N/A"], "requerido": false},
                {"codigo": "CL008", "descripcion": "Aros", "tipo": "ESTADO_OBS", "opciones": ["BUENO", "REGULAR", "MALO"], "requerido": true}
            ]
        },
        {
            "nombre": "Control Interno de Unidad",
            "descripcion": "Estado del interior del vehículo",
            "items": [
                {"codigo": "CI001", "descripcion": "Encendedor de Cigarros", "tipo": "ESTADO", "opciones": ["BUENO", "REGULAR", "MALO"], "requerido": true},
                {"codigo": "CI002", "descripcion": "Radio Musical", "tipo": "ESTADO", "opciones": ["BUENO", "REGULAR", "MALO"], "requerido": true},
                {"codigo": "CI003", "descripcion": "Disco dentro del Reproductor", "tipo": "CHECKBOX", "requerido": false},
                {"codigo": "CI004", "descripcion": "Emisoras", "tipo": "ESTADO", "opciones": ["BUENO", "REGULAR", "MALO"], "requerido": true},
                {"codigo": "CI005", "descripcion": "Reloj", "tipo": "ESTADO", "opciones": ["BUENO", "REGULAR", "MALO"], "requerido": true},
                {"codigo": "CI006", "descripcion": "Retrovisor Central", "tipo": "ESTADO", "opciones": ["BUENO", "REGULAR", "MALO"], "requerido": true},
                {"codigo": "CI007", "descripcion": "Retrovisores Laterales", "tipo": "ESTADO", "opciones": ["BUENO", "REGULAR", "MALO"], "requerido": true},
                {"codigo": "CI008", "descripcion": "Aire Acondicionado", "tipo": "ESTADO", "opciones": ["BUENO", "REGULAR", "MALO"], "requerido": true},
                {"codigo": "CI009", "descripcion": "Calefactor", "tipo": "ESTADO", "opciones": ["BUENO", "REGULAR", "MALO"], "requerido": true},
                {"codigo": "CI010", "descripcion": "Ventilador", "tipo": "ESTADO", "opciones": ["BUENO", "REGULAR", "MALO"], "requerido": true},
                {"codigo": "CI011", "descripcion": "Tapón de Combustible", "tipo": "ESTADO", "opciones": ["BUENO", "REGULAR", "MALO"], "requerido": true},
                {"codigo": "CI012", "descripcion": "Antena Radio Musical", "tipo": "ESTADO", "opciones": ["BUENO", "REGULAR", "MALO"], "requerido": true},
                {"codigo": "CI013", "descripcion": "Porta Vasos", "tipo": "ESTADO", "opciones": ["BUENO", "REGULAR", "MALO"], "requerido": true}
            ]
        },
        {
            "nombre": "Control del Winch",
            "descripcion": "Estado del sistema de winch (si aplica)",
            "items": [
                {"codigo": "CW001", "descripcion": "Función Out", "tipo": "ESTADO_OBS", "opciones": ["BUENO", "REGULAR", "MALO", "N/A"], "requerido": false},
                {"codigo": "CW002", "descripcion": "Función In", "tipo": "ESTADO_OBS", "opciones": ["BUENO", "REGULAR", "MALO", "N/A"], "requerido": false},
                {"codigo": "CW003", "descripcion": "Swich Negro", "tipo": "ESTADO_OBS", "opciones": ["BUENO", "REGULAR", "MALO", "N/A"], "requerido": false},
                {"codigo": "CW004", "descripcion": "Swich Rojo", "tipo": "ESTADO_OBS", "opciones": ["BUENO", "REGULAR", "MALO", "N/A"], "requerido": false},
                {"codigo": "CW005", "descripcion": "Cable de Acero", "tipo": "ESTADO_OBS", "opciones": ["BUENO", "REGULAR", "MALO", "N/A"], "requerido": false},
                {"codigo": "CW006", "descripcion": "Guantes", "tipo": "ESTADO_OBS", "opciones": ["BUENO", "REGULAR", "MALO", "N/A"], "requerido": false},
                {"codigo": "CW007", "descripcion": "Cable de Control", "tipo": "ESTADO_OBS", "opciones": ["BUENO", "REGULAR", "MALO", "N/A"], "requerido": false},
                {"codigo": "CW008", "descripcion": "Trozos o Cuñas", "tipo": "ESTADO_OBS", "opciones": ["BUENO", "REGULAR", "MALO", "N/A"], "requerido": false}
            ]
        },
        {
            "nombre": "Terminales de Baterías",
            "descripcion": "Estado de conexiones de batería",
            "items": [
                {"codigo": "TB001", "descripcion": "Positivo", "tipo": "ESTADO_OBS", "opciones": ["BUENO", "REGULAR", "MALO"], "requerido": true},
                {"codigo": "TB002", "descripcion": "Negativo", "tipo": "ESTADO_OBS", "opciones": ["BUENO", "REGULAR", "MALO"], "requerido": true}
            ]
        },
        {
            "nombre": "Alfombras",
            "descripcion": "Estado de las alfombras",
            "items": [
                {"codigo": "AL001", "descripcion": "Delantera izquierda", "tipo": "ESTADO", "opciones": ["BUENO", "REGULAR", "MALO"], "requerido": true},
                {"codigo": "AL002", "descripcion": "Delantera derecha", "tipo": "ESTADO", "opciones": ["BUENO", "REGULAR", "MALO"], "requerido": true},
                {"codigo": "AL003", "descripcion": "Traseras", "tipo": "ESTADO", "opciones": ["BUENO", "REGULAR", "MALO"], "requerido": true}
            ]
        },
        {
            "nombre": "Cremalleras para las Puertas",
            "descripcion": "Estado de las cremalleras",
            "items": [
                {"codigo": "CP001", "descripcion": "Puerta derecha delantera", "tipo": "ESTADO", "opciones": ["BUENO", "REGULAR", "MALO"], "requerido": true},
                {"codigo": "CP002", "descripcion": "Puerta derecha trasera", "tipo": "ESTADO", "opciones": ["BUENO", "REGULAR", "MALO"], "requerido": true},
                {"codigo": "CP003", "descripcion": "Puerta izquierda delantera", "tipo": "ESTADO", "opciones": ["BUENO", "REGULAR", "MALO"], "requerido": true},
                {"codigo": "CP004", "descripcion": "Puerta izquierda trasera", "tipo": "ESTADO", "opciones": ["BUENO", "REGULAR", "MALO"], "requerido": true}
            ]
        },
        {
            "nombre": "Observaciones Generales",
            "descripcion": "Cualquier observación adicional",
            "items": [
                {"codigo": "OG001", "descripcion": "Observaciones", "tipo": "TEXTO", "requerido": false}
            ]
        }
    ]'::JSONB,
    true
);

-- ========================================
-- 3. CONFIRMACIÓN
-- ========================================

SELECT 'Migración 081 completada: Nueva plantilla 360 PROVIAL universal creada' AS resultado;

-- Verificar
SELECT id, tipo_unidad, nombre, version, activa 
FROM plantilla_inspeccion_360 
ORDER BY activa DESC, id DESC;
