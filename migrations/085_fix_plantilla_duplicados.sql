-- Migración 085: Corregir Duplicados en Plantilla 360 y Agregar Opciones N/A
-- Fecha: 2026-01-11
-- Encoding: UTF-8 (ASCII Safe)

-- Desactivar plantilla anterior (la 084)
UPDATE plantilla_inspeccion_360 SET activa = false WHERE activa = true;

-- Insertar nueva versión v5 con correcciones
INSERT INTO plantilla_inspeccion_360 (tipo_unidad, nombre, descripcion, version, secciones, activa, creado_por)
VALUES (
    'DEFAULT',
    'Inspeccion 360 PROVIAL V5',
    'Formulario universal de inspeccion vehicular (Sin duplicados y con N/A)',
    5,
    '[
        {
            "nombre": "Checklist Basico",
            "descripcion": "Verificacion de elementos basicos de la unidad",
            "items": [
                {"codigo": "CB001", "descripcion": "Emblemas", "tipo": "CHECKBOX", "requerido": true},
                {"codigo": "CB003", "descripcion": "Camara Interior", "tipo": "CHECKBOX", "requerido": true},
                {"codigo": "CB004", "descripcion": "Antena de camara frontal", "tipo": "CHECKBOX", "requerido": true},
                {"codigo": "CB006", "descripcion": "Llavero", "tipo": "CHECKBOX", "requerido": true},
                {"codigo": "CB007", "descripcion": "Placas", "tipo": "CHECKBOX", "requerido": true},
                {"codigo": "CB009", "descripcion": "Caja de accesorios metalica", "tipo": "CHECKBOX", "requerido": true},
                {"codigo": "CB012", "descripcion": "Control de Alarma", "tipo": "CHECKBOX", "requerido": true},
                {"codigo": "CB013", "descripcion": "Extintor", "tipo": "CHECKBOX", "requerido": true},
                {"codigo": "CB014", "descripcion": "Triangulos/Conos", "tipo": "CHECKBOX", "requerido": true},
                {"codigo": "CB016", "descripcion": "Luces", "tipo": "CHECKBOX", "requerido": true},
                {"codigo": "CB017", "descripcion": "Neblineras", "tipo": "CHECKBOX", "requerido": true},
                {"codigo": "CB018", "descripcion": "Jalador de faja", "tipo": "CHECKBOX", "requerido": true},
                {"codigo": "CB019", "descripcion": "Marca de Bateria", "tipo": "CHECKBOX", "requerido": true},
                {"codigo": "CB020", "descripcion": "Soporte de Bateria", "tipo": "CHECKBOX", "requerido": true}
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
            "descripcion": "Accesorios del vehiculo",
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
            "nombre": "Reporte de Danios",
            "descripcion": "Registro de danios existentes en la unidad",
            "tipo_seccion": "DANOS",
            "items": [
                {"codigo": "RD002", "descripcion": "Lista de danios", "tipo": "DANOS_LISTA", "requerido": false,
                 "config": {
                    "ubicaciones": ["Derecho", "Izquierdo", "Frente", "Atras", "Arriba", "Abajo"],
                    "clasificaciones": ["Golpe", "Rayon", "Pieza rota", "Falta algo"],
                    "max_fotos": 3
                 }
                }
            ]
        },
        {
            "nombre": "Llaves de Corona Stanley",
            "descripcion": "Marque las llaves que NO esten",
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
            "descripcion": "Marque los desarmadores que NO esten",
            "tiene_ninguna": true,
            "items": [
                {"codigo": "DS001", "descripcion": "Desarmador plano stanley", "tipo": "SELECT", "requerido": true,
                 "opciones": ["Pequenio", "Mediano", "Grande", "Ninguno falta"]},
                {"codigo": "DS002", "descripcion": "Desarmador en cruz stanley", "tipo": "SELECT", "requerido": true,
                 "opciones": ["Pequenio", "Mediano", "Grande", "Ninguno falta"]}
            ]
        },
        {
            "nombre": "Herramientas del Vehiculo",
            "descripcion": "Herramientas presentes",
            "tiene_ninguna": true,
            "items": [
                {"codigo": "HV001", "descripcion": "Cables Para Pasar Corriente", "tipo": "CHECKBOX", "requerido": false},
                {"codigo": "HV002", "descripcion": "Llave de Cruz de 4 Medidas", "tipo": "CHECKBOX", "requerido": false},
                {"codigo": "HV003", "descripcion": "Tricket del Vehiculo", "tipo": "CHECKBOX", "requerido": false},
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
                {"codigo": "AV005", "descripcion": "Botiquin", "tipo": "CHECKBOX", "requerido": false},
                {"codigo": "AV006", "descripcion": "2 Linternas marca RAYOVAC", "tipo": "CHECKBOX", "requerido": false},
                {"codigo": "AV007", "descripcion": "Faja para jalar vehiculos", "tipo": "CHECKBOX", "requerido": false}
            ]
        },
        {
            "nombre": "Parabrisas",
            "descripcion": "Estado del parabrisas",
            "items": [
                {"codigo": "PB001", "descripcion": "Derecha", "tipo": "ESTADO", "opciones": ["BUENO", "REGULAR", "MALO", "N/A"], "requerido": true},
                {"codigo": "PB002", "descripcion": "Izquierda", "tipo": "ESTADO", "opciones": ["BUENO", "REGULAR", "MALO", "N/A"], "requerido": true}
            ]
        },
        {
            "nombre": "Niveles de Liquido",
            "descripcion": "Revision de niveles",
            "items": [
                {"codigo": "NL001", "descripcion": "Aceite de Motor", "tipo": "ESTADO", "opciones": ["FULL", "MEDIO", "BAJO", "N/A"], "requerido": true},
                {"codigo": "NL002", "descripcion": "Aceite Hidraulico", "tipo": "ESTADO", "opciones": ["FULL", "MEDIO", "BAJO", "N/A"], "requerido": true},
                {"codigo": "NL003", "descripcion": "Liquido de Frenos", "tipo": "ESTADO", "opciones": ["FULL", "MEDIO", "BAJO", "N/A"], "requerido": true},
                {"codigo": "NL004", "descripcion": "Nivel de Agua de Radiador", "tipo": "ESTADO", "opciones": ["FULL", "MEDIO", "BAJO", "N/A"], "requerido": true},
                {"codigo": "NL005", "descripcion": "Nivel Agua de limpia brisas", "tipo": "ESTADO", "opciones": ["FULL", "MEDIO", "BAJO", "N/A"], "requerido": true}
            ]
        },
        {
            "nombre": "Control de Llantas",
            "descripcion": "Estado de las llantas",
            "items": [
                {"codigo": "CL001", "descripcion": "Delantera Derecha", "tipo": "ESTADO_OBS", "opciones": ["BUENO", "REGULAR", "MALO", "N/A"], "requerido": true},
                {"codigo": "CL002", "descripcion": "Delantera Izquierda", "tipo": "ESTADO_OBS", "opciones": ["BUENO", "REGULAR", "MALO", "N/A"], "requerido": true},
                {"codigo": "CL003", "descripcion": "Trasera Derecha", "tipo": "ESTADO_OBS", "opciones": ["BUENO", "REGULAR", "MALO", "N/A"], "requerido": true},
                {"codigo": "CL004", "descripcion": "Trasera Izquierda", "tipo": "ESTADO_OBS", "opciones": ["BUENO", "REGULAR", "MALO", "N/A"], "requerido": true},
                {"codigo": "CL005", "descripcion": "Repuesto", "tipo": "ESTADO_OBS", "opciones": ["BUENO", "REGULAR", "MALO", "N/A"], "requerido": true},
                {"codigo": "CL006", "descripcion": "04 Tapones de Aros (pickup)", "tipo": "ESTADO_OBS", "opciones": ["BUENO", "REGULAR", "MALO", "N/A"], "requerido": false},
                {"codigo": "CL007", "descripcion": "04 Platos (sedan)", "tipo": "ESTADO_OBS", "opciones": ["BUENO", "REGULAR", "MALO", "N/A"], "requerido": false},
                {"codigo": "CL008", "descripcion": "Aros", "tipo": "ESTADO_OBS", "opciones": ["BUENO", "REGULAR", "MALO", "N/A"], "requerido": true}
            ]
        },
        {
            "nombre": "Control Interno de Unidad",
            "descripcion": "Estado del interior del vehiculo",
            "items": [
                {"codigo": "CI001", "descripcion": "Encendedor de Cigarros", "tipo": "ESTADO", "opciones": ["BUENO", "REGULAR", "MALO", "N/A"], "requerido": true},
                {"codigo": "CI002", "descripcion": "Radio Musical", "tipo": "ESTADO", "opciones": ["BUENO", "REGULAR", "MALO", "N/A"], "requerido": true},
                {"codigo": "CI003", "descripcion": "Disco dentro del Reproductor", "tipo": "CHECKBOX", "requerido": false},
                {"codigo": "CI004", "descripcion": "Emisoras", "tipo": "ESTADO", "opciones": ["BUENO", "REGULAR", "MALO", "N/A"], "requerido": true},
                {"codigo": "CI005", "descripcion": "Reloj", "tipo": "ESTADO", "opciones": ["BUENO", "REGULAR", "MALO", "N/A"], "requerido": true},
                {"codigo": "CI006", "descripcion": "Retrovisor Central", "tipo": "ESTADO", "opciones": ["BUENO", "REGULAR", "MALO", "N/A"], "requerido": true},
                {"codigo": "CI007", "descripcion": "Retrovisores Laterales", "tipo": "ESTADO", "opciones": ["BUENO", "REGULAR", "MALO", "N/A"], "requerido": true},
                {"codigo": "CI008", "descripcion": "Aire Acondicionado", "tipo": "ESTADO", "opciones": ["BUENO", "REGULAR", "MALO", "N/A"], "requerido": true},
                {"codigo": "CI009", "descripcion": "Calefactor", "tipo": "ESTADO", "opciones": ["BUENO", "REGULAR", "MALO", "N/A"], "requerido": true},
                {"codigo": "CI010", "descripcion": "Ventilador", "tipo": "ESTADO", "opciones": ["BUENO", "REGULAR", "MALO", "N/A"], "requerido": true},
                {"codigo": "CI011", "descripcion": "Tapon de Combustible", "tipo": "ESTADO", "opciones": ["BUENO", "REGULAR", "MALO", "N/A"], "requerido": true},
                {"codigo": "CI012", "descripcion": "Antena Radio Musical", "tipo": "ESTADO", "opciones": ["BUENO", "REGULAR", "MALO", "N/A"], "requerido": true},
                {"codigo": "CI013", "descripcion": "Porta Vasos", "tipo": "ESTADO", "opciones": ["BUENO", "REGULAR", "MALO", "N/A"], "requerido": true}
            ]
        },
        {
            "nombre": "Control del Winch",
            "descripcion": "Estado del sistema de winch (si aplica)",
            "items": [
                {"codigo": "CW001", "descripcion": "Funcion Out", "tipo": "ESTADO_OBS", "opciones": ["BUENO", "REGULAR", "MALO", "N/A"], "requerido": false},
                {"codigo": "CW002", "descripcion": "Funcion In", "tipo": "ESTADO_OBS", "opciones": ["BUENO", "REGULAR", "MALO", "N/A"], "requerido": false},
                {"codigo": "CW003", "descripcion": "Swich Negro", "tipo": "ESTADO_OBS", "opciones": ["BUENO", "REGULAR", "MALO", "N/A"], "requerido": false},
                {"codigo": "CW004", "descripcion": "Swich Rojo", "tipo": "ESTADO_OBS", "opciones": ["BUENO", "REGULAR", "MALO", "N/A"], "requerido": false},
                {"codigo": "CW005", "descripcion": "Cable de Acero", "tipo": "ESTADO_OBS", "opciones": ["BUENO", "REGULAR", "MALO", "N/A"], "requerido": false},
                {"codigo": "CW006", "descripcion": "Guantes", "tipo": "ESTADO_OBS", "opciones": ["BUENO", "REGULAR", "MALO", "N/A"], "requerido": false},
                {"codigo": "CW007", "descripcion": "Cable de Control", "tipo": "ESTADO_OBS", "opciones": ["BUENO", "REGULAR", "MALO", "N/A"], "requerido": false},
                {"codigo": "CW008", "descripcion": "Trozos o Cunias", "tipo": "ESTADO_OBS", "opciones": ["BUENO", "REGULAR", "MALO", "N/A"], "requerido": false}
            ]
        },
        {
            "nombre": "Terminales de Baterias",
            "descripcion": "Estado de conexiones de bateria",
            "items": [
                {"codigo": "TB001", "descripcion": "Positivo", "tipo": "ESTADO_OBS", "opciones": ["BUENO", "REGULAR", "MALO", "N/A"], "requerido": true},
                {"codigo": "TB002", "descripcion": "Negativo", "tipo": "ESTADO_OBS", "opciones": ["BUENO", "REGULAR", "MALO", "N/A"], "requerido": true}
            ]
        },
        {
            "nombre": "Alfombras",
            "descripcion": "Estado de las alfombras",
            "items": [
                {"codigo": "AL001", "descripcion": "Delantera izquierda", "tipo": "ESTADO", "opciones": ["BUENO", "REGULAR", "MALO", "N/A"], "requerido": true},
                {"codigo": "AL002", "descripcion": "Delantera derecha", "tipo": "ESTADO", "opciones": ["BUENO", "REGULAR", "MALO", "N/A"], "requerido": true},
                {"codigo": "AL003", "descripcion": "Traseras", "tipo": "ESTADO", "opciones": ["BUENO", "REGULAR", "MALO", "N/A"], "requerido": true}
            ]
        },
        {
            "nombre": "Cremalleras para las Puertas",
            "descripcion": "Estado de las cremalleras",
            "items": [
                {"codigo": "CP001", "descripcion": "Puerta derecha delantera", "tipo": "ESTADO", "opciones": ["BUENO", "REGULAR", "MALO", "N/A"], "requerido": true},
                {"codigo": "CP002", "descripcion": "Puerta derecha trasera", "tipo": "ESTADO", "opciones": ["BUENO", "REGULAR", "MALO", "N/A"], "requerido": true},
                {"codigo": "CP003", "descripcion": "Puerta izquierda delantera", "tipo": "ESTADO", "opciones": ["BUENO", "REGULAR", "MALO", "N/A"], "requerido": true},
                {"codigo": "CP004", "descripcion": "Puerta izquierda trasera", "tipo": "ESTADO", "opciones": ["BUENO", "REGULAR", "MALO", "N/A"], "requerido": true}
            ]
        },
        {
            "nombre": "Observaciones Generales",
            "descripcion": "Cualquier observacion adicional",
            "items": [
                {"codigo": "OG001", "descripcion": "Observaciones", "tipo": "TEXTO", "requerido": false}
            ]
        }
    ]'::JSONB,
    TRUE,
    1
);

SELECT 'Plantilla 360 V5 (Sin Duplicados y con N/A) Aplicada' as resultado;
