import { Plus } from 'lucide-react';
import GruaFormWeb from './GruaFormWeb';
import AjustadorFormWeb from './AjustadorFormWeb';
import AutoridadSocorroWeb from './AutoridadSocorroWeb';

interface Props {
  gruas: any[];
  ajustadores: any[];
  autoridadesSeleccionadas: string[];
  detallesAutoridades: Record<string, any>;
  socorroSeleccionados: string[];
  detallesSocorro: Record<string, any>;
  onGruasChange: (gruas: any[]) => void;
  onAjustadoresChange: (ajustadores: any[]) => void;
  onAutoridadesChange: (val: string[]) => void;
  onDetallesAutoridadesChange: (val: Record<string, any>) => void;
  onSocorroChange: (val: string[]) => void;
  onDetallesSocorroChange: (val: Record<string, any>) => void;
  showGruas?: boolean;
  showAjustadores?: boolean;
}

const emptyGrua = () => ({ empresa: '', placa: '', tipo: '', piloto: '', traslado: false, traslado_a: '', costo_traslado: null });
const emptyAjustador = () => ({ empresa: '', nombre: '', telefono: '', vehiculo_placa: '', vehiculo_marca: '', vehiculo_color: '' });

export default function RecursosSection({
  gruas, ajustadores,
  autoridadesSeleccionadas, detallesAutoridades,
  socorroSeleccionados, detallesSocorro,
  onGruasChange, onAjustadoresChange,
  onAutoridadesChange, onDetallesAutoridadesChange,
  onSocorroChange, onDetallesSocorroChange,
  showGruas = true, showAjustadores = true,
}: Props) {

  const handleGruaChange = (index: number, field: string, value: any) => {
    const updated = [...gruas];
    updated[index] = { ...updated[index], [field]: value };
    onGruasChange(updated);
  };

  const handleAjustadorChange = (index: number, field: string, value: any) => {
    const updated = [...ajustadores];
    updated[index] = { ...updated[index], [field]: value };
    onAjustadoresChange(updated);
  };

  return (
    <div className="space-y-6">
      {/* Gruas */}
      {showGruas && (
        <div>
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-sm font-semibold text-amber-700">Gruas ({gruas.length})</h3>
            <button type="button" onClick={() => onGruasChange([...gruas, emptyGrua()])}
              className="bg-amber-500 hover:bg-amber-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1">
              <Plus className="w-3 h-3" /> Agregar
            </button>
          </div>
          {gruas.length === 0 ? (
            <div className="text-center py-4 bg-amber-50 rounded-lg border border-dashed border-amber-300">
              <p className="text-amber-600 text-xs">Sin gruas</p>
            </div>
          ) : gruas.map((grua, i) => (
            <GruaFormWeb key={i} index={i} grua={grua}
              onChange={handleGruaChange}
              onRemove={(idx) => onGruasChange(gruas.filter((_, j) => j !== idx))} />
          ))}
        </div>
      )}

      {/* Ajustadores */}
      {showAjustadores && (
        <div>
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-sm font-semibold text-green-700">Ajustadores ({ajustadores.length})</h3>
            <button type="button" onClick={() => onAjustadoresChange([...ajustadores, emptyAjustador()])}
              className="bg-green-500 hover:bg-green-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1">
              <Plus className="w-3 h-3" /> Agregar
            </button>
          </div>
          {ajustadores.length === 0 ? (
            <div className="text-center py-4 bg-green-50 rounded-lg border border-dashed border-green-300">
              <p className="text-green-600 text-xs">Sin ajustadores</p>
            </div>
          ) : ajustadores.map((aj, i) => (
            <AjustadorFormWeb key={i} index={i} ajustador={aj}
              onChange={handleAjustadorChange}
              onRemove={(idx) => onAjustadoresChange(ajustadores.filter((_, j) => j !== idx))} />
          ))}
        </div>
      )}

      {/* Autoridades y Socorro */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Autoridades y Socorro</h3>
        <AutoridadSocorroWeb tipo="autoridad"
          seleccionados={autoridadesSeleccionadas} detalles={detallesAutoridades}
          onSelectionChange={onAutoridadesChange} onDetallesChange={onDetallesAutoridadesChange} />
        <AutoridadSocorroWeb tipo="socorro"
          seleccionados={socorroSeleccionados} detalles={detallesSocorro}
          onSelectionChange={onSocorroChange} onDetallesChange={onDetallesSocorroChange} />
      </div>
    </div>
  );
}
