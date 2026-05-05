import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Switch } from 'react-native';
import { Controller, Control, useWatch } from 'react-hook-form';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../core/theme';
import { PlacaInput } from './PlacaInput';
import SelectConOtro from './SelectConOtro';
import CrossPlatformPicker from './CrossPlatformPicker';
import PersonaManager from './PersonaManager';
import DispositivosSeguridad from './DispositivosSeguridad';
import DateField from './fields/DateField';
import { catalogoStorage } from '../core/storage/catalogoStorage';

interface VehiculoFormProps {
    control: Control<any>;
    index: number;
    onRemove: () => void;
}

const LICENCIA_TIPOS = ['A', 'B', 'C', 'M', 'E'];
const DOC_AUTORIDADES = ['PNC', 'PMT', 'MP'];

export const VehiculoForm: React.FC<VehiculoFormProps> = ({ control, index, onRemove }) => {
    const theme = useTheme();
    const c = theme.colors;

    const [tiposVehiculo, setTiposVehiculo] = useState<{label: string, value: string}[]>([]);
    const [marcas, setMarcas] = useState<{label: string, value: string}[]>([]);
    const [etnias, setEtnias] = useState<{label: string, value: string}[]>([]);

    useEffect(() => {
        catalogoStorage.init().then(() => {
            catalogoStorage.getTiposVehiculo().then(t =>
                setTiposVehiculo(t.map(x => ({ label: x.nombre, value: x.nombre })))
            );
            catalogoStorage.getMarcasVehiculo().then(m =>
                setMarcas(m.map(x => ({ label: x.nombre, value: x.nombre })))
            );
            catalogoStorage.getEtnias().then(e =>
                setEtnias(e.map(x => ({ label: x.nombre, value: x.nombre })))
            );
        });
    }, []);

    const [expandedSections, setExpandedSections] = useState<{ [key: string]: boolean }>({
        preliminares: true,
        tc: false,
        licencia: false,
        carga: false,
        contenedor: false,
        bus: false,
        sancion: false,
        documentos: false,
        personas: false,
        dispositivos: false,
        custodia: false,
    });

    const cargado = useWatch({ control, name: `vehiculos.${index}.cargado` });
    const tieneContenedor = useWatch({ control, name: `vehiculos.${index}.tiene_contenedor` });
    const esBus = useWatch({ control, name: `vehiculos.${index}.es_bus` });
    const tieneSancion = useWatch({ control, name: `vehiculos.${index}.tiene_sancion` });
    const estadoPiloto = useWatch({ control, name: `vehiculos.${index}.estado_piloto` });
    const custodiaEstado = useWatch({ control, name: `vehiculos.${index}.custodia_estado` });

    const toggleSection = (section: string) => {
        setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
    };

    const inputStyle = [
        styles.input,
        { borderColor: c.border, backgroundColor: c.surface, color: c.text.primary },
    ];

    const AccordionHeader = ({ sectionKey, title }: { sectionKey: string; title: string }) => (
        <TouchableOpacity
            style={[styles.accordionHeader, { backgroundColor: c.background, borderColor: c.border }]}
            onPress={() => toggleSection(sectionKey)}
            activeOpacity={0.7}
        >
            <Text style={[styles.accordionTitle, { color: c.text.primary }]}>{title}</Text>
            <MaterialCommunityIcons
                name={expandedSections[sectionKey] ? 'chevron-up' : 'chevron-down'}
                size={20}
                color={c.text.secondary}
            />
        </TouchableOpacity>
    );

    const SwitchToggle = ({
        label,
        fieldName,
    }: {
        label: string;
        fieldName: string;
    }) => (
        <View style={[styles.switchRow, { backgroundColor: c.background, borderColor: c.border }]}>
            <Text style={[styles.switchLabel, { color: c.text.primary }]}>{label}</Text>
            <Controller
                control={control}
                name={`vehiculos.${index}.${fieldName}`}
                render={({ field: { onChange, value } }) => (
                    <Switch
                        value={value || false}
                        onValueChange={onChange}
                        trackColor={{ false: c.gray[200], true: c.primary + '80' }}
                        thumbColor={value ? c.primary : c.gray[400]}
                    />
                )}
            />
        </View>
    );

    return (
        <View style={[styles.container, { borderColor: c.border, backgroundColor: c.surface }]}>
            {/* Header */}
            <View style={[styles.header, { borderBottomColor: c.border }]}>
                <Text style={[styles.title, { color: c.text.primary }]}>Vehículo {index + 1}</Text>
                <TouchableOpacity onPress={onRemove} style={styles.removeBtn}>
                    <Text style={[styles.removeBtnText, { color: c.danger }]}>Eliminar</Text>
                </TouchableOpacity>
            </View>

            {/* ============================================ */}
            {/* SECCIÓN 1: PRELIMINARES */}
            {/* ============================================ */}
            <AccordionHeader sectionKey="preliminares" title="Preliminares" />

            {expandedSections.preliminares && (
                <View style={[styles.section, { backgroundColor: c.surface }]}>
                    <Controller
                        control={control}
                        name={`vehiculos.${index}.tipo_vehiculo`}
                        render={({ field: { onChange, value } }) => (
                            <SelectConOtro
                                label="Tipo Vehículo"
                                value={value || ''}
                                onChange={onChange}
                                options={tiposVehiculo}
                                placeholder="Tipo Vehículo *"
                            />
                        )}
                    />

                    <View style={styles.row}>
                        <Controller
                            control={control}
                            name={`vehiculos.${index}.color`}
                            render={({ field: { onChange, value } }) => (
                                <View style={[styles.fieldGroup, styles.half]}>
                                    <Text style={[styles.fieldLabel, { color: c.text.secondary }]}>Color</Text>
                                    <TextInput
                                        value={value || ''}
                                        onChangeText={onChange}
                                        style={inputStyle}
                                        placeholderTextColor={c.text.disabled}
                                        placeholder="Color"
                                    />
                                </View>
                            )}
                        />
                        <Controller
                            control={control}
                            name={`vehiculos.${index}.marca`}
                            render={({ field: { onChange, value } }) => (
                                <View style={styles.half}>
                                    <SelectConOtro
                                        label="Marca"
                                        value={value || ''}
                                        onChange={onChange}
                                        options={marcas}
                                        placeholder="Marca"
                                    />
                                </View>
                            )}
                        />
                    </View>

                    <Controller
                        control={control}
                        name={`vehiculos.${index}.placa`}
                        render={({ field: { onChange, value } }) => (
                            <Controller
                                control={control}
                                name={`vehiculos.${index}.placa_extranjera`}
                                render={({ field: { onChange: onExtranjeroChange, value: esExtranjero } }) => (
                                    <PlacaInput
                                        value={value || ''}
                                        onChange={onChange}
                                        esExtranjero={esExtranjero || false}
                                        onExtranjeroChange={onExtranjeroChange}
                                    />
                                )}
                            />
                        )}
                    />

                    <Controller
                        control={control}
                        name={`vehiculos.${index}.estado_piloto`}
                        defaultValue="ILESO"
                        render={({ field: { onChange, value } }) => (
                            <CrossPlatformPicker
                                label="Estado del Piloto *"
                                selectedValue={value || 'ILESO'}
                                onValueChange={onChange}
                                options={[
                                    { label: 'Ileso', value: 'ILESO' },
                                    { label: 'Herido', value: 'HERIDO' },
                                    { label: 'Trasladado', value: 'TRASLADADO' },
                                    { label: 'Fallecido', value: 'FALLECIDO' },
                                    { label: 'Fugado', value: 'FUGADO' },
                                    { label: 'Desconocido', value: 'DESCONOCIDO' },
                                ]}
                                placeholder="Seleccione..."
                            />
                        )}
                    />

                    <View style={[styles.switchRow, { backgroundColor: c.background, borderColor: c.border }]}>
                        <Text style={[styles.switchLabel, { color: c.text.primary }]}>¿Ebriedad del Piloto?</Text>
                        <Controller
                            control={control}
                            name={`vehiculos.${index}.ebriedad`}
                            render={({ field: { onChange, value } }) => (
                                <Switch
                                    value={value || false}
                                    onValueChange={onChange}
                                    trackColor={{ false: c.gray[200], true: c.primary + '80' }}
                                    thumbColor={value ? c.primary : c.gray[400]}
                                />
                            )}
                        />
                    </View>

                    {(estadoPiloto === 'TRASLADADO' || estadoPiloto === 'HERIDO') && (
                        <>
                            <View style={styles.fieldGroup}>
                                <Text style={[styles.fieldLabel, { color: c.text.secondary }]}>Hospital de Traslado</Text>
                                <Controller
                                    control={control}
                                    name={`vehiculos.${index}.hospital_traslado_piloto`}
                                    render={({ field: { onChange, value } }) => (
                                        <TextInput
                                            value={value || ''}
                                            onChangeText={onChange}
                                            style={inputStyle}
                                            placeholderTextColor={c.text.disabled}
                                        />
                                    )}
                                />
                            </View>
                            <View style={styles.fieldGroup}>
                                <Text style={[styles.fieldLabel, { color: c.text.secondary }]}>Descripción de Lesiones</Text>
                                <Controller
                                    control={control}
                                    name={`vehiculos.${index}.descripcion_lesiones_piloto`}
                                    render={({ field: { onChange, value } }) => (
                                        <TextInput
                                            value={value || ''}
                                            onChangeText={onChange}
                                            style={[inputStyle, { minHeight: 72, textAlignVertical: 'top' }]}
                                            multiline
                                            numberOfLines={2}
                                            placeholderTextColor={c.text.disabled}
                                        />
                                    )}
                                />
                            </View>
                        </>
                    )}

                    {estadoPiloto === 'FALLECIDO' && (
                        <>
                            <View style={styles.fieldGroup}>
                                <Text style={[styles.fieldLabel, { color: c.text.secondary }]}>Causa Aparente de Fallecimiento</Text>
                                <Controller
                                    control={control}
                                    name={`vehiculos.${index}.causa_fallecimiento`}
                                    render={({ field: { onChange, value } }) => (
                                        <TextInput
                                            value={value || ''}
                                            onChangeText={onChange}
                                            style={[inputStyle, { minHeight: 72, textAlignVertical: 'top' }]}
                                            multiline
                                            numberOfLines={2}
                                            placeholderTextColor={c.text.disabled}
                                        />
                                    )}
                                />
                            </View>
                            <Controller
                                control={control}
                                name={`vehiculos.${index}.lugar_fallecimiento`}
                                render={({ field: { onChange, value } }) => (
                                    <CrossPlatformPicker
                                        label="Lugar de Fallecimiento"
                                        selectedValue={value}
                                        onValueChange={onChange}
                                        options={[
                                            { label: 'En el lugar del hecho', value: 'EN_LUGAR' },
                                            { label: 'En traslado al hospital', value: 'EN_TRASLADO' },
                                            { label: 'En el hospital', value: 'EN_HOSPITAL' },
                                            { label: 'Otro', value: 'OTRO' },
                                        ]}
                                        placeholder="Seleccione..."
                                    />
                                )}
                            />
                            <View style={styles.fieldGroup}>
                                <Text style={[styles.fieldLabel, { color: c.text.secondary }]}>Hospital (si fue trasladado)</Text>
                                <Controller
                                    control={control}
                                    name={`vehiculos.${index}.hospital_traslado_piloto`}
                                    render={({ field: { onChange, value } }) => (
                                        <TextInput
                                            value={value || ''}
                                            onChangeText={onChange}
                                            style={inputStyle}
                                            placeholderTextColor={c.text.disabled}
                                        />
                                    )}
                                />
                            </View>
                            <View style={styles.fieldGroup}>
                                <Text style={[styles.fieldLabel, { color: c.text.secondary }]}>Consignado por (autoridad)</Text>
                                <Controller
                                    control={control}
                                    name={`vehiculos.${index}.consignado_por`}
                                    render={({ field: { onChange, value } }) => (
                                        <TextInput
                                            value={value || ''}
                                            onChangeText={onChange}
                                            style={inputStyle}
                                            placeholder="Ej: MP, PNC"
                                            placeholderTextColor={c.text.disabled}
                                        />
                                    )}
                                />
                            </View>
                        </>
                    )}

                    <View style={styles.fieldGroup}>
                        <Text style={[styles.fieldLabel, { color: c.text.secondary }]}>Personas Asistidas</Text>
                        <Controller
                            control={control}
                            name={`vehiculos.${index}.personas_asistidas`}
                            render={({ field: { onChange, value } }) => (
                                <TextInput
                                    value={value?.toString() || '0'}
                                    onChangeText={(text) => onChange(parseInt(text) || 0)}
                                    keyboardType="numeric"
                                    style={inputStyle}
                                    placeholderTextColor={c.text.disabled}
                                />
                            )}
                        />
                    </View>
                </View>
            )}

            {/* ============================================ */}
            {/* SECCIÓN 2: TARJETA CIRCULACIÓN */}
            {/* ============================================ */}
            <AccordionHeader sectionKey="tc" title="Tarjeta Circulación" />

            {expandedSections.tc && (
                <View style={[styles.section, { backgroundColor: c.surface }]}>
                    {[
                        { name: 'tarjeta_circulacion', label: 'No. Tarjeta Circulación', keyboard: 'numeric' as const },
                        { name: 'nit', label: 'NIT Propietario', keyboard: 'numeric' as const },
                        { name: 'nombre_propietario', label: 'Nombre Propietario', keyboard: 'default' as const },
                    ].map(({ name, label, keyboard }) => (
                        <View key={name} style={styles.fieldGroup}>
                            <Text style={[styles.fieldLabel, { color: c.text.secondary }]}>{label}</Text>
                            <Controller
                                control={control}
                                name={`vehiculos.${index}.${name}`}
                                render={({ field: { onChange, value } }) => (
                                    <TextInput
                                        value={value || ''}
                                        onChangeText={onChange}
                                        keyboardType={keyboard}
                                        style={inputStyle}
                                        placeholderTextColor={c.text.disabled}
                                    />
                                )}
                            />
                        </View>
                    ))}

                    <View style={styles.fieldGroup}>
                        <Text style={[styles.fieldLabel, { color: c.text.secondary }]}>Dirección Propietario</Text>
                        <Controller
                            control={control}
                            name={`vehiculos.${index}.direccion_propietario`}
                            render={({ field: { onChange, value } }) => (
                                <TextInput
                                    value={value || ''}
                                    onChangeText={onChange}
                                    style={[inputStyle, { minHeight: 72, textAlignVertical: 'top' }]}
                                    multiline
                                    numberOfLines={2}
                                    placeholderTextColor={c.text.disabled}
                                />
                            )}
                        />
                    </View>

                    <View style={styles.fieldGroup}>
                        <Text style={[styles.fieldLabel, { color: c.text.secondary }]}>Modelo (Año)</Text>
                        <Controller
                            control={control}
                            name={`vehiculos.${index}.modelo`}
                            render={({ field: { onChange, value } }) => (
                                <TextInput
                                    value={value || ''}
                                    onChangeText={onChange}
                                    keyboardType="numeric"
                                    style={inputStyle}
                                    placeholder="Ej: 2020"
                                    placeholderTextColor={c.text.disabled}
                                />
                            )}
                        />
                    </View>
                </View>
            )}

            {/* ============================================ */}
            {/* SECCIÓN 3: LICENCIA */}
            {/* ============================================ */}
            <AccordionHeader sectionKey="licencia" title="Licencia de Conducir" />

            {expandedSections.licencia && (
                <View style={[styles.section, { backgroundColor: c.surface }]}>
                    <View style={styles.fieldGroup}>
                        <Text style={[styles.fieldLabel, { color: c.text.secondary }]}>Nombre Completo del Piloto</Text>
                        <Controller
                            control={control}
                            name={`vehiculos.${index}.nombre_piloto`}
                            render={({ field: { onChange, value } }) => (
                                <TextInput
                                    value={value || ''}
                                    onChangeText={onChange}
                                    style={inputStyle}
                                    placeholderTextColor={c.text.disabled}
                                />
                            )}
                        />
                    </View>

                    {/* Tipo de Licencia — chip selector */}
                    <Controller
                        control={control}
                        name={`vehiculos.${index}.licencia_tipo`}
                        render={({ field: { onChange, value } }) => (
                            <View style={styles.fieldGroup}>
                                <Text style={[styles.fieldLabel, { color: c.text.secondary }]}>Tipo de Licencia</Text>
                                <View style={styles.chipRow}>
                                    {LICENCIA_TIPOS.map((tipo) => {
                                        const selected = value === tipo;
                                        return (
                                            <TouchableOpacity
                                                key={tipo}
                                                onPress={() => onChange(tipo)}
                                                style={[
                                                    styles.chip,
                                                    {
                                                        backgroundColor: selected ? c.primary : c.surface,
                                                        borderColor: selected ? c.primary : c.border,
                                                    },
                                                ]}
                                                activeOpacity={0.7}
                                            >
                                                <Text style={[styles.chipText, { color: selected ? c.text.inverse : c.text.primary }]}>
                                                    {tipo}
                                                </Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                                <Text style={[styles.helperText, { color: c.text.secondary }]}>
                                    A: Motos | B: Livianos | C: Pesados | M: Maquinaria | E: Especial
                                </Text>
                            </View>
                        )}
                    />

                    <View style={styles.fieldGroup}>
                        <Text style={[styles.fieldLabel, { color: c.text.secondary }]}>No. Licencia</Text>
                        <Controller
                            control={control}
                            name={`vehiculos.${index}.licencia_numero`}
                            render={({ field: { onChange, value } }) => (
                                <TextInput
                                    value={value || ''}
                                    onChangeText={onChange}
                                    keyboardType="numeric"
                                    style={inputStyle}
                                    placeholderTextColor={c.text.disabled}
                                />
                            )}
                        />
                    </View>

                    <Controller
                        control={control}
                        name={`vehiculos.${index}.licencia_vencimiento`}
                        render={({ field: { onChange, value } }) => (
                            <DateField
                                label="Fecha Vencimiento Licencia"
                                value={value ? new Date(value) : null}
                                onChange={onChange}
                                mode="date"
                            />
                        )}
                    />

                    <View style={styles.fieldGroup}>
                        <Text style={[styles.fieldLabel, { color: c.text.secondary }]}>Antigüedad Licencia (años)</Text>
                        <Controller
                            control={control}
                            name={`vehiculos.${index}.licencia_antiguedad`}
                            render={({ field: { onChange, value } }) => (
                                <TextInput
                                    value={value?.toString() || ''}
                                    onChangeText={(text) => onChange(parseInt(text) || 0)}
                                    keyboardType="numeric"
                                    style={inputStyle}
                                    placeholderTextColor={c.text.disabled}
                                />
                            )}
                        />
                    </View>

                    <Controller
                        control={control}
                        name={`vehiculos.${index}.fecha_nacimiento_piloto`}
                        render={({ field: { onChange, value } }) => (
                            <DateField
                                label="Fecha de Nacimiento"
                                value={value ? new Date(value) : null}
                                onChange={onChange}
                                mode="date"
                            />
                        )}
                    />

                    <Controller
                        control={control}
                        name={`vehiculos.${index}.etnia_piloto`}
                        render={({ field: { onChange, value } }) => (
                            <SelectConOtro
                                label="Etnia del Piloto"
                                value={value || ''}
                                onChange={onChange}
                                options={etnias}
                                placeholder="Etnia del Piloto"
                            />
                        )}
                    />

                    {/* Sexo del Piloto — radio row */}
                    <Controller
                        control={control}
                        name={`vehiculos.${index}.sexo_piloto`}
                        render={({ field: { onChange, value } }) => (
                            <View style={styles.fieldGroup}>
                                <Text style={[styles.fieldLabel, { color: c.text.secondary }]}>Sexo del Piloto</Text>
                                <View style={styles.radioRow}>
                                    {[{ label: 'Masculino', val: 'M' }, { label: 'Femenino', val: 'F' }].map(({ label, val }) => {
                                        const selected = value === val;
                                        return (
                                            <TouchableOpacity
                                                key={val}
                                                onPress={() => onChange(val)}
                                                style={styles.radioOption}
                                                activeOpacity={0.7}
                                            >
                                                <View style={[styles.radioOuter, { borderColor: selected ? c.primary : c.border }]}>
                                                    {selected && <View style={[styles.radioInner, { backgroundColor: c.primary }]} />}
                                                </View>
                                                <Text style={[styles.radioLabel, { color: c.text.primary }]}>{label}</Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            </View>
                        )}
                    />
                </View>
            )}

            {/* ============================================ */}
            {/* SECCIÓN 4: CARGA */}
            {/* ============================================ */}
            <SwitchToggle label="¿Vehículo Cargado?" fieldName="cargado" />

            {cargado && (
                <>
                    <AccordionHeader sectionKey="carga" title="Datos de Carga" />
                    {expandedSections.carga && (
                        <View style={[styles.section, { backgroundColor: c.surface }]}>
                            <View style={styles.fieldGroup}>
                                <Text style={[styles.fieldLabel, { color: c.text.secondary }]}>Tipo de Carga</Text>
                                <Controller
                                    control={control}
                                    name={`vehiculos.${index}.carga_tipo`}
                                    render={({ field: { onChange, value } }) => (
                                        <TextInput
                                            value={value || ''}
                                            onChangeText={onChange}
                                            style={inputStyle}
                                            placeholder="Ej: Granos, Materiales, Mercadería"
                                            placeholderTextColor={c.text.disabled}
                                        />
                                    )}
                                />
                            </View>
                            <View style={styles.fieldGroup}>
                                <Text style={[styles.fieldLabel, { color: c.text.secondary }]}>Descripción de Carga</Text>
                                <Controller
                                    control={control}
                                    name={`vehiculos.${index}.carga_descripcion`}
                                    render={({ field: { onChange, value } }) => (
                                        <TextInput
                                            value={value || ''}
                                            onChangeText={onChange}
                                            style={[inputStyle, { minHeight: 88, textAlignVertical: 'top' }]}
                                            multiline
                                            numberOfLines={3}
                                            placeholderTextColor={c.text.disabled}
                                        />
                                    )}
                                />
                            </View>
                        </View>
                    )}
                </>
            )}

            {/* ============================================ */}
            {/* SECCIÓN 5: CONTENEDOR */}
            {/* ============================================ */}
            <SwitchToggle label="¿Tiene Contenedor/Remolque?" fieldName="tiene_contenedor" />

            {tieneContenedor && (
                <>
                    <AccordionHeader sectionKey="contenedor" title="Datos de Contenedor/Remolque" />
                    {expandedSections.contenedor && (
                        <View style={[styles.section, { backgroundColor: c.surface }]}>
                            <View style={styles.fieldGroup}>
                                <Text style={[styles.fieldLabel, { color: c.text.secondary }]}>No. Contenedor/Remolque</Text>
                                <Controller
                                    control={control}
                                    name={`vehiculos.${index}.contenedor_numero`}
                                    render={({ field: { onChange, value } }) => (
                                        <TextInput
                                            value={value || ''}
                                            onChangeText={onChange}
                                            style={inputStyle}
                                            placeholderTextColor={c.text.disabled}
                                        />
                                    )}
                                />
                            </View>
                            <View style={styles.fieldGroup}>
                                <Text style={[styles.fieldLabel, { color: c.text.secondary }]}>Empresa Contenedor</Text>
                                <Controller
                                    control={control}
                                    name={`vehiculos.${index}.contenedor_empresa`}
                                    render={({ field: { onChange, value } }) => (
                                        <TextInput
                                            value={value || ''}
                                            onChangeText={onChange}
                                            style={inputStyle}
                                            placeholder="Ej: MAERSK, EVERGREEN"
                                            placeholderTextColor={c.text.disabled}
                                        />
                                    )}
                                />
                            </View>
                        </View>
                    )}
                </>
            )}

            {/* ============================================ */}
            {/* SECCIÓN 6: BUS EXTRAURBANO */}
            {/* ============================================ */}
            <SwitchToggle label="¿Es Bus Extraurbano?" fieldName="es_bus" />

            {esBus && (
                <>
                    <AccordionHeader sectionKey="bus" title="Datos de Bus Extraurbano" />
                    {expandedSections.bus && (
                        <View style={[styles.section, { backgroundColor: c.surface }]}>
                            <View style={styles.fieldGroup}>
                                <Text style={[styles.fieldLabel, { color: c.text.secondary }]}>Empresa de Transporte</Text>
                                <Controller
                                    control={control}
                                    name={`vehiculos.${index}.bus_empresa`}
                                    render={({ field: { onChange, value } }) => (
                                        <TextInput
                                            value={value || ''}
                                            onChangeText={onChange}
                                            style={inputStyle}
                                            placeholderTextColor={c.text.disabled}
                                        />
                                    )}
                                />
                            </View>
                            <View style={styles.fieldGroup}>
                                <Text style={[styles.fieldLabel, { color: c.text.secondary }]}>Ruta del Bus</Text>
                                <Controller
                                    control={control}
                                    name={`vehiculos.${index}.bus_ruta`}
                                    render={({ field: { onChange, value } }) => (
                                        <TextInput
                                            value={value || ''}
                                            onChangeText={onChange}
                                            style={inputStyle}
                                            placeholder="Ej: Guatemala - Quetzaltenango"
                                            placeholderTextColor={c.text.disabled}
                                        />
                                    )}
                                />
                            </View>
                            <View style={styles.fieldGroup}>
                                <Text style={[styles.fieldLabel, { color: c.text.secondary }]}>Cantidad de Pasajeros</Text>
                                <Controller
                                    control={control}
                                    name={`vehiculos.${index}.bus_pasajeros`}
                                    render={({ field: { onChange, value } }) => (
                                        <TextInput
                                            value={value?.toString() || ''}
                                            onChangeText={(text) => onChange(parseInt(text) || 0)}
                                            keyboardType="numeric"
                                            style={inputStyle}
                                            placeholderTextColor={c.text.disabled}
                                        />
                                    )}
                                />
                            </View>
                        </View>
                    )}
                </>
            )}

            {/* ============================================ */}
            {/* SECCIÓN 7: SANCIÓN */}
            {/* ============================================ */}
            <SwitchToggle label="¿Se Aplicó Sanción?" fieldName="tiene_sancion" />

            {tieneSancion && (
                <>
                    <AccordionHeader sectionKey="sancion" title="Datos de Sanción" />
                    {expandedSections.sancion && (
                        <View style={[styles.section, { backgroundColor: c.surface }]}>
                            <View style={styles.fieldGroup}>
                                <Text style={[styles.fieldLabel, { color: c.text.secondary }]}>Artículo</Text>
                                <Controller
                                    control={control}
                                    name={`vehiculos.${index}.sancion_articulo`}
                                    render={({ field: { onChange, value } }) => (
                                        <TextInput
                                            value={value || ''}
                                            onChangeText={onChange}
                                            style={inputStyle}
                                            placeholder="Ej: Art. 145, Art. 146"
                                            placeholderTextColor={c.text.disabled}
                                        />
                                    )}
                                />
                            </View>
                            <View style={styles.fieldGroup}>
                                <Text style={[styles.fieldLabel, { color: c.text.secondary }]}>Descripción de Sanción</Text>
                                <Controller
                                    control={control}
                                    name={`vehiculos.${index}.sancion_descripcion`}
                                    render={({ field: { onChange, value } }) => (
                                        <TextInput
                                            value={value || ''}
                                            onChangeText={onChange}
                                            style={[inputStyle, { minHeight: 88, textAlignVertical: 'top' }]}
                                            multiline
                                            numberOfLines={3}
                                            placeholder="Ej: Conducir sin licencia, Exceso de velocidad"
                                            placeholderTextColor={c.text.disabled}
                                        />
                                    )}
                                />
                            </View>
                            <View style={styles.fieldGroup}>
                                <Text style={[styles.fieldLabel, { color: c.text.secondary }]}>Monto (Q)</Text>
                                <Controller
                                    control={control}
                                    name={`vehiculos.${index}.sancion_monto`}
                                    render={({ field: { onChange, value } }) => (
                                        <TextInput
                                            value={value?.toString() || ''}
                                            onChangeText={(text) => onChange(parseFloat(text) || 0)}
                                            keyboardType="decimal-pad"
                                            style={inputStyle}
                                            placeholder="0.00"
                                            placeholderTextColor={c.text.disabled}
                                        />
                                    )}
                                />
                            </View>
                        </View>
                    )}
                </>
            )}

            {/* ============================================ */}
            {/* SECCIÓN 8: DOCUMENTOS CONSIGNADOS */}
            {/* ============================================ */}
            <AccordionHeader sectionKey="documentos" title="Documentos Consignados" />

            {expandedSections.documentos && (
                <View style={[styles.section, { backgroundColor: c.surface }]}>
                    <Text style={[styles.sectionInfo, { color: c.text.secondary }]}>
                        Marque los documentos que fueron consignados a la autoridad
                    </Text>

                    {[
                        { name: 'doc_consignado_licencia', label: 'Licencia de conducir' },
                        { name: 'doc_consignado_tarjeta_circulacion', label: 'Tarjeta de circulación' },
                        { name: 'doc_consignado_tarjeta', label: 'Tarjeta de propiedad' },
                        { name: 'doc_consignado_licencia_transporte', label: 'Licencia de transporte' },
                        { name: 'doc_consignado_tarjeta_operaciones', label: 'Tarjeta de operaciones' },
                        { name: 'doc_consignado_poliza', label: 'Póliza de seguro' },
                    ].map(({ name, label }) => (
                        <View key={name} style={[styles.switchRow, { backgroundColor: c.background, borderColor: c.border }]}>
                            <Text style={[styles.switchLabel, { color: c.text.primary }]}>{label}</Text>
                            <Controller
                                control={control}
                                name={`vehiculos.${index}.${name}`}
                                render={({ field: { onChange, value } }) => (
                                    <Switch
                                        value={value || false}
                                        onValueChange={onChange}
                                        trackColor={{ false: c.gray[200], true: c.primary + '80' }}
                                        thumbColor={value ? c.primary : c.gray[400]}
                                    />
                                )}
                            />
                        </View>
                    ))}

                    {/* Consignado por — chip selector */}
                    <Controller
                        control={control}
                        name={`vehiculos.${index}.doc_consignado_por`}
                        render={({ field: { onChange, value } }) => (
                            <View style={[styles.fieldGroup, { marginTop: 10 }]}>
                                <Text style={[styles.fieldLabel, { color: c.text.secondary }]}>Consignado por (autoridad)</Text>
                                <View style={styles.chipRow}>
                                    {DOC_AUTORIDADES.map((aut) => {
                                        const selected = value === aut;
                                        return (
                                            <TouchableOpacity
                                                key={aut}
                                                onPress={() => onChange(aut)}
                                                style={[
                                                    styles.chip,
                                                    {
                                                        backgroundColor: selected ? c.primary : c.surface,
                                                        borderColor: selected ? c.primary : c.border,
                                                    },
                                                ]}
                                                activeOpacity={0.7}
                                            >
                                                <Text style={[styles.chipText, { color: selected ? c.text.inverse : c.text.primary }]}>
                                                    {aut}
                                                </Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            </View>
                        )}
                    />
                </View>
            )}

            {/* ============================================ */}
            {/* SECCIÓN 9: PERSONAS / ACOMPAÑANTES */}
            {/* ============================================ */}
            <AccordionHeader sectionKey="personas" title="Personas / Acompañantes" />

            {expandedSections.personas && (
                <View style={[styles.section, { backgroundColor: c.surface }]}>
                    <PersonaManager control={control} vehiculoIndex={index} />
                </View>
            )}

            {/* ============================================ */}
            {/* SECCIÓN 10: DISPOSITIVOS DE SEGURIDAD */}
            {/* ============================================ */}
            <AccordionHeader sectionKey="dispositivos" title="Dispositivos de Seguridad" />

            {expandedSections.dispositivos && (
                <View style={[styles.section, { backgroundColor: c.surface }]}>
                    <DispositivosSeguridad control={control} vehiculoIndex={index} />
                </View>
            )}

            {/* ============================================ */}
            {/* SECCIÓN 11: CUSTODIA DEL VEHÍCULO */}
            {/* ============================================ */}
            <AccordionHeader sectionKey="custodia" title="Custodia del Vehículo" />

            {expandedSections.custodia && (
                <View style={[styles.section, { backgroundColor: c.surface }]}>
                    <Controller
                        control={control}
                        name={`vehiculos.${index}.custodia_estado`}
                        defaultValue="LIBRE"
                        render={({ field: { onChange, value } }) => (
                            <CrossPlatformPicker
                                label="Estado de Custodia"
                                selectedValue={value || 'LIBRE'}
                                onValueChange={onChange}
                                options={[
                                    { label: 'Libre', value: 'LIBRE' },
                                    { label: 'Consignado', value: 'CONSIGNADO' },
                                    { label: 'Grúa', value: 'GRUA' },
                                    { label: 'Liberado', value: 'LIBERADO' },
                                ]}
                                placeholder="Seleccione..."
                            />
                        )}
                    />

                    {custodiaEstado && custodiaEstado !== 'LIBRE' && (
                        <>
                            {[
                                { name: 'custodia_autoridad', label: 'Autoridad' },
                                { name: 'custodia_motivo', label: 'Motivo' },
                                { name: 'custodia_destino', label: 'Destino' },
                            ].map(({ name, label }) => (
                                <View key={name} style={styles.fieldGroup}>
                                    <Text style={[styles.fieldLabel, { color: c.text.secondary }]}>{label}</Text>
                                    <Controller
                                        control={control}
                                        name={`vehiculos.${index}.${name}`}
                                        render={({ field: { onChange, value } }) => (
                                            <TextInput
                                                value={value || ''}
                                                onChangeText={onChange}
                                                style={inputStyle}
                                                placeholderTextColor={c.text.disabled}
                                            />
                                        )}
                                    />
                                </View>
                            ))}
                        </>
                    )}
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        borderWidth: 1,
        borderRadius: 10,
        marginBottom: 12,
        overflow: 'hidden',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    title: {
        fontSize: 17,
        fontWeight: '700',
    },
    removeBtn: {
        paddingVertical: 6,
        paddingHorizontal: 10,
    },
    removeBtnText: {
        fontSize: 14,
        fontWeight: '600',
    },
    accordionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderTopWidth: StyleSheet.hairlineWidth,
    },
    accordionTitle: {
        fontSize: 15,
        fontWeight: '600',
    },
    section: {
        paddingHorizontal: 14,
        paddingVertical: 10,
    },
    fieldGroup: {
        marginBottom: 12,
    },
    fieldLabel: {
        fontSize: 12,
        fontWeight: '500',
        marginBottom: 4,
    },
    input: {
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 15,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 0,
    },
    half: {
        width: '48%',
    },
    switchRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 14,
        borderTopWidth: StyleSheet.hairlineWidth,
    },
    switchLabel: {
        fontSize: 15,
        fontWeight: '500',
        flex: 1,
        marginRight: 8,
    },
    chipRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginTop: 4,
    },
    chip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
    },
    chipText: {
        fontSize: 14,
        fontWeight: '600',
    },
    radioRow: {
        flexDirection: 'row',
        gap: 20,
        marginTop: 4,
    },
    radioOption: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    radioOuter: {
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 2,
        alignItems: 'center',
        justifyContent: 'center',
    },
    radioInner: {
        width: 10,
        height: 10,
        borderRadius: 5,
    },
    radioLabel: {
        fontSize: 15,
    },
    helperText: {
        fontSize: 11,
        marginTop: 4,
    },
    sectionInfo: {
        fontSize: 13,
        marginBottom: 12,
        fontStyle: 'italic',
    },
});
