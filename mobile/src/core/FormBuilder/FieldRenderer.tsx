/**
 * FieldRenderer Component
 * 
 * Renderizador de campos basado en configuración.
 * Toma un FieldConfig y renderiza el componente apropiado.
 * 
 * Fecha: 2026-01-22
 * FASE 1 - DÍA 2
 * UPDATED: 2026-02-08 - Added field protection with lock UI
 */

import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Controller } from 'react-hook-form';
import { FieldRendererProps } from './types';
import {
    TextField,
    SelectField,
    NumberField,
    DateField,
    GPSField,
    CheckboxField,
    SwitchField,
    RadioField,
    MultiSelectField
} from '../../components/fields';
import { resolveComponent } from './componentRegistry';

export function FieldRenderer({ field, control, formData, disabled, protectedFields, onProtectedFieldEdit }: FieldRendererProps) {
    // Local state to track if this specific field has been unlocked in this session
    const [isUnlocked, setIsUnlocked] = React.useState(false);

    // Evaluar visibilidad
    if (field.visibleIf && !field.visibleIf(formData)) {
        return null;
    }

    // Determinar si es requerido (estático o dinámico)
    const isRequired = field.required || (field.requiredIf && field.requiredIf(formData));

    // Determinar si está deshabilitado (prop o dinámico)
    const isDisabled = disabled || field.disabled || (field.disabledIf && field.disabledIf(formData));

    // Procesar reglas de validación
    const rules: any = {
        required: isRequired ? (field.errorMessage || `${field.label} es requerido`) : false,
        ...field.validation,
    };

    // Convertir patrón string a RegExp si es necesario
    if (field.validation?.pattern && typeof field.validation.pattern === 'string') {
        try {
            rules.pattern = {
                value: new RegExp(field.validation.pattern),
                message: field.errorMessage || 'Formato inválido'
            };
        } catch (e) {
            console.warn(`[FieldRenderer] Patrón inválido para ${field.name}:`, field.validation.pattern);
        }
    }

    // Helper to check if field has existing value
    const hasExistingValue = (value: any) => {
        if (value === null || value === undefined || value === '') return false;
        if (Array.isArray(value)) return value.length > 0;
        return true;
    };

    // Handle unlock request
    const handleUnlockRequest = async () => {
        if (!onProtectedFieldEdit) return;

        const confirmed = await onProtectedFieldEdit(field.name, field.label);
        if (confirmed) {
            setIsUnlocked(true);
        }
    };

    return (
        <Controller
            control={control}
            name={field.name}
            rules={rules}
            render={({ field: { onChange, value }, fieldState: { error } }) => {
                // Check if field is protected and has existing value
                const isProtected = protectedFields?.includes(field.name);
                const hasValue = hasExistingValue(value);
                const shouldBeDisabled = isProtected && hasValue && !isUnlocked;

                // Skip protection for custom components
                const effectivelyDisabled = field.type === 'custom' ? isDisabled : (isDisabled || shouldBeDisabled);

                const commonProps = {
                    label: field.label,
                    placeholder: field.placeholder,
                    value,
                    onChange, // Use original onChange directly
                    error: error?.message,
                    helperText: shouldBeDisabled
                        ? '🔒 Campo protegido - Toca para desbloquear'
                        : field.helperText,
                    disabled: effectivelyDisabled,
                    required: isRequired,
                };

                // Wrap field in touchable overlay if protected
                const renderField = (fieldComponent: React.ReactNode) => {
                    if (shouldBeDisabled && field.type !== 'custom') {
                        return (
                            <View style={{ position: 'relative' }}>
                                {fieldComponent}
                                <TouchableOpacity
                                    style={{
                                        position: 'absolute',
                                        top: 0,
                                        left: 0,
                                        right: 0,
                                        bottom: 0,
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                        backgroundColor: 'rgba(255,255,255,0.7)',
                                    }}
                                    onPress={handleUnlockRequest}
                                    activeOpacity={0.9}
                                >
                                    <View style={{
                                        backgroundColor: '#fff',
                                        padding: 12,
                                        borderRadius: 8,
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        gap: 8,
                                        shadowColor: '#000',
                                        shadowOffset: { width: 0, height: 2 },
                                        shadowOpacity: 0.1,
                                        shadowRadius: 4,
                                        elevation: 3,
                                    }}>
                                        <Text style={{ fontSize: 20 }}>🔒</Text>
                                        <Text style={{ fontSize: 14, color: '#333', fontWeight: '500' }}>
                                            Toca para editar
                                        </Text>
                                    </View>
                                </TouchableOpacity>
                            </View>
                        );
                    }
                    return fieldComponent;
                };

                // Renderizar según tipo
                switch (field.type) {
                    case 'text':
                        return renderField(<TextField {...commonProps} />);

                    case 'textarea':
                        return renderField(<TextField {...commonProps} multiline />);

                    case 'number':
                        return renderField(
                            <NumberField
                                {...commonProps}
                                min={field.min}
                                max={field.max}
                                step={field.step}
                                value={value ?? null}
                            />
                        );

                    case 'select':
                        return renderField(
                            <SelectField
                                {...commonProps}
                                options={field.options || []}
                                formData={formData}
                            />
                        );

                    case 'multi-select':
                        return renderField(
                            <MultiSelectField
                                {...commonProps}
                                options={field.options || []}
                                value={value ?? []}
                            />
                        );

                    case 'date':
                    case 'datetime':
                    case 'time':
                        return renderField(
                            <DateField
                                {...commonProps}
                                mode={field.type === 'datetime' ? 'datetime' : (field.type === 'time' ? 'time' : 'date')}
                                minDate={field.min ? new Date(field.min) : undefined}
                                maxDate={field.max ? new Date(field.max) : undefined}
                                value={value ?? null}
                            />
                        );

                    case 'gps':
                        return renderField(
                            <GPSField
                                {...commonProps}
                                autoCapture={field.autoCapture}
                                value={value ?? null}
                            />
                        );

                    case 'checkbox':
                        return renderField(
                            <CheckboxField
                                {...commonProps}
                                value={!!value}
                            />
                        );

                    case 'custom':
                        const CustomComponent = resolveComponent(field.component);
                        if (!CustomComponent) {
                            console.warn(`[FieldRenderer] Componente custom no encontrado: ${field.component}`);
                            return null;
                        }

                        return (
                            <CustomComponent
                                {...commonProps}
                                control={control}
                                name={field.name}
                                {...field.componentProps}
                            />
                        );

                    case 'switch':
                        return renderField(
                            <SwitchField
                                {...commonProps}
                                value={!!value}
                            />
                        );

                    case 'radio':
                        return renderField(
                            <RadioField
                                {...commonProps}
                                options={field.options || []}
                            />
                        );

                    default:
                        return renderField(<TextField {...commonProps} />);
                }
            }}
        />
    );
}
