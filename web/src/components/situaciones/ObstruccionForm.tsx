import { useState, useEffect, useCallback } from 'react';

// ========================================
// INTERFACES (Nuevo modelo v2)
// ========================================

export interface CarrilObstruccion {
  nombre: string;
  porcentaje: number; // 0-100
}

export interface SentidoObstruccion {
  cantidad_carriles: number; // 1-5
  carriles: CarrilObstruccion[];
}

export type TipoObstruccion = 'ninguna' | 'total_sentido' | 'total_ambos' | 'parcial';

export interface ObstruccionData {
  hay_vehiculo_fuera_via: boolean;
  tipo_obstruccion: TipoObstruccion;
  sentido_principal: SentidoObstruccion | null;
  sentido_contrario: SentidoObstruccion | null;
  descripcion_manual: string;
}

interface ObstruccionFormProps {
  value: ObstruccionData;
  onChange: (data: ObstruccionData) => void;
  readonly?: boolean;
  sentidoSituacion?: string; // Ej: "Norte", "Sur"
}

// ========================================
// HELPERS
// ========================================

/**
 * Genera nombres de carriles segun la cantidad (1-5)
 */
function generarNombresCarriles(cantidad: number, sentido?: string): string[] {
  switch (cantidad) {
    case 1:
      return [`Carril hacia ${sentido || 'el sentido'}`];
    case 2:
      return ['Carril izquierdo', 'Carril derecho'];
    case 3:
      return ['Carril izquierdo', 'Carril central', 'Carril derecho'];
    case 4:
      return ['Carril izquierdo', 'Carril central izquierdo', 'Carril central derecho', 'Carril derecho'];
    case 5:
      return ['Carril izquierdo', 'Carril central izquierdo', 'Carril central', 'Carril central derecho', 'Carril derecho'];
    default:
      return [];
  }
}

/**
 * Crea estructura de sentido con carriles inicializados a 0%
 */
function crearSentidoObstruccion(cantidadCarriles: number, sentido?: string): SentidoObstruccion {
  const nombres = generarNombresCarriles(cantidadCarriles, sentido);
  return {
    cantidad_carriles: cantidadCarriles,
    carriles: nombres.map(nombre => ({ nombre, porcentaje: 0 }))
  };
}

/**
 * Obtener el valor por defecto de obstruccion
 */
export function getDefaultObstruccion(): ObstruccionData {
  return {
    hay_vehiculo_fuera_via: false,
    tipo_obstruccion: 'ninguna',
    sentido_principal: null,
    sentido_contrario: null,
    descripcion_manual: ''
  };
}

// ========================================
// SUBCOMPONENTE: Editor de carriles
// ========================================

interface CarrilesEditorProps {
  sentido: SentidoObstruccion;
  onChange: (sentido: SentidoObstruccion) => void;
  label: string;
  readonly?: boolean;
  sentidoNombre?: string;
}

