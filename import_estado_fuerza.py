import pandas as pd
import json
import os

# Configuration
EXCEL_FILE = 'ESTADO DE FUERZA G1 Y G2.xlsx'
RESULT_SQL = 'import_brigadas_final.sql'
SEDES_ROLES_FILE = 'sedes_roles.json'
DEFAULT_PASSWORD_HASH = '$2b$10$rZ7yJhKx5yKv7KjN2QxXqe7X8Y9ZqW0K5L6M4N8P2Q9R3S4T5U6V7' # password123

def load_maps():
    with open(SEDES_ROLES_FILE, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    sedes_map = {s['nombre'].upper(): s['id'] for s in data['sedes']}
    # Add manual mappings based on expected excel values
    sedes_map['CENTRAL'] = sedes_map.get('CENTRAL', 1)
    sedes_map['GUATEMALA'] = sedes_map.get('CENTRAL', 1)
    sedes_map['CHIMALTENANGO'] = sedes_map.get('CENTRAL', 1) # Fallback or specific? Assuming Central unless new sede
    sedes_map['ESCUINTLA'] = sedes_map.get('SEDE SUR', 3) # "Sede Sur" is Escuintla? From migration 3=Sede Sur
    sedes_map['COATEPEQUE'] = sedes_map.get('COATEPEQUE', 6)
    sedes_map['QUETZALTENANGO'] = sedes_map.get('QUETZALTENANGO', 5)
    sedes_map['MAZATENANGO'] = sedes_map.get('MAZATENANGO', 2)
    sedes_map['RIO DULCE'] = sedes_map.get('RIO DULCE', 9)
    sedes_map['MORALES'] = sedes_map.get('MORALES', 8)
    sedes_map['POPTUN'] = sedes_map.get('POPT??N', 3) # Fix encoding match
    sedes_map['SAN CRISTOBAL'] = sedes_map.get('SAN CRIST??BAL', 4)
    # Add more fuzzy matches if needed
    
    roles_map = {r['nombre']: r['id'] for r in data['roles']}
    return sedes_map, roles_map

def clean_text(text):
    if pd.isna(text): return None
    t = str(text).strip()
    return " ".join([w.capitalize() for w in t.split()]) # Better Title Case than .title() regarding apostrophes sometimes, but simple for thisSpanish names


def get_sede_id(sede_str, sedes_map):
    if not sede_str: return None
    sede_upper = sede_str.upper()
    
    # Direct match
    if sede_upper in sedes_map: return sedes_map[sede_upper]
    
    # Partial match
    for name, id in sedes_map.items():
        if name in sede_upper: return id
        
    return 1 # Default to Central

def generate_sql():
    sedes_map, roles_map = load_maps()
    
    sql_statements = []
    
    # Delete existing BRIGADA users
    # sql_statements.append("-- Limpiar brigadas existentes")
    # sql_statements.append("DELETE FROM usuario WHERE rol_id = (SELECT id FROM rol WHERE nombre = 'BRIGADA');")
    
    # Inspect Sheets
    xls = pd.ExcelFile(EXCEL_FILE)
    print(f"Available sheets: {xls.sheet_names}")
    
    # Try to map sheet names roughly
    target_groups = {
        '1': 1,
        '2': 2,
        'UNO': 1,
        'DOS': 2
    }
    
    processed_count = 0
    
    for sheet in xls.sheet_names:
        sheet_upper = sheet.upper()
        grupo_id = 1 # Default
        
        # Determine group from sheet name
        if '1' in sheet or 'UNO' in sheet_upper: grupo_id = 1
        elif '2' in sheet or 'DOS' in sheet_upper: grupo_id = 2
        elif 'BASE' in sheet_upper:
             # Just inspect it
             print(f"Inspecting sheet '{sheet}'...")
             try:
                df = pd.read_excel(xls, sheet_name=sheet)
                print(f"DTO Columns: {df.columns.tolist()}")
                print(f"Rows: {len(df)}")
                print(df.head(1))
             except: pass
             print(f"Skipping sheet {sheet} (no group detected)")
             continue
        else:
            print(f"Skipping sheet {sheet} (no group detected)")
            continue
            
        print(f"Processing sheet '{sheet}' as Grupo {grupo_id}")
        
        try:
            # Read first with no header to find the header row
            df_raw = pd.read_excel(xls, sheet_name=sheet, header=None)
            
            header_idx = -1
            for idx, row in df_raw.iterrows():
                row_str = " ".join([str(val).lower() for val in row.values])
                if "nombre" in row_str and "chapa" in row_str:
                    header_idx = idx
                    break
            
            if header_idx == -1:
                print(f"Could not find header row in {sheet}")
                continue
                
            print(f"Found header at row {header_idx + 1}")
            
            # Re-read with correct header
            df = pd.read_excel(xls, sheet_name=sheet, header=header_idx)
            # Normalize Headers
            df.columns = [str(c).strip().lower() for c in df.columns]
            print(f"Columns found in {sheet}: {df.columns.tolist()}")
            
            for index, row in df.iterrows():
                # Extract Data
                nombre = clean_text(row.get('nombre'))
                chapa = clean_text(row.get('chapa'))
                
                # Debug first row
                if index == 0:
                    print(f"First row sample: Nombre={nombre}, Chapa={chapa}")
                
                if not chapa or not nombre: 
                    # Try to find columns by index if names fail? 
                    # Let's rely on names first.
                    continue 

                sede_dept = clean_text(row.get('sede/depto.'))
                sede_dept = clean_text(row.get('sede/depto.'))
                genero = clean_text(row.get('genero'))
                estado = clean_text(row.get('estado'))
                
                if not chapa or not nombre: continue # Skip empty rows
                
                # Cleanup Chapa (remove .0 if float)
                if chapa.endswith('.0'): chapa = chapa[:-2]
                
                # Convert active status
                activo = 'TRUE' if estado and 'ACTIVO' in estado.upper() else 'FALSE'
                
                # Determine Role
                rol_id = roles_map['BRIGADA']
                if sede_dept and ('COP' in sede_dept.upper() or 'CENTRO DE OPERACIONES' in sede_dept.upper()):
                    rol_id = roles_map['COP']
                
                # Determine Sede
                sede_id = get_sede_id(sede_dept, sedes_map)
                
                # Determine Gender (M/F)
                genero_val = 'M' if genero and 'M' in genero.upper() else 'F' if genero and 'F' in genero.upper() else None
                
                # Username
                username = f"{chapa}".replace(" ", "")
                
                # Generate SQL
                sql = f"""
INSERT INTO usuario (username, password_hash, nombre_completo, chapa, rol_id, sede_id, activo, grupo, genero)
VALUES (
    '{username}',
    '{DEFAULT_PASSWORD_HASH}',
    '{nombre.replace("'", "''")}',
    '{chapa}',
    {rol_id},
    {sede_id},
    {activo},
    {grupo_id},
    {'NULL' if not genero_val else f"'{genero_val}'"}
)
ON CONFLICT (username) DO UPDATE SET
    nombre_completo = EXCLUDED.nombre_completo,
    rol_id = EXCLUDED.rol_id,
    sede_id = EXCLUDED.sede_id,
    activo = EXCLUDED.activo,
    grupo = EXCLUDED.grupo,
    genero = EXCLUDED.genero,
    updated_at = NOW();
"""
                sql_statements.append(sql)
                processed_count += 1
                
        except Exception as e:
            print(f"Error reading sheet {sheet_name}: {e}")

    # Write SQL
    with open(RESULT_SQL, 'w', encoding='utf-8') as f:
        f.write("SET client_encoding = 'UTF8';\n\n")
        f.write("-- Import Estado de Fuerza\n")
        f.write("-- Deactivate old Brigada users first (soft delete)\n")
        f.write("UPDATE usuario SET activo = FALSE WHERE rol_id = (SELECT id FROM rol WHERE nombre = 'BRIGADA');\n\n")
        
        for stmt in sql_statements:
            f.write(stmt)
            
    print(f"Generated {RESULT_SQL} with {processed_count} users.")

if __name__ == '__main__':
    generate_sql()
