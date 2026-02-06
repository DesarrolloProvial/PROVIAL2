/**
 * FieldRenderer Component
 * 
 * Renderizador de campos basado en configuración.
 * Toma un FieldConfig y renderiza el componente apropiado.
 * 
 * Fecha: 2026-01-22
 * FASE 1 - DÍA 2
 */

import React from 'react';
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

export function FieldRenderer({ field, control, formData, disabled }: FieldRendererProps) {
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

    return (
        <Controller
            control={control}
            name={field.name}
            rules={rules}
            render={({ field: { onChange, value }, fieldState: { error } }) => {
                const commonProps = {
                    label: field.label,
                    placeholder: field.placeholder,
                    value,
                    onChange,
                    error: error?.message,
                    helperText: field.helperText,
                    disabled: isDisabled,
                    required: isRequired,
                };

                // Renderizar según tipo
                switch (field.type) {
                    case 'text':
                        return <TextField {...commonProps} />;

                    case 'textarea':
                        return <TextField {...commonProps} multiline />;

                    case 'number':
                        return (
                            <NumberField
                                {...commonProps}
                                min={field.min}
                                max={field.max}
                                step={field.step}
                                value={value ?? null}
                            />
                        );

                    case 'select':
                        return (
                            <SelectField
                                {...commonProps}
                                options={field.options || []}
                                formData={formData}
                            />
                        );

                    case 'multi-select':
                        return (
                            <MultiSelectField
                                {...commonProps}
                                options={field.options || []}
                                value={value ?? []}
                            />
                        );

                    case 'date':
                    case 'datetime':
                    case 'time':
                        return (
                            <DateField
                                {...commonProps}
                                mode={field.type === 'datetime' ? 'datetime' : (field.type === 'time' ? 'time' : 'date')}
                                minDate={field.min ? new Date(field.min) : undefined}
                                maxDate={field.max ? new Date(field.max) : undefined}
                                value={value ?? null}
                            />
                        );

                    case 'gps':
                        return (
                            <GPSField
                                {...commonProps}
                                autoCapture={field.autoCapture}
                                value={value ?? null}
                            />
                        );

                    case 'checkbox':
                        return (
                            <CheckboxField
                                {...commonProps}
                                value={!!value} // Ensure boolean
                            />
                        );

                    case 'custom':
                        // Resolver componente (puede ser string o componente)
                        const CustomComponent = resolveComponent(field.component);
                        if (!CustomComponent) {
                            console.warn(`[FieldRenderer] Componente custom no encontrado: ${field.component}`);
                            return null;
                        }
                        return (
                            <CustomComponent
                                {...commonProps}
                                control={control}  // Pasar control para componentes que usan react-hook-form
                                name={field.name}  // Pasar name para componentes que usan useFieldArray
                                {...field.componentProps}
                            />
                        );

                    case 'switch':
                        return (
                            <SwitchField
                                {...commonProps}
                                value={!!value}
                            />
                        );

                    case 'radio':
                        return (
                            <RadioField
                                {...commonProps}
                                options={field.options || []}
                            />
                        );

                    default:
                        return <TextField {...commonProps} />;
                }
            }}
        />
    );
}
