import {
  CONDICIONES_CLIMATICAS, AREAS, MATERIALES_VIA,
  ESTADOS_VIA, TOPOGRAFIAS_VIA, GEOMETRIAS_VIA,
} from '../../constants/situacionTypes';

interface Props {
  clima: string;
  area: string;
  materialVia: string;
  viaEstado?: string;
  viaTopografia?: string;
  viaGeometria?: string;
  showViaDetails?: boolean;
  onChange: (field: string, value: any) => void;
}

export default function CondicionesViaFields({
  clima, area, materialVia,
  viaEstado, viaTopografia, viaGeometria,
  showViaDetails, onChange,
}: Props) {
  return (
    <>
      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mt-4 mb-2">Condiciones</h4>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="text-xs text-gray-500">Clima</label>
          <select value={clima} onChange={e => onChange('clima', e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm">
            <option value="">Seleccionar</option>
            {CONDICIONES_CLIMATICAS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-500">Area</label>
          <select value={area} onChange={e => onChange('area', e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm">
            <option value="">Seleccionar</option>
            {AREAS.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-500">Material via</label>
          <select value={materialVia} onChange={e => onChange('material_via', e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm">
            <option value="">Seleccionar</option>
            {MATERIALES_VIA.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
        </div>
      </div>

      {showViaDetails && (
        <>
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mt-4 mb-2">Estado de la via</h4>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-gray-500">Estado</label>
              <select value={viaEstado || ''} onChange={e => onChange('via_estado', e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm">
                <option value="">Seleccionar</option>
                {ESTADOS_VIA.map(v => <option key={v.value} value={v.value}>{v.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500">Topografia</label>
              <select value={viaTopografia || ''} onChange={e => onChange('via_topografia', e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm">
                <option value="">Seleccionar</option>
                {TOPOGRAFIAS_VIA.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500">Geometria</label>
              <select value={viaGeometria || ''} onChange={e => onChange('via_geometria', e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm">
                <option value="">Seleccionar</option>
                {GEOMETRIAS_VIA.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
              </select>
            </div>
          </div>
        </>
      )}
    </>
  );
}
