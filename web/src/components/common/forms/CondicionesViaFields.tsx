import {
  CONDICIONES_CLIMATICAS, AREAS, MATERIALES_VIA,
  ESTADOS_VIA, TOPOGRAFIAS_VIA, GEOMETRIAS_VIA,
  PERALTES_VIA, CONDICIONES_SUPERFICIE, CARGAS_VEHICULARES,
  ILUMINACIONES, VISIBILIDADES, SENALIZACIONES,
} from '../../../constants/situacionTypes';

interface Props {
  clima: string;
  area: string;
  materialVia: string;
  cargaVehicular?: string;
  iluminacion?: string;
  visibilidad?: string;
  senalizacion?: string;
  viaEstado?: string;
  viaTopografia?: string;
  viaGeometria?: string;
  viaPeralte?: string;
  viaCondicion?: string;
  showViaDetails?: boolean;
  onChange: (field: string, value: any) => void;
}

const selectCls = 'w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:outline-none';
const labelCls = 'text-xs text-gray-500 dark:text-gray-400';
const sectionCls = 'text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mt-4 mb-2';

export default function CondicionesViaFields({
  clima, area, materialVia, cargaVehicular,
  iluminacion, visibilidad, senalizacion,
  viaEstado, viaTopografia, viaGeometria,
  viaPeralte, viaCondicion,
  showViaDetails, onChange,
}: Props) {
  return (
    <>
      <h4 className={sectionCls}>Condiciones</h4>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Clima</label>
          <select value={clima} onChange={e => onChange('clima', e.target.value)}
            className={selectCls}>
            <option value="">Seleccionar</option>
            {CONDICIONES_CLIMATICAS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Carga vehicular</label>
          <select value={cargaVehicular || ''} onChange={e => onChange('carga_vehicular', e.target.value)}
            className={selectCls}>
            <option value="">Seleccionar</option>
            {CARGAS_VEHICULARES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Area</label>
          <select value={area} onChange={e => onChange('area', e.target.value)}
            className={selectCls}>
            <option value="">Seleccionar</option>
            {AREAS.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Material via</label>
          <select value={materialVia} onChange={e => onChange('material_via', e.target.value)}
            className={selectCls}>
            <option value="">Seleccionar</option>
            {MATERIALES_VIA.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
        </div>
      </div>

      {showViaDetails && (
        <>
          <h4 className={sectionCls}>Estado de la via</h4>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={labelCls}>Estado</label>
              <select value={viaEstado || ''} onChange={e => onChange('via_estado', e.target.value)}
                className={selectCls}>
                <option value="">Seleccionar</option>
                {ESTADOS_VIA.map(v => <option key={v.value} value={v.value}>{v.label}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Topografia</label>
              <select value={viaTopografia || ''} onChange={e => onChange('via_topografia', e.target.value)}
                className={selectCls}>
                <option value="">Seleccionar</option>
                {TOPOGRAFIAS_VIA.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Geometria</label>
              <select value={viaGeometria || ''} onChange={e => onChange('via_geometria', e.target.value)}
                className={selectCls}>
                <option value="">Seleccionar</option>
                {GEOMETRIAS_VIA.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 mt-3">
            <div>
              <label className={labelCls}>Peralte</label>
              <select value={viaPeralte || ''} onChange={e => onChange('via_peralte', e.target.value)}
                className={selectCls}>
                <option value="">Seleccionar</option>
                {PERALTES_VIA.map(p => <option key={p} value={p}>{p.replace(/_/g, ' ')}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Condicion superficie</label>
              <select value={viaCondicion || ''} onChange={e => onChange('via_condicion', e.target.value)}
                className={selectCls}>
                <option value="">Seleccionar</option>
                {CONDICIONES_SUPERFICIE.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <h4 className={sectionCls}>Condiciones ambientales</h4>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={labelCls}>Iluminacion</label>
              <select value={iluminacion || ''} onChange={e => onChange('iluminacion', e.target.value)}
                className={selectCls}>
                <option value="">Seleccionar</option>
                {ILUMINACIONES.map(i => <option key={i.value} value={i.value}>{i.label}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Visibilidad</label>
              <select value={visibilidad || ''} onChange={e => onChange('visibilidad', e.target.value)}
                className={selectCls}>
                <option value="">Seleccionar</option>
                {VISIBILIDADES.map(v => <option key={v.value} value={v.value}>{v.label}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Senalizacion</label>
              <select value={senalizacion || ''} onChange={e => onChange('senalizacion', e.target.value)}
                className={selectCls}>
                <option value="">Seleccionar</option>
                {SENALIZACIONES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
          </div>
        </>
      )}
    </>
  );
}
