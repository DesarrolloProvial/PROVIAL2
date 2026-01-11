import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Switch,
  Image,
  Platform,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import { useAuthStore } from '../../store/authStore';
import api from '../../services/api';
import FotoCaptura from '../../components/FotoCaptura';
import FirmaCaptura from '../../components/FirmaCaptura';

interface Item360 {
  codigo: string;
  descripcion: string;
  tipo: 'CHECKBOX' | 'ESTADO' | 'TEXTO' | 'TEXTO_FOTO' | 'NUMERO' | 'ESTADO_OBS' | 'SELECT' | 'CHECKBOX_BLOQUEO' | 'DANOS_LISTA';
  requerido: boolean;
  opciones?: string[];
  config?: any; // Configuración adicional para tipos complejos
}

interface Seccion360 {
  nombre: string;
  items: Item360[];
}

interface Plantilla360 {
  id: number;
  tipo_unidad: string;
  nombre: string;
  descripcion: string | null;
  version: number;
  secciones: Seccion360[];
}

interface Respuesta360 {
  codigo: string;
  valor: boolean | string | number;
  observacion?: string;
  foto_url?: string;
}

// Interface para reporte de daños
interface Dano360 {
  id: string;
  descripcion: string;
  ubicacion: string;
  clasificacion: string;
  fotos: string[]; // URLs o base64 de hasta 3 fotos
}

type Inspeccion360RouteProp = RouteProp<{
  Inspeccion360: {
    unidadId: number;
    unidadCodigo: string;
    tipoUnidad: string;
  };
}, 'Inspeccion360'>;