function CarrilesEditor({ sentido, onChange, label, readonly, sentidoNombre }: CarrilesEditorProps) {
  const handleCantidadChange = (cantidad: number) => {
    const nuevoSentido = crearSentidoObstruccion(cantidad, sentidoNombre);
    // Preservar porcentajes de carriles existentes si es posible
    nuevoSentido.carriles = nuevoSentido.carriles.map((carril, i) => ({
      ...carril,
      porcentaje: sentido.carriles[i]?.porcentaje || 0
    }));
    onChange(nuevoSentido);
  };

  const handlePorcentajeChange = (index: number, porcentaje: number) => {
    const nuevosCarriles = [...sentido.carriles];
    nuevosCarriles[index] = { ...nuevosCarriles[index], porcentaje };
    onChange({ ...sentido, carriles: nuevosCarriles });
  };

  return (
    <div className="space-y-3 p-3 bg-white rounded-lg border border-gray-200">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700">{label}</span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">Carriles:</span>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map(num => (
              <button
                key={num}
                type="button"
                onClick={() => handleCantidadChange(num)}
                disabled={readonly}
                className={`w-7 h-7 rounded text-xs font-medium transition-colors ${
                  sentido.cantidad_carriles === num
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {num}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-2">
        {sentido.carriles.map((carril, index) => (
          <div key={index} className="flex items-center gap-3">
            <span className="text-xs text-gray-600 w-40 truncate" title={carril.nombre}>
              {carril.nombre}
            </span>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={carril.porcentaje}
              onChange={(e) => handlePorcentajeChange(index, parseInt(e.target.value))}
              disabled={readonly}
              className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
            <span className={`text-xs font-medium w-10 text-right ${
              carril.porcentaje === 0 ? 'text-green-600' :
              carril.porcentaje < 50 ? 'text-yellow-600' :
              carril.porcentaje < 100 ? 'text-orange-600' : 'text-red-600'
            }`}>
              {carril.porcentaje}%
            </span>
          </div>
        ))}
      </div>

      {/* Botones rapidos */}
      {!readonly && (
        <div className="flex gap-2 pt-2 border-t border-gray-100">
          <button
            type="button"
            onClick={() => {
              const nuevosCarriles = sentido.carriles.map(c => ({ ...c, porcentaje: 0 }));
              onChange({ ...sentido, carriles: nuevosCarriles });
            }}
            className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200"
          >
            Todos 0%
          </button>
          <button
            type="button"
            onClick={() => {
              const nuevosCarriles = sentido.carriles.map(c => ({ ...c, porcentaje: 50 }));
              onChange({ ...sentido, carriles: nuevosCarriles });
            }}
            className="px-2 py-1 text-xs bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200"
          >
            Todos 50%
          </button>
          <button
            type="button"
            onClick={() => {
              const nuevosCarriles = sentido.carriles.map(c => ({ ...c, porcentaje: 100 }));
              onChange({ ...sentido, carriles: nuevosCarriles });
            }}
            className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200"
          >
            Todos 100%
          </button>
        </div>
      )}
    </div>
  );
}

// ========================================
// COMPONENTE PRINCIPAL
// ========================================

export default function ObstruccionForm({
  value,
  onChange,
  readonly = false,
  sentidoSituacion
}: ObstruccionFormProps) {
  const [mostrarSentidoContrario, setMostrarSentidoContrario] = useState(
    value.sentido_contrario !== null
  );

  // Inicializar sentido principal si es parcial y no existe
  useEffect(() => {
    if (value.tipo_obstruccion === 'parcial' && !value.sentido_principal) {
      onChange({
        ...value,
        sentido_principal: crearSentidoObstruccion(2, sentidoSituacion)
      });
    }
  }, [value.tipo_obstruccion]);

  const handleVehiculoFueraViaChange = (checked: boolean) => {
    onChange({
      ...value,
      hay_vehiculo_fuera_via: checked
    });
  };

  const handleTipoObstruccionChange = (tipo: TipoObstruccion) => {
    const nuevoValue: ObstruccionData = {
      ...value,
      tipo_obstruccion: tipo,
      sentido_principal: tipo === 'parcial' ? crearSentidoObstruccion(2, sentidoSituacion) : null,
      sentido_contrario: null
    };

    // Si cambia a ninguna, limpiar sentido contrario
    if (tipo === 'ninguna' || tipo === 'total_sentido' || tipo === 'total_ambos') {
      setMostrarSentidoContrario(false);
    }

    onChange(nuevoValue);
  };

  const handleSentidoPrincipalChange = (sentido: SentidoObstruccion) => {
    onChange({
      ...value,
      sentido_principal: sentido
    });
  };

  const handleSentidoContrarioChange = (sentido: SentidoObstruccion) => {
    onChange({
      ...value,
      sentido_contrario: sentido
    });
  };

  const toggleSentidoContrario = () => {
    if (mostrarSentidoContrario) {
      setMostrarSentidoContrario(false);
      onChange({ ...value, sentido_contrario: null });
    } else {
      setMostrarSentidoContrario(true);
      onChange({
        ...value,
        sentido_contrario: crearSentidoObstruccion(
          value.sentido_principal?.cantidad_carriles || 2,
          sentidoSituacion ? `contrario a ${sentidoSituacion}` : undefined
        )
      });
    }
  };

  // Generar descripcion automatica
  const generarDescripcion = useCallback(() => {
    let desc = '';

    // Vehiculo fuera de via
    if (value.hay_vehiculo_fuera_via) {
      desc = 'Vehiculo fuera de la via';
      if (value.tipo_obstruccion !== 'ninguna') {
        desc += '. Ademas, ';
      }
    }

    // Tipo de obstruccion
    switch (value.tipo_obstruccion) {
      case 'ninguna':
        if (!value.hay_vehiculo_fuera_via) {
          desc = 'Sin obstruccion de via';
        }
        break;
      case 'total_sentido':
        desc += `Obstruccion total del sentido ${sentidoSituacion || 'principal'}`;
        break;
      case 'total_ambos':
        desc += 'Obstruccion total de ambos sentidos (via cerrada)';
        break;
      case 'parcial':
        if (value.sentido_principal) {
          const carrilesAfectados = value.sentido_principal.carriles
            .filter(c => c.porcentaje > 0)
            .map(c => `${c.nombre} (${c.porcentaje}%)`)
            .join(', ');

          if (carrilesAfectados) {
            desc += `Obstruccion parcial: ${carrilesAfectados}`;
          } else {
            desc += 'Obstruccion parcial sin carriles especificados';
          }
        }
        break;
    }

    onChange({ ...value, descripcion_manual: desc });
  }, [value, sentidoSituacion, onChange]);

  // Determinar si hay alguna obstruccion activa
  const tieneObstruccionActiva = value.hay_vehiculo_fuera_via || value.tipo_obstruccion !== 'ninguna';

  return (
    <div className="space-y-4">
      {/* Checkbox: Vehiculo fuera de via */}
      <label className="flex items-center gap-3 cursor-pointer p-3 bg-yellow-50 rounded-lg border border-yellow-200 hover:bg-yellow-100 transition-colors">
        <input
          type="checkbox"
          checked={value.hay_vehiculo_fuera_via}
          onChange={(e) => handleVehiculoFueraViaChange(e.target.checked)}
          disabled={readonly}
          className="w-5 h-5 rounded border-yellow-400 text-yellow-600 focus:ring-yellow-500"
        />
        <div>
          <span className="text-sm font-medium text-yellow-800">Vehiculo fuera de la via</span>
          <p className="text-xs text-yellow-600">
            Puede combinarse con obstruccion parcial
          </p>
        </div>
      </label>

      {/* Tipo de obstruccion */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          Tipo de Obstruccion de Via
        </label>
        <div className="grid grid-cols-2 gap-2">
          {[
            { value: 'ninguna', label: 'Sin obstruccion', color: 'green', desc: '0% de via obstruida' },
            { value: 'total_sentido', label: 'Total sentido', color: 'orange', desc: 'Todo el sentido principal' },
            { value: 'total_ambos', label: 'Total ambos', color: 'red', desc: 'Ambos sentidos (via cerrada)' },
            { value: 'parcial', label: 'Parcial', color: 'blue', desc: 'Por carril con porcentaje' },
          ].map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => handleTipoObstruccionChange(opt.value as TipoObstruccion)}
              disabled={readonly}
              className={`p-3 rounded-lg border-2 text-left transition-all ${
                value.tipo_obstruccion === opt.value
                  ? opt.color === 'green' ? 'border-green-500 bg-green-50' :
                    opt.color === 'orange' ? 'border-orange-500 bg-orange-50' :
                    opt.color === 'red' ? 'border-red-500 bg-red-50' :
                    'border-blue-500 bg-blue-50'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <span className={`text-sm font-medium ${
                value.tipo_obstruccion === opt.value
                  ? opt.color === 'green' ? 'text-green-700' :
                    opt.color === 'orange' ? 'text-orange-700' :
                    opt.color === 'red' ? 'text-red-700' :
                    'text-blue-700'
                  : 'text-gray-700'
              }`}>
                {opt.label}
              </span>
              <p className="text-xs text-gray-500 mt-0.5">{opt.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Editor de carriles (solo para obstruccion parcial) */}
      {value.tipo_obstruccion === 'parcial' && value.sentido_principal && (
        <div className="space-y-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <CarrilesEditor
            sentido={value.sentido_principal}
            onChange={handleSentidoPrincipalChange}
            label={`Sentido ${sentidoSituacion || 'principal'}`}
            readonly={readonly}
            sentidoNombre={sentidoSituacion}
          />

          {/* Toggle para sentido contrario */}
          {!readonly && (
            <button
              type="button"
              onClick={toggleSentidoContrario}
              className={`w-full p-2 rounded-lg text-sm font-medium transition-colors ${
                mostrarSentidoContrario
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
              }`}
            >
              {mostrarSentidoContrario ? '- Ocultar sentido contrario' : '+ Agregar sentido contrario'}
            </button>
          )}

          {/* Editor de sentido contrario */}
          {mostrarSentidoContrario && value.sentido_contrario && (
            <CarrilesEditor
              sentido={value.sentido_contrario}
              onChange={handleSentidoContrarioChange}
              label={`Sentido ${sentidoSituacion ? `contrario (hacia ${sentidoSituacion})` : 'contrario'}`}
              readonly={readonly}
              sentidoNombre={sentidoSituacion ? `contrario a ${sentidoSituacion}` : undefined}
            />
          )}
        </div>
      )}

      {/* Seccion de descripcion (solo si hay obstruccion activa) */}
      {tieneObstruccionActiva && (
        <div className="space-y-2 p-4 bg-gray-50 rounded-lg border border-gray-200">
          {/* Boton generar descripcion */}
          {!readonly && (
            <button
              type="button"
              onClick={generarDescripcion}
              className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
            >
              Generar Descripcion Automatica
            </button>
          )}

          {/* Descripcion manual */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Descripcion (puede editarse)
            </label>
            <textarea
              value={value.descripcion_manual}
              onChange={(e) => onChange({ ...value, descripcion_manual: e.target.value })}
              placeholder="Descripcion de la obstruccion..."
              rows={3}
              disabled={readonly}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500 resize-none"
            />
          </div>
        </div>
      )}

      {/* Resumen visual */}
      {tieneObstruccionActiva && (
        <div className="p-3 bg-gray-100 rounded-lg">
          <p className="text-xs font-medium text-gray-500 uppercase mb-1">Resumen</p>
          <div className="flex flex-wrap gap-2">
            {value.hay_vehiculo_fuera_via && (
              <span className="px-2 py-1 bg-yellow-200 text-yellow-800 rounded text-xs font-medium">
                Vehiculo fuera de via
              </span>
            )}
            {value.tipo_obstruccion === 'total_sentido' && (
              <span className="px-2 py-1 bg-orange-200 text-orange-800 rounded text-xs font-medium">
                Obstruccion total (1 sentido)
              </span>
            )}
            {value.tipo_obstruccion === 'total_ambos' && (
              <span className="px-2 py-1 bg-red-200 text-red-800 rounded text-xs font-medium">
                Via cerrada (ambos sentidos)
              </span>
            )}
            {value.tipo_obstruccion === 'parcial' && value.sentido_principal && (
              <span className="px-2 py-1 bg-blue-200 text-blue-800 rounded text-xs font-medium">
                Parcial: {value.sentido_principal.carriles.filter(c => c.porcentaje > 0).length} de {value.sentido_principal.cantidad_carriles} carriles
              </span>
            )}
            {value.tipo_obstruccion === 'ninguna' && !value.hay_vehiculo_fuera_via && (
              <span className="px-2 py-1 bg-green-200 text-green-800 rounded text-xs font-medium">
                Sin obstruccion
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
