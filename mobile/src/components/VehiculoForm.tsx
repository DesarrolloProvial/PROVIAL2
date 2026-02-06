import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Platform } from 'react-native';
import { Controller, Control, useWatch } from 'react-hook-form';
import {
    TextInput,
    Button,
    HelperText,
    Switch,
    RadioButton,
    List,
    SegmentedButtons
} from 'react-native-paper';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { PlacaInput } from './PlacaInput';
import SelectConOtro from './SelectConOtro';
import { catalogoStorage } from '../core/storage/catalogoStorage';

interface VehiculoFormProps {
    control: Control<any>;
    index: number;
    onRemove: () => void;
}

export const VehiculoForm: React.FC<VehiculoFormProps> = ({ control, index, onRemove }) => {
    // Catálogos desde SQLite
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

    // Estado para secciones expandidas/colapsadas
    const [expandedSections, setExpandedSections] = useState<{ [key: string]: boolean }>({
        preliminares: true, // Expandido por defecto
        tc: false,
        licencia: false,
        carga: false,
        contenedor: false,
        bus: false,
        sancion: false,
        documentos: false, // Documentos consignados
    });

    // State para date pickers
    const [activeDatePicker, setActiveDatePicker] = useState<string | null>(null);
    const [datePickerValue, setDatePickerValue] = useState<Date>(new Date());
    const [datePickerOnChange, setDatePickerOnChange] = useState<((date: Date) => void) | null>(null);

    // Watch para mostrar secciones condicionales
    const cargado = useWatch({ control, name: `vehiculos.${index}.cargado` });
    const tieneContenedor = useWatch({ control, name: `vehiculos.${index}.tiene_contenedor` });
    const esBus = useWatch({ control, name: `vehiculos.${index}.es_bus` });
    const tieneSancion = useWatch({ control, name: `vehiculos.${index}.tiene_sancion` });

    const toggleSection = (section: string) => {
        setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
    };

    // Handler para el DateTimePicker nativo
    const handleDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
        if (Platform.OS === 'android') {
            setActiveDatePicker(null);
        }

        if (event.type === 'set' && selectedDate && datePickerOnChange) {
            datePickerOnChange(selectedDate);
            if (Platform.OS === 'ios') {
                setActiveDatePicker(null);
            }
        } else if (event.type === 'dismissed') {
            setActiveDatePicker(null);
        }
    };

    // Helper para renderizar date picker (usa el nativo del sistema)
    const renderDateField = (fieldName: string, label: string) => (
        <Controller
            control={control}
            name={`vehiculos.${index}.${fieldName}`}
            render={({ field: { onChange, value } }) => (
                <View style={styles.dateContainer}>
                    <Text style={styles.label}>{label}</Text>
                    <Button
                        mode="outlined"
                        onPress={() => {
                            setDatePickerValue(value ? new Date(value) : new Date());
                            setDatePickerOnChange(() => onChange);
                            setActiveDatePicker(fieldName);
                        }}
                        icon="calendar"
                        style={styles.dateButton}
                    >
                        {value ? new Date(value).toLocaleDateString('es-GT') : 'Seleccionar Fecha'}
                    </Button>

                    {/* DateTimePicker nativo - solo se muestra cuando este campo está activo */}
                    {activeDatePicker === fieldName && (
                        <DateTimePicker
                            value={datePickerValue}
                            mode="date"
                            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                            onChange={handleDateChange}
                        />
                    )}
                </View>
            )}
        />
    );

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Vehículo {index + 1}</Text>
                <Button onPress={onRemove} textColor="red" mode="text">Eliminar</Button>
            </View>

            {/* ============================================ */}
            {/* SECCIÓN 1: PRELIMINARES */}
            {/* ============================================ */}
            <List.Accordion
                title="Preliminares"
                expanded={expandedSections.preliminares}
                onPress={() => toggleSection('preliminares')}
                style={styles.accordion}
                titleStyle={styles.accordionTitle}
            >
                <View style={styles.section}>
                    {/* Tipo Vehículo */}
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

                    {/* Color y Marca */}
                    <View style={styles.row}>
                        <Controller
                            control={control}
                            name={`vehiculos.${index}.color`}
                            render={({ field: { onChange, value } }) => (
                                <TextInput
                                    label="Color"
                                    value={value || ''}
                                    onChangeText={onChange}
                                    mode="outlined"
                                    style={[styles.input, styles.half]}
                                />
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

                    {/* Placa (usando PlacaInput con validación) */}
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

                    {/* Estado del Piloto */}
                    <Text style={styles.label}>Estado del Piloto *</Text>
                    <Controller
                        control={control}
                        name={`vehiculos.${index}.estado_piloto`}
                        defaultValue="ILESO"
                        render={({ field: { onChange, value } }) => (
                            <RadioButton.Group onValueChange={onChange} value={value || 'ILESO'}>
                                <View style={styles.radioContainer}>
                                    <RadioButton.Item label="Ileso" value="ILESO" mode="android" />
                                    <RadioButton.Item label="Herido" value="HERIDO" mode="android" />
                                    <RadioButton.Item label="Fallecido" value="FALLECIDO" mode="android" />
                                    <RadioButton.Item label="Fugado" value="FUGADO" mode="android" />
                                </View>
                            </RadioButton.Group>
                        )}
                    />

                    {/* Personas Asistidas */}
                    <Controller
                        control={control}
                        name={`vehiculos.${index}.personas_asistidas`}
                        render={({ field: { onChange, value } }) => (
                            <TextInput
                                label="Personas Asistidas"
                                value={value?.toString() || '0'}
                                onChangeText={(text) => onChange(parseInt(text) || 0)}
                                keyboardType="numeric"
                                mode="outlined"
                                style={styles.input}
                            />
                        )}
                    />
                </View>
            </List.Accordion>

            {/* ============================================ */}
            {/* SECCIÓN 2: TARJETA CIRCULACIÓN */}
            {/* ============================================ */}
            <List.Accordion
                title="Tarjeta Circulación"
                expanded={expandedSections.tc}
                onPress={() => toggleSection('tc')}
                style={styles.accordion}
                titleStyle={styles.accordionTitle}
            >
                <View style={styles.section}>
                    <Controller
                        control={control}
                        name={`vehiculos.${index}.tarjeta_circulacion`}
                        render={({ field: { onChange, value } }) => (
                            <TextInput
                                label="No. Tarjeta Circulación"
                                value={value || ''}
                                onChangeText={onChange}
                                keyboardType="numeric"
                                mode="outlined"
                                style={styles.input}
                            />
                        )}
                    />

                    <Controller
                        control={control}
                        name={`vehiculos.${index}.nit`}
                        render={({ field: { onChange, value } }) => (
                            <TextInput
                                label="NIT Propietario"
                                value={value || ''}
                                onChangeText={onChange}
                                keyboardType="numeric"
                                mode="outlined"
                                style={styles.input}
                            />
                        )}
                    />

                    <Controller
                        control={control}
                        name={`vehiculos.${index}.nombre_propietario`}
                        render={({ field: { onChange, value } }) => (
                            <TextInput
                                label="Nombre Propietario"
                                value={value || ''}
                                onChangeText={onChange}
                                mode="outlined"
                                style={styles.input}
                            />
                        )}
                    />

                    <Controller
                        control={control}
                        name={`vehiculos.${index}.direccion_propietario`}
                        render={({ field: { onChange, value } }) => (
                            <TextInput
                                label="Dirección Propietario"
                                value={value || ''}
                                onChangeText={onChange}
                                mode="outlined"
                                multiline
                                numberOfLines={2}
                                style={styles.input}
                            />
                        )}
                    />

                    <Controller
                        control={control}
                        name={`vehiculos.${index}.modelo`}
                        render={({ field: { onChange, value } }) => (
                            <TextInput
                                label="Modelo (Año)"
                                value={value || ''}
                                onChangeText={onChange}
                                keyboardType="numeric"
                                mode="outlined"
                                placeholder="Ej: 2020"
                                style={styles.input}
                            />
                        )}
                    />
                </View>
            </List.Accordion>

            {/* ============================================ */}
            {/* SECCIÓN 3: LICENCIA */}
            {/* ============================================ */}
            <List.Accordion
                title="Licencia de Conducir"
                expanded={expandedSections.licencia}
                onPress={() => toggleSection('licencia')}
                style={styles.accordion}
                titleStyle={styles.accordionTitle}
            >
                <View style={styles.section}>
                    <Controller
                        control={control}
                        name={`vehiculos.${index}.nombre_piloto`}
                        render={({ field: { onChange, value } }) => (
                            <TextInput
                                label="Nombre Completo del Piloto"
                                value={value || ''}
                                onChangeText={onChange}
                                mode="outlined"
                                style={styles.input}
                            />
                        )}
                    />

                    <Text style={styles.label}>Tipo de Licencia</Text>
                    <Controller
                        control={control}
                        name={`vehiculos.${index}.licencia_tipo`}
                        render={({ field: { onChange, value } }) => (
                            <SegmentedButtons
                                value={value || ''}
                                onValueChange={onChange}
                                buttons={[
                                    { value: 'A', label: 'A' },
                                    { value: 'B', label: 'B' },
                                    { value: 'C', label: 'C' },
                                    { value: 'M', label: 'M' },
                                    { value: 'E', label: 'E' },
                                ]}
                                style={styles.segmentedButtons}
                            />
                        )}
                    />
                    <HelperText type="info">
                        A: Motos | B: Livianos | C: Pesados | M: Maquinaria | E: Especial
                    </HelperText>

                    <Controller
                        control={control}
                        name={`vehiculos.${index}.licencia_numero`}
                        render={({ field: { onChange, value } }) => (
                            <TextInput
                                label="No. Licencia"
                                value={value || ''}
                                onChangeText={onChange}
                                keyboardType="numeric"
                                mode="outlined"
                                style={styles.input}
                            />
                        )}
                    />

                    {renderDateField('licencia_vencimiento', 'Fecha Vencimiento Licencia')}

                    <Controller
                        control={control}
                        name={`vehiculos.${index}.licencia_antiguedad`}
                        render={({ field: { onChange, value } }) => (
                            <TextInput
                                label="Antigüedad Licencia (años)"
                                value={value?.toString() || ''}
                                onChangeText={(text) => onChange(parseInt(text) || 0)}
                                keyboardType="numeric"
                                mode="outlined"
                                style={styles.input}
                            />
                        )}
                    />

                    {renderDateField('fecha_nacimiento_piloto', 'Fecha de Nacimiento')}

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

                    {/* Sexo del Piloto */}
                    <Controller
                        control={control}
                        name={`vehiculos.${index}.sexo_piloto`}
                        render={({ field: { onChange, value } }) => (
                            <View style={styles.input}>
                                <RadioButton.Group onValueChange={onChange} value={value || ''}>
                                    <Text style={{ fontWeight: '500', marginBottom: 4 }}>Sexo del Piloto</Text>
                                    <View style={{ flexDirection: 'row', gap: 16 }}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                            <RadioButton value="M" />
                                            <Text>Masculino</Text>
                                        </View>
                                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                            <RadioButton value="F" />
                                            <Text>Femenino</Text>
                                        </View>
                                    </View>
                                </RadioButton.Group>
                            </View>
                        )}
                    />
                </View>
            </List.Accordion>

            {/* ============================================ */}
            {/* SECCIÓN 4: CARGA (solo si cargado = true) */}
            {/* ============================================ */}
            <View style={styles.switchRow}>
                <Text>¿Vehículo Cargado?</Text>
                <Controller
                    control={control}
                    name={`vehiculos.${index}.cargado`}
                    render={({ field: { onChange, value } }) => (
                        <Switch value={value || false} onValueChange={onChange} />
                    )}
                />
            </View>

            {cargado && (
                <List.Accordion
                    title="Datos de Carga"
                    expanded={expandedSections.carga}
                    onPress={() => toggleSection('carga')}
                    style={styles.accordion}
                    titleStyle={styles.accordionTitle}
                >
                    <View style={styles.section}>
                        <Controller
                            control={control}
                            name={`vehiculos.${index}.carga_tipo`}
                            render={({ field: { onChange, value } }) => (
                                <TextInput
                                    label="Tipo de Carga"
                                    value={value || ''}
                                    onChangeText={onChange}
                                    mode="outlined"
                                    placeholder="Ej: Granos, Materiales, Mercadería"
                                    style={styles.input}
                                />
                            )}
                        />

                        <Controller
                            control={control}
                            name={`vehiculos.${index}.carga_descripcion`}
                            render={({ field: { onChange, value } }) => (
                                <TextInput
                                    label="Descripción de Carga"
                                    value={value || ''}
                                    onChangeText={onChange}
                                    mode="outlined"
                                    multiline
                                    numberOfLines={3}
                                    style={styles.input}
                                />
                            )}
                        />
                    </View>
                </List.Accordion>
            )}

            {/* ============================================ */}
            {/* SECCIÓN 5: CONTENEDOR (solo si tiene_contenedor = true) */}
            {/* ============================================ */}
            <View style={styles.switchRow}>
                <Text>¿Tiene Contenedor/Remolque?</Text>
                <Controller
                    control={control}
                    name={`vehiculos.${index}.tiene_contenedor`}
                    render={({ field: { onChange, value } }) => (
                        <Switch value={value || false} onValueChange={onChange} />
                    )}
                />
            </View>

            {tieneContenedor && (
                <List.Accordion
                    title="Datos de Contenedor/Remolque"
                    expanded={expandedSections.contenedor}
                    onPress={() => toggleSection('contenedor')}
                    style={styles.accordion}
                    titleStyle={styles.accordionTitle}
                >
                    <View style={styles.section}>
                        <Controller
                            control={control}
                            name={`vehiculos.${index}.contenedor_numero`}
                            render={({ field: { onChange, value } }) => (
                                <TextInput
                                    label="No. Contenedor/Remolque"
                                    value={value || ''}
                                    onChangeText={onChange}
                                    mode="outlined"
                                    style={styles.input}
                                />
                            )}
                        />

                        <Controller
                            control={control}
                            name={`vehiculos.${index}.contenedor_empresa`}
                            render={({ field: { onChange, value } }) => (
                                <TextInput
                                    label="Empresa Contenedor"
                                    value={value || ''}
                                    onChangeText={onChange}
                                    mode="outlined"
                                    placeholder="Ej: MAERSK, EVERGREEN"
                                    style={styles.input}
                                />
                            )}
                        />
                    </View>
                </List.Accordion>
            )}

            {/* ============================================ */}
            {/* SECCIÓN 6: BUS EXTRAURBANO (solo si es_bus = true) */}
            {/* ============================================ */}
            <View style={styles.switchRow}>
                <Text>¿Es Bus Extraurbano?</Text>
                <Controller
                    control={control}
                    name={`vehiculos.${index}.es_bus`}
                    render={({ field: { onChange, value } }) => (
                        <Switch value={value || false} onValueChange={onChange} />
                    )}
                />
            </View>

            {esBus && (
                <List.Accordion
                    title="Datos de Bus Extraurbano"
                    expanded={expandedSections.bus}
                    onPress={() => toggleSection('bus')}
                    style={styles.accordion}
                    titleStyle={styles.accordionTitle}
                >
                    <View style={styles.section}>
                        <Controller
                            control={control}
                            name={`vehiculos.${index}.bus_empresa`}
                            render={({ field: { onChange, value } }) => (
                                <TextInput
                                    label="Empresa de Transporte"
                                    value={value || ''}
                                    onChangeText={onChange}
                                    mode="outlined"
                                    style={styles.input}
                                />
                            )}
                        />

                        <Controller
                            control={control}
                            name={`vehiculos.${index}.bus_ruta`}
                            render={({ field: { onChange, value } }) => (
                                <TextInput
                                    label="Ruta del Bus"
                                    value={value || ''}
                                    onChangeText={onChange}
                                    mode="outlined"
                                    placeholder="Ej: Guatemala - Quetzaltenango"
                                    style={styles.input}
                                />
                            )}
                        />

                        <Controller
                            control={control}
                            name={`vehiculos.${index}.bus_pasajeros`}
                            render={({ field: { onChange, value } }) => (
                                <TextInput
                                    label="Cantidad de Pasajeros"
                                    value={value?.toString() || ''}
                                    onChangeText={(text) => onChange(parseInt(text) || 0)}
                                    keyboardType="numeric"
                                    mode="outlined"
                                    style={styles.input}
                                />
                            )}
                        />
                    </View>
                </List.Accordion>
            )}

            {/* ============================================ */}
            {/* SECCIÓN 7: SANCIÓN (solo si tiene_sancion = true) */}
            {/* ============================================ */}
            <View style={styles.switchRow}>
                <Text>¿Se Aplicó Sanción?</Text>
                <Controller
                    control={control}
                    name={`vehiculos.${index}.tiene_sancion`}
                    render={({ field: { onChange, value } }) => (
                        <Switch value={value || false} onValueChange={onChange} />
                    )}
                />
            </View>

            {tieneSancion && (
                <List.Accordion
                    title="Datos de Sanción"
                    expanded={expandedSections.sancion}
                    onPress={() => toggleSection('sancion')}
                    style={styles.accordion}
                    titleStyle={styles.accordionTitle}
                >
                    <View style={styles.section}>
                        <Controller
                            control={control}
                            name={`vehiculos.${index}.sancion_articulo`}
                            render={({ field: { onChange, value } }) => (
                                <TextInput
                                    label="Artículo"
                                    value={value || ''}
                                    onChangeText={onChange}
                                    mode="outlined"
                                    placeholder="Ej: Art. 145, Art. 146"
                                    style={styles.input}
                                />
                            )}
                        />

                        <Controller
                            control={control}
                            name={`vehiculos.${index}.sancion_descripcion`}
                            render={({ field: { onChange, value } }) => (
                                <TextInput
                                    label="Descripción de Sanción"
                                    value={value || ''}
                                    onChangeText={onChange}
                                    mode="outlined"
                                    multiline
                                    numberOfLines={3}
                                    placeholder="Ej: Conducir sin licencia, Exceso de velocidad"
                                    style={styles.input}
                                />
                            )}
                        />

                        <Controller
                            control={control}
                            name={`vehiculos.${index}.sancion_monto`}
                            render={({ field: { onChange, value } }) => (
                                <TextInput
                                    label="Monto (Q)"
                                    value={value?.toString() || ''}
                                    onChangeText={(text) => onChange(parseFloat(text) || 0)}
                                    keyboardType="decimal-pad"
                                    mode="outlined"
                                    style={styles.input}
                                />
                            )}
                        />
                    </View>
                </List.Accordion>
            )}

            {/* ============================================ */}
            {/* SECCIÓN 8: DOCUMENTOS CONSIGNADOS */}
            {/* ============================================ */}
            <List.Accordion
                title="Documentos Consignados"
                expanded={expandedSections.documentos}
                onPress={() => toggleSection('documentos')}
                style={styles.accordion}
                titleStyle={styles.accordionTitle}
            >
                <View style={styles.section}>
                    <Text style={styles.sectionInfo}>
                        Marque los documentos que fueron consignados a la autoridad
                    </Text>

                    {/* Licencia de conducir */}
                    <View style={styles.switchRow}>
                        <Text>Licencia de conducir</Text>
                        <Controller
                            control={control}
                            name={`vehiculos.${index}.doc_consignado_licencia`}
                            render={({ field: { onChange, value } }) => (
                                <Switch value={value || false} onValueChange={onChange} />
                            )}
                        />
                    </View>

                    {/* Tarjeta de circulación */}
                    <View style={styles.switchRow}>
                        <Text>Tarjeta de circulación</Text>
                        <Controller
                            control={control}
                            name={`vehiculos.${index}.doc_consignado_tarjeta_circulacion`}
                            render={({ field: { onChange, value } }) => (
                                <Switch value={value || false} onValueChange={onChange} />
                            )}
                        />
                    </View>

                    {/* Tarjeta de propiedad */}
                    <View style={styles.switchRow}>
                        <Text>Tarjeta de propiedad</Text>
                        <Controller
                            control={control}
                            name={`vehiculos.${index}.doc_consignado_tarjeta`}
                            render={({ field: { onChange, value } }) => (
                                <Switch value={value || false} onValueChange={onChange} />
                            )}
                        />
                    </View>

                    {/* Licencia de transporte */}
                    <View style={styles.switchRow}>
                        <Text>Licencia de transporte</Text>
                        <Controller
                            control={control}
                            name={`vehiculos.${index}.doc_consignado_licencia_transporte`}
                            render={({ field: { onChange, value } }) => (
                                <Switch value={value || false} onValueChange={onChange} />
                            )}
                        />
                    </View>

                    {/* Tarjeta de operaciones */}
                    <View style={styles.switchRow}>
                        <Text>Tarjeta de operaciones</Text>
                        <Controller
                            control={control}
                            name={`vehiculos.${index}.doc_consignado_tarjeta_operaciones`}
                            render={({ field: { onChange, value } }) => (
                                <Switch value={value || false} onValueChange={onChange} />
                            )}
                        />
                    </View>

                    {/* Póliza de seguro */}
                    <View style={styles.switchRow}>
                        <Text>Póliza de seguro</Text>
                        <Controller
                            control={control}
                            name={`vehiculos.${index}.doc_consignado_poliza`}
                            render={({ field: { onChange, value } }) => (
                                <Switch value={value || false} onValueChange={onChange} />
                            )}
                        />
                    </View>

                    {/* Consignado por (autoridad) */}
                    <Text style={[styles.label, { marginTop: 10 }]}>Consignado por (autoridad)</Text>
                    <Controller
                        control={control}
                        name={`vehiculos.${index}.doc_consignado_por`}
                        render={({ field: { onChange, value } }) => (
                            <SegmentedButtons
                                value={value || ''}
                                onValueChange={onChange}
                                buttons={[
                                    { value: 'PNC', label: 'PNC' },
                                    { value: 'PMT', label: 'PMT' },
                                    { value: 'MP', label: 'MP' },
                                ]}
                                style={styles.segmentedButtons}
                            />
                        )}
                    />
                </View>
            </List.Accordion>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        padding: 10,
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        marginBottom: 15,
        backgroundColor: '#fff',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
        paddingBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    accordion: {
        backgroundColor: '#f5f5f5',
        marginBottom: 8,
        borderRadius: 4,
    },
    accordionTitle: {
        fontSize: 15,
        fontWeight: '600',
    },
    section: {
        padding: 12,
        backgroundColor: '#fff',
    },
    input: {
        marginBottom: 10,
        backgroundColor: '#fff',
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 10,
    },
    half: {
        width: '48%',
    },
    label: {
        fontSize: 14,
        color: '#666',
        marginBottom: 5,
        marginTop: 5,
    },
    radioContainer: {
        marginBottom: 10,
    },
    switchRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 10,
        backgroundColor: '#f9f9f9',
        borderRadius: 4,
        marginBottom: 8,
    },
    dateContainer: {
        marginBottom: 10,
    },
    dateButton: {
        marginTop: 5,
    },
    segmentedButtons: {
        marginBottom: 5,
    },
    sectionInfo: {
        fontSize: 13,
        color: '#666',
        marginBottom: 12,
        fontStyle: 'italic',
    },
});