export default function Inspeccion360Screen() {
  const navigation = useNavigation();
  const route = useRoute<Inspeccion360RouteProp>();
  const insets = useSafeAreaInsets();
  const { unidadId, unidadCodigo, tipoUnidad } = route.params || {};

  const { user } = useAuthStore();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [plantilla, setPlantilla] = useState<Plantilla360 | null>(null);
  const [respuestas, setRespuestas] = useState<Map<string, Respuesta360>>(new Map());
  const [observacionesGenerales, setObservacionesGenerales] = useState('');
  const [seccionActiva, setSeccionActiva] = useState(0);
  const [firmaInspector, setFirmaInspector] = useState<string>('');

  // Estado para reporte de daños
  const [danos, setDanos] = useState<Dano360[]>([]);
  const [sinDanos, setSinDanos] = useState(false);

  // Cargar plantilla al montar
  useEffect(() => {
    const loadPlantilla = async () => {
      try {
        setLoading(true);
        const response = await api.get(`/inspeccion360/plantilla/${tipoUnidad}`);
        setPlantilla(response.data);

        // Inicializar respuestas vacías
        const respuestasIniciales = new Map<string, Respuesta360>();
        response.data.secciones.forEach((seccion: Seccion360) => {
          seccion.items.forEach((item: Item360) => {
            respuestasIniciales.set(item.codigo, {
              codigo: item.codigo,
              valor: item.tipo === 'CHECKBOX' ? false : '',
            });
          });
        });
        setRespuestas(respuestasIniciales);
      } catch (error: any) {
        console.error('Error cargando plantilla:', error);
        Alert.alert(
          'Error',
          'No se pudo cargar la plantilla de inspección 360.',
          [{ text: 'Volver', onPress: () => navigation.goBack() }]
        );
      } finally {
        setLoading(false);
      }
    };

    loadPlantilla();
  }, [tipoUnidad, navigation]);

  const actualizarRespuesta = (codigo: string, valor: any, observacion?: string) => {
    const nuevasRespuestas = new Map(respuestas);
    const respuestaActual = nuevasRespuestas.get(codigo);
    nuevasRespuestas.set(codigo, {
      codigo,
      valor,
      observacion: observacion || respuestaActual?.observacion,
      foto_url: respuestaActual?.foto_url,
    });
    setRespuestas(nuevasRespuestas);
  };

  const actualizarFoto = (codigo: string, fotoUri: string) => {
    const nuevasRespuestas = new Map(respuestas);
    const respuestaActual = nuevasRespuestas.get(codigo);
    if (respuestaActual) {
      nuevasRespuestas.set(codigo, {
        ...respuestaActual,
        foto_url: fotoUri,
      });
      setRespuestas(nuevasRespuestas);
    }
  };

  // Funciones para gestionar daños
  const agregarDano = () => {
    const nuevoDano: Dano360 = {
      id: Date.now().toString(),
      descripcion: '',
      ubicacion: '',
      clasificacion: '',
      fotos: [],
    };
    setDanos([...danos, nuevoDano]);
  };

  const eliminarDano = (id: string) => {
    setDanos(danos.filter(d => d.id !== id));
  };

  const actualizarDano = (id: string, campo: keyof Dano360, valor: any) => {
    setDanos(danos.map(d =>
      d.id === id ? { ...d, [campo]: valor } : d
    ));
  };

  const agregarFotoDano = (id: string, fotoUri: string) => {
    setDanos(danos.map(d => {
      if (d.id === id && d.fotos.length < 3) {
        return { ...d, fotos: [...d.fotos, fotoUri] };
      }
      return d;
    }));
  };

  const eliminarFotoDano = (id: string, index: number) => {
    setDanos(danos.map(d => {
      if (d.id === id) {
        const nuevasFotos = [...d.fotos];
        nuevasFotos.splice(index, 1);
        return { ...d, fotos: nuevasFotos };
      }
      return d;
    }));
  };

  const handleSubmit = async () => {
    if (!plantilla) return;

    // Validar respuestas requeridas
    const faltantes: string[] = [];
    plantilla.secciones.forEach((seccion) => {
      seccion.items.forEach((item) => {
        if (item.requerido) {
          const respuesta = respuestas.get(item.codigo);

          // Para CHECKBOX, false es válido (significa NO)
          // Solo validamos que exista una respuesta
          if (!respuesta) {
            faltantes.push(item.descripcion);
          } else if (item.tipo === 'CHECKBOX' || item.tipo === 'CHECKBOX_BLOQUEO') {
            // CHECKBOX: cualquier valor boolean es válido
            if (respuesta.valor === null || respuesta.valor === undefined) {
              faltantes.push(item.descripcion);
            }
          } else {
            // Otros tipos: validar que no esté vacío
            if (respuesta.valor === '' || respuesta.valor === null || respuesta.valor === undefined) {
              faltantes.push(item.descripcion);
            }
          }
        }
      });
    });

    if (faltantes.length > 0) {
      Alert.alert(
        'Campos Requeridos',
        `Por favor complete los siguientes campos:\n\n${faltantes.slice(0, 5).join('\n')}${faltantes.length > 5 ? `\n...y ${faltantes.length - 5} más` : ''}`,
      );
      return;
    }

    // Validar firma
    if (!firmaInspector) {
      Alert.alert(
        'Firma Requerida',
        'Debe firmar la inspección antes de enviarla.',
      );
      return;
    }

    try {
      setSubmitting(true);

      const respuestasArray = Array.from(respuestas.values());

      // Subir fotos primero si existen
      const respuestasConFotos = await Promise.all(
        respuestasArray.map(async (respuesta) => {
          if (respuesta.foto_url && respuesta.foto_url.startsWith('file://')) {
            try {
              // Subir foto a servidor
              const formData = new FormData();
              formData.append('foto', {
                uri: respuesta.foto_url,
                type: 'image/jpeg',
                name: `foto_${respuesta.codigo}.jpg`,
              } as any);

              const uploadResponse = await api.post('/multimedia/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
              });

              return {
                ...respuesta,
                foto_url: uploadResponse.data.url,
              };
            } catch (uploadError) {
              console.error('Error subiendo foto:', uploadError);
              return respuesta;
            }
          }
          return respuesta;
        })
      );

      const response = await api.post('/inspeccion360', {
        unidad_id: unidadId,
        plantilla_id: plantilla.id,
        respuestas: respuestasConFotos,
        observaciones_inspector: observacionesGenerales.trim() || undefined,
        firma_inspector: firmaInspector,
        danos: sinDanos ? [] : danos, // Incluir daños
      });

      // Verificar si fue auto-aprobada
      const autoAprobada = response.data.estado === 'APROBADA';

      Alert.alert(
        autoAprobada ? 'Inspección Aprobada' : 'Inspección Enviada',
        autoAprobada
          ? 'La inspección 360 ha sido aprobada. Ya puede iniciar salida.'
          : 'La inspección 360 ha sido enviada al comandante para su aprobación.',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error: any) {
      console.error('Error enviando inspección:', error);
      Alert.alert(
        'Error',
        error.response?.data?.error || 'No se pudo enviar la inspección.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const renderItem = (item: Item360) => {
    const respuesta = respuestas.get(item.codigo);
    const valor = respuesta?.valor;

    switch (item.tipo) {
      case 'CHECKBOX':
        return (
          <View style={styles.itemRow} key={item.codigo}>
            <View style={styles.itemInfo}>
              <Text style={styles.itemDescripcion}>
                {item.descripcion}
                {item.requerido && <Text style={styles.required}> *</Text>}
              </Text>
            </View>
            <Switch
              value={!!valor}
              onValueChange={(v) => actualizarRespuesta(item.codigo, v)}
              trackColor={{ false: '#ccc', true: COLORS.success + '80' }}
              thumbColor={valor ? COLORS.success : '#f4f3f4'}
            />
          </View>
        );

      case 'ESTADO':
        return (
          <View style={styles.itemContainer} key={item.codigo}>
            <Text style={styles.itemDescripcion}>
              {item.descripcion}
              {item.requerido && <Text style={styles.required}> *</Text>}
            </Text>
            <View style={styles.opcionesContainer}>
              {item.opciones?.map((opcion) => (
                <TouchableOpacity
                  key={opcion}
                  style={[
                    styles.opcionButton,
                    valor === opcion && styles.opcionButtonActiva,
                    opcion.includes('MALO') || opcion.includes('NO FUNCIONA') || opcion.includes('CRÍTICO')
                      ? { borderColor: COLORS.danger }
                      : opcion.includes('REGULAR') || opcion.includes('BAJO') || opcion.includes('PARCIAL')
                        ? { borderColor: COLORS.warning }
                        : { borderColor: COLORS.success },
                    valor === opcion && (
                      opcion.includes('MALO') || opcion.includes('NO FUNCIONA') || opcion.includes('CRÍTICO')
                        ? { backgroundColor: COLORS.danger }
                        : opcion.includes('REGULAR') || opcion.includes('BAJO') || opcion.includes('PARCIAL')
                          ? { backgroundColor: COLORS.warning }
                          : { backgroundColor: COLORS.success }
                    ),
                  ]}
                  onPress={() => actualizarRespuesta(item.codigo, opcion)}
                >
                  <Text
                    style={[
                      styles.opcionText,
                      valor === opcion && styles.opcionTextActiva,
                    ]}
                  >
                    {opcion}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        );

      case 'TEXTO':
        return (
          <View style={styles.itemContainer} key={item.codigo}>
            <Text style={styles.itemDescripcion}>
              {item.descripcion}
              {item.requerido && <Text style={styles.required}> *</Text>}
            </Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={String(valor || '')}
              onChangeText={(text) => actualizarRespuesta(item.codigo, text)}
              placeholder="Describir..."
              multiline
              numberOfLines={2}
            />
          </View>
        );

      case 'TEXTO_FOTO':
        return (
          <View style={styles.itemContainer} key={item.codigo}>
            <Text style={styles.itemDescripcion}>
              {item.descripcion}
              {item.requerido && <Text style={styles.required}> *</Text>}
            </Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={String(valor || '')}
              onChangeText={(text) => actualizarRespuesta(item.codigo, text)}
              placeholder="Describir daño o novedad..."
              multiline
              numberOfLines={2}
            />
            <View style={styles.fotoSection}>
              <FotoCaptura
                onFotoCapturada={(uri) => actualizarFoto(item.codigo, uri)}
                fotoActual={respuesta?.foto_url}
                titulo="Evidencia fotográfica"
                descripcion="Tome foto del daño o novedad"
                requerido={item.requerido}
              />
            </View>
          </View>
        );

      case 'NUMERO':
        return (
          <View style={styles.itemContainer} key={item.codigo}>
            <Text style={styles.itemDescripcion}>
              {item.descripcion}
              {item.requerido && <Text style={styles.required}> *</Text>}
            </Text>
            <TextInput
              style={styles.input}
              value={String(valor || '')}
              onChangeText={(text) => actualizarRespuesta(item.codigo, text.replace(/[^0-9.]/g, ''))}
              placeholder="0"
              keyboardType="numeric"
            />
          </View>
        );

      case 'ESTADO_OBS':
        // Estado con campo de observación adicional
        return (
          <View style={styles.itemContainer} key={item.codigo}>
            <Text style={styles.itemDescripcion}>
              {item.descripcion}
              {item.requerido && <Text style={styles.required}> *</Text>}
            </Text>
            <View style={styles.opcionesContainer}>
              {item.opciones?.map((opcion) => (
                <TouchableOpacity
                  key={opcion}
                  style={[
                    styles.opcionButton,
                    valor === opcion && styles.opcionButtonActiva,
                    opcion.includes('MALO') || opcion.includes('NO FUNCIONA') || opcion.includes('CRÍTICO')
                      ? { borderColor: COLORS.danger }
                      : opcion.includes('REGULAR') || opcion.includes('BAJO') || opcion.includes('PARCIAL') || opcion.includes('MEDIO')
                        ? { borderColor: COLORS.warning }
                        : opcion === 'N/A'
                          ? { borderColor: COLORS.gray[400] }
                          : { borderColor: COLORS.success },
                    valor === opcion && (
                      opcion.includes('MALO') || opcion.includes('NO FUNCIONA') || opcion.includes('CRÍTICO')
                        ? { backgroundColor: COLORS.danger }
                        : opcion.includes('REGULAR') || opcion.includes('BAJO') || opcion.includes('PARCIAL') || opcion.includes('MEDIO')
                          ? { backgroundColor: COLORS.warning }
                          : opcion === 'N/A'
                            ? { backgroundColor: COLORS.gray[400] }
                            : { backgroundColor: COLORS.success }
                    ),
                  ]}
                  onPress={() => actualizarRespuesta(item.codigo, opcion)}
                >
                  <Text
                    style={[
                      styles.opcionText,
                      valor === opcion && styles.opcionTextActiva,
                    ]}
                  >
                    {opcion}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              style={[styles.input, styles.observacionInput]}
              value={respuesta?.observacion || ''}
              onChangeText={(text) => {
                const nuevasRespuestas = new Map(respuestas);
                nuevasRespuestas.set(item.codigo, { ...respuesta!, observacion: text });
                setRespuestas(nuevasRespuestas);
              }}
              placeholder="Observación (opcional)"
            />
          </View>
        );

      case 'SELECT':
        // Dropdown de opciones
        return (
          <View style={styles.itemContainer} key={item.codigo}>
            <Text style={styles.itemDescripcion}>
              {item.descripcion}
              {item.requerido && <Text style={styles.required}> *</Text>}
            </Text>
            <View style={styles.opcionesContainer}>
              {item.opciones?.map((opcion) => (
                <TouchableOpacity
                  key={opcion}
                  style={[
                    styles.opcionButton,
                    styles.selectButton,
                    valor === opcion && styles.opcionButtonActiva,
                    valor === opcion && { backgroundColor: COLORS.primary },
                  ]}
                  onPress={() => actualizarRespuesta(item.codigo, opcion)}
                >
                  <Text
                    style={[
                      styles.opcionText,
                      valor === opcion && styles.opcionTextActiva,
                    ]}
                  >
                    {opcion}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        );

      case 'CHECKBOX_BLOQUEO':
        // Este tipo ya está integrado dentro de DANOS_LISTA, no renderizar separado
        return null;

      case 'DANOS_LISTA':
        // Constantes para los selects
        const ubicaciones = item.config?.ubicaciones || ['Derecho', 'Izquierdo', 'Frente', 'Atrás', 'Arriba', 'Abajo'];
        const clasificaciones = item.config?.clasificaciones || ['Golpe', 'Rayón', 'Pieza rota', 'Falta algo'];

        return (
          <View style={styles.danosContainer} key={item.codigo}>
            {/* Checkbox Sin Daños */}
            <View style={[styles.itemRow, sinDanos && styles.bloqueoRow]}>
              <View style={styles.itemInfo}>
                <Text style={[styles.itemDescripcion, { fontWeight: 'bold' }]}>
                  ✓ Sin daños
                </Text>
                <Text style={{ fontSize: 11, color: COLORS.text.secondary }}>
                  Marcar si no hay daños que reportar
                </Text>
              </View>
              <Switch
                value={sinDanos}
                onValueChange={(v) => {
                  setSinDanos(v);
                  if (v) setDanos([]); // Limpiar daños si marca "Sin daños"
                }}
                trackColor={{ false: '#ccc', true: COLORS.success + '80' }}
                thumbColor={sinDanos ? COLORS.success : '#f4f3f4'}
              />
            </View>

            {/* Lista de daños */}
            {!sinDanos && (
              <>
                {danos.map((dano, index) => (
                  <View key={dano.id} style={styles.danoCard}>
                    <View style={styles.danoHeader}>
                      <Text style={styles.danoNumero}>Daño #{index + 1}</Text>
                      <TouchableOpacity
                        onPress={() => eliminarDano(dano.id)}
                        style={styles.danoEliminar}
                      >
                        <Text style={{ color: COLORS.danger, fontWeight: '600' }}>✕ Eliminar</Text>
                      </TouchableOpacity>
                    </View>

                    {/* Descripción */}
                    <Text style={styles.danoLabel}>Descripción del daño:</Text>
                    <TextInput
                      style={[styles.input, styles.textArea]}
                      value={dano.descripcion}
                      onChangeText={(text) => actualizarDano(dano.id, 'descripcion', text)}
                      placeholder="Ej: Abolladura en puerta trasera, lado derecho"
                      multiline
                      numberOfLines={2}
                    />

                    {/* Ubicación */}
                    <Text style={styles.danoLabel}>Ubicación del daño:</Text>
                    <View style={styles.danoSelectContainer}>
                      {ubicaciones.map((ubi: string) => (
                        <TouchableOpacity
                          key={ubi}
                          style={[
                            styles.danoSelectBtn,
                            dano.ubicacion === ubi && styles.danoSelectBtnActivo,
                          ]}
                          onPress={() => actualizarDano(dano.id, 'ubicacion', ubi)}
                        >
                          <Text style={[
                            styles.danoSelectText,
                            dano.ubicacion === ubi && styles.danoSelectTextActivo,
                          ]}>{ubi}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    {/* Clasificación */}
                    <Text style={styles.danoLabel}>Clasificación:</Text>
                    <View style={styles.danoSelectContainer}>
                      {clasificaciones.map((clas: string) => (
                        <TouchableOpacity
                          key={clas}
                          style={[
                            styles.danoSelectBtn,
                            dano.clasificacion === clas && styles.danoSelectBtnActivo,
                          ]}
                          onPress={() => actualizarDano(dano.id, 'clasificacion', clas)}
                        >
                          <Text style={[
                            styles.danoSelectText,
                            dano.clasificacion === clas && styles.danoSelectTextActivo,
                          ]}>{clas}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    {/* Fotos del daño */}
                    <Text style={styles.danoLabel}>Fotos del daño (máx. 3):</Text>
                    <View style={styles.danoFotosContainer}>
                      {dano.fotos.map((foto, fotoIdx) => (
                        <View key={fotoIdx} style={styles.danoFotoWrapper}>
                          <Image source={{ uri: foto }} style={styles.danoFoto} />
                          <TouchableOpacity
                            style={styles.danoFotoEliminar}
                            onPress={() => eliminarFotoDano(dano.id, fotoIdx)}
                          >
                            <Text style={{ color: '#fff', fontSize: 12 }}>✕</Text>
                          </TouchableOpacity>
                        </View>
                      ))}
                      {dano.fotos.length < 3 && (
                        <FotoCaptura
                          onFotoCapturada={(uri) => agregarFotoDano(dano.id, uri)}
                          titulo="+ Foto"
                          descripcion=""
                        />
                      )}
                    </View>
                  </View>
                ))}

                {/* Botón agregar daño */}
                <TouchableOpacity
                  style={styles.agregarDanoBtn}
                  onPress={agregarDano}
                >
                  <Text style={styles.agregarDanoBtnText}>+ Agregar Daño</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        );

      default:
        return null;
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Cargando plantilla...</Text>
      </View>
    );
  }

  if (!plantilla) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text style={styles.errorText}>No se encontró plantilla de inspección</Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>Volver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const seccionesCount = plantilla.secciones.length;
  const seccionActual = plantilla.secciones[seccionActiva];

  return (
    <View style={[styles.container, { paddingBottom: 50 }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <TouchableOpacity
            style={styles.backArrow}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backArrowText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Inspección 360</Text>
        </View>
        <Text style={styles.headerSubtitle}>
          Unidad: {unidadCodigo} ({tipoUnidad})
        </Text>
      </View>

      {/* Tabs de secciones */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsContainer}>
        {plantilla.secciones.map((seccion, index) => (
          <TouchableOpacity
            key={seccion.nombre}
            style={[
              styles.tab,
              seccionActiva === index && styles.tabActiva,
            ]}
            onPress={() => setSeccionActiva(index)}
          >
            <Text
              style={[
                styles.tabText,
                seccionActiva === index && styles.tabTextActiva,
              ]}
            >
              {seccion.nombre}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Progreso */}
      <View style={styles.progresoContainer}>
        <Text style={styles.progresoText}>
          Sección {seccionActiva + 1} de {seccionesCount}
        </Text>
        <View style={styles.progresoBar}>
          <View
            style={[
              styles.progresoFill,
              { width: `${((seccionActiva + 1) / seccionesCount) * 100}%` },
            ]}
          />
        </View>
      </View>

      {/* Contenido de la sección */}
      <ScrollView style={styles.content}>
        <View style={styles.seccionHeader}>
          <Text style={styles.seccionTitulo}>{seccionActual.nombre}</Text>
          <Text style={styles.seccionSubtitulo}>
            {seccionActual.items.length} items
          </Text>
        </View>

        {seccionActual.items.map(renderItem)}

        {/* Firma del inspector en la última sección */}
        {seccionActiva === seccionesCount - 1 && (
          <>

            {/* Firma del inspector */}
            <View style={styles.firmaContainer}>
              <FirmaCaptura
                onFirmaCapturada={setFirmaInspector}
                firmaActual={firmaInspector}
                titulo="Firma del Inspector"
                nombreFirmante={user?.nombre || 'Inspector'}
              />
              {!firmaInspector && (
                <View style={styles.firmaWarning}>
                  <Ionicons name="warning-outline" size={16} color={COLORS.warning} />
                  <Text style={styles.firmaWarningText}>
                    La firma es obligatoria para enviar la inspección
                  </Text>
                </View>
              )}
            </View>
          </>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Botones de navegación */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.footerButton, styles.footerButtonSecondary]}
          onPress={() => {
            if (seccionActiva > 0) {
              setSeccionActiva(seccionActiva - 1);
            } else {
              navigation.goBack();
            }
          }}
        >
          <Text style={styles.footerButtonSecondaryText}>
            {seccionActiva > 0 ? 'Anterior' : 'Cancelar'}
          </Text>
        </TouchableOpacity>

        {seccionActiva < seccionesCount - 1 ? (
          <TouchableOpacity
            style={[styles.footerButton, styles.footerButtonPrimary]}
            onPress={() => setSeccionActiva(seccionActiva + 1)}
          >
            <Text style={styles.footerButtonPrimaryText}>Siguiente</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.footerButton, styles.footerButtonSuccess]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.footerButtonPrimaryText}>Enviar Inspección</Text>
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    backgroundColor: COLORS.primary,
    padding: 16,
    paddingTop: 16,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  backArrow: {
    paddingRight: 4,
  },
  backArrowText: {
    color: COLORS.white,
    fontSize: 32,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  headerSubtitle: {
    fontSize: 13,
    color: COLORS.white,
    opacity: 0.9,
    marginTop: 2,
    marginLeft: 36,
  },
  tabsContainer: {
    backgroundColor: COLORS.white,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    maxHeight: 50,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginHorizontal: 4,
    borderRadius: 20,
    backgroundColor: COLORS.background,
  },
  tabActiva: {
    backgroundColor: COLORS.primary,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.text.secondary,
  },
  tabTextActiva: {
    color: COLORS.white,
  },
  progresoContainer: {
    padding: 12,
    backgroundColor: COLORS.white,
  },
  progresoText: {
    fontSize: 12,
    color: COLORS.text.secondary,
    marginBottom: 6,
    textAlign: 'center',
  },
  progresoBar: {
    height: 4,
    backgroundColor: COLORS.border,
    borderRadius: 2,
  },
  progresoFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 2,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  seccionHeader: {
    marginBottom: 16,
  },
  seccionTitulo: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  seccionSubtitulo: {
    fontSize: 13,
    color: COLORS.text.secondary,
    marginTop: 2,
  },
  itemContainer: {
    marginBottom: 20,
    backgroundColor: COLORS.white,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  itemInfo: {
    flex: 1,
    marginRight: 12,
  },
  itemDescripcion: {
    fontSize: 15,
    color: COLORS.text.primary,
    fontWeight: '500',
    marginBottom: 10,
  },
  required: {
    color: COLORS.danger,
  },
  opcionesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  opcionButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 2,
    backgroundColor: COLORS.white,
  },
  opcionButtonActiva: {
    borderWidth: 2,
  },
  opcionText: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.text.primary,
  },
  opcionTextActiva: {
    color: COLORS.white,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    backgroundColor: COLORS.white,
  },
  textArea: {
    height: 60,
    textAlignVertical: 'top',
  },
  textAreaLarge: {
    height: 100,
    textAlignVertical: 'top',
  },
  fotoButton: {
    marginTop: 8,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
    alignItems: 'center',
  },
  fotoButtonText: {
    color: COLORS.text.secondary,
    fontSize: 14,
  },
  observacionesContainer: {
    marginTop: 20,
    padding: 16,
    backgroundColor: COLORS.white,
    borderRadius: 12,
  },
  observacionesLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 10,
  },
  footer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: 12,
  },
  footerButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerButtonSecondary: {
    backgroundColor: COLORS.white,
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  footerButtonPrimary: {
    backgroundColor: COLORS.primary,
  },
  footerButtonSuccess: {
    backgroundColor: COLORS.success,
  },
  footerButtonSecondaryText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  footerButtonPrimaryText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.white,
  },
  loadingText: {
    marginTop: 16,
    color: COLORS.text.secondary,
    fontSize: 14,
  },
  errorText: {
    color: COLORS.text.secondary,
    fontSize: 16,
    marginBottom: 16,
  },
  backButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  backButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
  fotoSection: {
    marginTop: 12,
  },
  firmaContainer: {
    marginTop: 20,
  },
  firmaWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff7ed',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  firmaWarningText: {
    fontSize: 13,
    color: COLORS.warning,
    marginLeft: 8,
    flex: 1,
  },
  observacionInput: {
    marginTop: 12,
    backgroundColor: COLORS.gray[50],
    borderColor: COLORS.gray[200],
  },
  selectButton: {
    borderColor: COLORS.primary,
    flex: 1,
    minWidth: 70,
  },
  bloqueoRow: {
    backgroundColor: '#e0f2fe',
    borderWidth: 1,
    borderColor: COLORS.info,
  },
  // Estilos para sección de daños
  danosContainer: {
    marginBottom: 16,
  },
  danoCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  danoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  danoNumero: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  danoEliminar: {
    padding: 4,
  },
  danoLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.text.secondary,
    marginTop: 12,
    marginBottom: 6,
  },
  danoSelectContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  danoSelectBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  danoSelectBtnActivo: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  danoSelectText: {
    fontSize: 13,
    color: COLORS.text.primary,
  },
  danoSelectTextActivo: {
    color: COLORS.white,
  },
  danoFotosContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  danoFotoWrapper: {
    position: 'relative',
    width: 80,
    height: 80,
    borderRadius: 8,
    overflow: 'hidden',
  },
  danoFoto: {
    width: '100%',
    height: '100%',
  },
  danoFotoEliminar: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(220, 38, 38, 0.8)',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  agregarDanoBtn: {
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.primary,
    borderStyle: 'dashed',
    alignItems: 'center',
  },
  agregarDanoBtnText: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: '600',
  },
});
