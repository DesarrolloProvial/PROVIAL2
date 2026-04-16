import { Plus, Trash2, Minus } from 'lucide-react';
import { TIPOS_VEHICULO } from '../../constants/situacionTypes';

interface Props {
  activityTypeName: string;
  datos: Record<string, any>;
  onDatosChange: (datos: Record<string, any>) => void;
  unidades?: any[];
}

const TIEMPOS_COMIDA = ['Desayuno', 'Almuerzo', 'Cena'];
const TIPOS_CONSIGNACION = ['VEHICULO', 'PILOTO', 'AMBOS'];
const VEHICULOS_CONTEO = [
  'Motocicleta', 'Sedan', 'Pick-up', 'Camión', 'Bus', 'Cabezal',
  'Rastra', 'Microbus', 'Bicicleta', 'Mototaxi', 'Panel', 'Otro',
];

export default function DynamicActivityFields({ activityTypeName, datos, onDatosChange, unidades = [] }: Props) {
  const name = activityTypeName;
  const set = (field: string, value: any) => onDatosChange({ ...datos, [field]: value });

  // ── Conteo vehicular ──
  if (name === 'Conteo vehicular') {
    const conteos = datos.conteos || {};
    const setConteo = (tipo: string, delta: number) => {
      const cur = conteos[tipo] || 0;
      const next = Math.max(0, cur + delta);
      onDatosChange({ ...datos, conteos: { ...conteos, [tipo]: next } });
    };
    return (
      <div>
        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Conteo por tipo de vehiculo</h4>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {VEHICULOS_CONTEO.map(tipo => (
            <div key={tipo} className="flex items-center justify-between bg-gray-50 dark:bg-gray-700/50 rounded-lg p-2">
              <span className="text-sm text-gray-700 dark:text-gray-300 truncate">{tipo}</span>
              <div className="flex items-center gap-1">
                <button type="button" onClick={() => setConteo(tipo, -1)}
                  className="w-7 h-7 flex items-center justify-center bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded hover:bg-red-200 dark:hover:bg-red-900/50">
                  <Minus className="w-3 h-3" />
                </button>
                <span className="w-8 text-center font-bold text-sm dark:text-gray-200">{conteos[tipo] || 0}</span>
                <button type="button" onClick={() => setConteo(tipo, 1)}
                  className="w-7 h-7 flex items-center justify-center bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded hover:bg-green-200 dark:hover:bg-green-900/50">
                  <Plus className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── Toma de velocidad ──
  if (name === 'Toma de velocidad') {
    const velocidades: any[] = datos.velocidades || [];
    const tempTipo = datos._tempTipo || '';
    const tempVel = datos._tempVel || '';
    const addVelocidad = () => {
      if (!tempTipo || !tempVel) return;
      onDatosChange({
        ...datos,
        velocidades: [...velocidades, { tipo: tempTipo, velocidad: parseFloat(tempVel) }],
        _tempTipo: '', _tempVel: '',
      });
    };
    return (
      <div>
        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Registros de velocidad</h4>
        <div className="flex gap-2 mb-3">
          <select value={tempTipo} onChange={e => set('_tempTipo', e.target.value)}
            className="flex-1 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">
            <option value="">Tipo vehiculo</option>
            {TIPOS_VEHICULO.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <input type="number" placeholder="km/h" value={tempVel}
            onChange={e => set('_tempVel', e.target.value)}
            className="w-24 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
          <button type="button" onClick={addVelocidad}
            className="px-3 py-2 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600">
            <Plus className="w-4 h-4" />
          </button>
        </div>
        {velocidades.length > 0 && (
          <div className="space-y-1">
            {velocidades.map((v: any, i: number) => (
              <div key={i} className="flex items-center justify-between bg-gray-50 dark:bg-gray-700/50 rounded-lg px-3 py-2 text-sm">
                <span className="dark:text-gray-300">{v.tipo} - {v.velocidad} km/h</span>
                <button type="button"
                  onClick={() => onDatosChange({ ...datos, velocidades: velocidades.filter((_: any, j: number) => j !== i) })}
                  className="text-red-500 hover:text-red-700">
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ── Supervisando unidad ──
  if (name === 'Supervisando unidad') {
    return (
      <div>
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">Unidad supervisada</label>
        <select value={datos.unidad_supervisada_id || ''}
          onChange={e => set('unidad_supervisada_id', e.target.value ? Number(e.target.value) : null)}
          className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">
          <option value="">Seleccionar unidad...</option>
          {unidades.map((u: any) => (
            <option key={u.unidad_id} value={u.unidad_id}>
              {u.unidad_codigo} - {u.sede_nombre || 'Sin sede'}
            </option>
          ))}
        </select>
      </div>
    );
  }

  // ── Escoltando carga ancha ──
  if (name === 'Escoltando carga ancha') {
    return (
      <div className="space-y-3">
        <TextInput label="Empresa" value={datos.empresa} onChange={v => set('empresa', v)} />
        <TextInput label="Nombre Piloto" value={datos.piloto} onChange={v => set('piloto', v)} />
        <TextInput label="Datos Vehiculo" value={datos.vehiculo_datos} onChange={v => set('vehiculo_datos', v)} />
        <TextInput label="Motivo" value={datos.motivo} onChange={v => set('motivo', v)} />
        <TextInput label="Punto Inicio" value={datos.punto_inicio} onChange={v => set('punto_inicio', v)} />
        <TextInput label="Punto Fin" value={datos.punto_fin} onChange={v => set('punto_fin', v)} />
      </div>
    );
  }

  // ── Operativos / Puesto de Control ──
  if (name.includes('Operativo') || name === 'Puesto de Control') {
    const llamadas: any[] = datos.llamadas_detalles || [];
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <NumberInput label="Vehiculos Registrados" value={datos.registrados} onChange={v => set('registrados', v)} />
          <NumberInput label="Sanciones Impuestas" value={datos.sanciones} onChange={v => set('sanciones', v)} />
        </div>
        <TextInput label="Autoridad presente" value={datos.autoridad} onChange={v => set('autoridad', v)} />
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Llamadas de Atencion ({llamadas.length})</label>
            <button type="button"
              onClick={() => onDatosChange({ ...datos, llamadas_detalles: [...llamadas, { motivo: '', piloto: '', vehiculo: '' }] })}
              className="text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600 flex items-center gap-1">
              <Plus className="w-3 h-3" /> Agregar
            </button>
          </div>
          {llamadas.map((ll: any, i: number) => (
            <div key={i} className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 mb-2 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">Llamada #{i + 1}</span>
                <button type="button"
                  onClick={() => onDatosChange({ ...datos, llamadas_detalles: llamadas.filter((_: any, j: number) => j !== i) })}
                  className="text-red-400 hover:text-red-600"><Trash2 className="w-3 h-3" /></button>
              </div>
              <input type="text" placeholder="Motivo" value={ll.motivo || ''}
                onChange={e => { const u = [...llamadas]; u[i] = { ...u[i], motivo: e.target.value }; onDatosChange({ ...datos, llamadas_detalles: u }); }}
                className="w-full border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
              <div className="grid grid-cols-2 gap-2">
                <input type="text" placeholder="Piloto" value={ll.piloto || ''}
                  onChange={e => { const u = [...llamadas]; u[i] = { ...u[i], piloto: e.target.value }; onDatosChange({ ...datos, llamadas_detalles: u }); }}
                  className="border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
                <input type="text" placeholder="Vehiculo" value={ll.vehiculo || ''}
                  onChange={e => { const u = [...llamadas]; u[i] = { ...u[i], vehiculo: e.target.value }; onDatosChange({ ...datos, llamadas_detalles: u }); }}
                  className="border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── Consignación ──
  if (name === 'Consignación') {
    return (
      <div className="space-y-3">
        <TextInput label="Motivo Consignacion" value={datos.motivo} onChange={v => set('motivo', v)} />
        <div>
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">Tipo Consignacion</label>
          <div className="flex gap-2">
            {TIPOS_CONSIGNACION.map(t => (
              <button key={t} type="button" onClick={() => set('tipo_consignacion', t)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium ${datos.tipo_consignacion === t
                  ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'}`}>
                {t}
              </button>
            ))}
          </div>
        </div>
        <TextInput label="Datos Piloto" value={datos.piloto} onChange={v => set('piloto', v)} />
        <TextInput label="Datos Vehiculo" value={datos.vehiculo} onChange={v => set('vehiculo', v)} />
        <TextInput label="Autoridad Presente" value={datos.autoridad} onChange={v => set('autoridad', v)} />
        <TextInput label="Destino Traslado" value={datos.destino} onChange={v => set('destino', v)} />
      </div>
    );
  }

  // ── Falla Mecánica de unidad ──
  if (name === 'Falla Mecánica de unidad') {
    return (
      <div className="space-y-3">
        <TextInput label="Tipo de Falla" value={datos.tipo_falla} onChange={v => set('tipo_falla', v)} />
        <div>
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">Requiere Grua?</label>
          <div className="flex gap-2">
            {['No', 'Sí'].map(opt => (
              <button key={opt} type="button"
                onClick={() => set('requiere_grua', opt === 'Sí')}
                className={`flex-1 py-2 rounded-lg text-sm font-medium ${
                  (opt === 'Sí' && datos.requiere_grua) || (opt === 'No' && datos.requiere_grua === false)
                    ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}>
                {opt}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── Comida ──
  if (name === 'Comida') {
    return (
      <div>
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-2">Tiempo de Comida</label>
        <div className="flex gap-2">
          {TIEMPOS_COMIDA.map(t => (
            <button key={t} type="button" onClick={() => set('tiempo_comida', t)}
              className={`flex-1 py-3 rounded-lg text-sm font-medium ${datos.tiempo_comida === t
                ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'}`}>
              {t}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ── Apoyo ──
  if (name.startsWith('Apoyo')) {
    return (
      <div className="space-y-3">
        <TextInput label="Institucion / Encargado" value={datos.institucion} onChange={v => set('institucion', v)} />
        <TextInput label="Punto Inicio" value={datos.punto_inicio} onChange={v => set('punto_inicio', v)} />
        <TextInput label="Punto Finalizacion" value={datos.punto_fin} onChange={v => set('punto_fin', v)} />
        <TextInput label="Puntos Regulacion" value={datos.puntos_regulacion} onChange={v => set('puntos_regulacion', v)} />
      </div>
    );
  }

  // ── Regulación de Tráfico / Reversible ──
  if (name === 'Regulación de Tráfico' || name.includes('Reversible')) {
    return (
      <div>
        <TextInput label="Instruccion / Motivo" value={datos.motivo} onChange={v => set('motivo', v)} />
      </div>
    );
  }

  // ── Hospital / Compañero enfermo ──
  if (name === 'Hospital' || name === 'Compañero enfermo' || name === 'Compañero Enfermo') {
    return (
      <div className="space-y-3">
        <TextInput label="Nombre Hospital / Centro" value={datos.hospital} onChange={v => set('hospital', v)} />
        <TextInput label="Motivo / Malestar" value={datos.motivo} onChange={v => set('motivo', v)} />
        <div>
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">Acciones tomadas</label>
          <textarea value={datos.acciones || ''} onChange={e => set('acciones', e.target.value)}
            rows={3} className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" placeholder="Describa las acciones..." />
        </div>
      </div>
    );
  }

  // ── Abastecimiento ──
  if (name === 'Abastecimiento') {
    return (
      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-2">Combustible Inicial</label>
          <FuelLevelPicker value={datos.combustible_inicial ?? ''} onChange={v => set('combustible_inicial', v)} />
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-2">Combustible Final</label>
          <FuelLevelPicker value={datos.combustible_final ?? ''} onChange={v => set('combustible_final', v)} />
        </div>
        <NumberInput label="Odometro Actual" value={datos.odometro} onChange={v => set('odometro', v)} />
      </div>
    );
  }

  // No special fields for this type
  return null;
}

// ── Helper components ──
function TextInput({ label, value, onChange, placeholder }: { label: string; value?: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">{label}</label>
      <input type="text" value={value || ''} onChange={e => onChange(e.target.value)}
        placeholder={placeholder} className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
    </div>
  );
}

function NumberInput({ label, value, onChange }: { label: string; value?: number; onChange: (v: number) => void }) {
  return (
    <div>
      <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">{label}</label>
      <input type="number" min={0} value={value ?? ''} onChange={e => onChange(parseFloat(e.target.value) || 0)}
        className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
    </div>
  );
}

const NIVELES_COMBUSTIBLE = [
  { value: 'RESERVA', label: '0',     sub: 'Reserva' },
  { value: '1/8',     label: '⅛',     sub: '' },
  { value: '1/4',     label: '¼',     sub: '' },
  { value: '3/8',     label: '⅜',     sub: '' },
  { value: '1/2',     label: '½',     sub: '' },
  { value: '5/8',     label: '⅝',     sub: '' },
  { value: '3/4',     label: '¾',     sub: '' },
  { value: '7/8',     label: '⅞',     sub: '' },
  { value: 'LLENO',   label: 'Lleno', sub: '' },
];

function FuelLevelPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="grid grid-cols-3 gap-1.5">
      {NIVELES_COMBUSTIBLE.map(n => (
        <button
          key={n.value}
          type="button"
          onClick={() => onChange(n.value)}
          className={`flex flex-col items-center justify-center py-2 rounded-lg border-2 transition-all ${
            value === n.value
              ? 'border-orange-500 bg-orange-500 text-white'
              : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:border-orange-300'
          }`}
        >
          <span className="text-sm font-bold leading-none">{n.label}</span>
          {n.sub && <span className="text-xs opacity-75">{n.sub}</span>}
        </button>
      ))}
    </div>
  );
}
