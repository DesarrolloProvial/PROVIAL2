/**
 * FormBuilder Component
 * 
 * Componente principal del sistema de construcción de formularios.
 * Toma una configuración (FormConfig) y renderiza un formulario completo
 * con tabs, secciones, validación, y auto-guardado.
 * 
 * Fecha: 2026-01-22
 * FASE 1 - DÍA 2
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { useForm } from 'react-hook-form';
import { SegmentedButtons, Button } from 'react-native-paper';
import { useTheme } from '../theme';
import { FormBuilderProps, SectionConfig } from './types';
import { FieldRenderer } from './FieldRenderer';
import { resolveComponent } from './componentRegistry';

export function FormBuilder({
    config,
    onSubmit,
    initialValues,
    onChange,
    loading,
    disabled,
    protectedFields, // NEW
    onProtectedFieldEdit, // NEW
}: FormBuilderProps) {
    const theme = useTheme();
    const [activeTab, setActiveTab] = useState(config.tabs?.[0]?.id || 'default');
    const [submitting, setSubmitting] = useState(false);

    // Track si ya se hizo el reset inicial para evitar loops
    const hasResetRef = useRef(false);
    const prevInitialValuesRef = useRef<string>('');

    // Crear key estable para los initialValues
    const initialValuesKey = useMemo(() => {
        return JSON.stringify(initialValues || {});
    }, [initialValues]);

    const { control, handleSubmit, watch, reset, formState: { errors, isDirty } } = useForm({
        defaultValues: initialValues || config.defaultValues || {},
        mode: config.validateOnChange ? 'onChange' : 'onBlur',
    });

    // Resetear formulario si cambian los valores iniciales (ej: carga asíncrona)
    useEffect(() => {
        // Solo resetear si los valores realmente cambiaron
        if (initialValuesKey !== prevInitialValuesRef.current && initialValuesKey !== '{}') {
            console.log('[FormBuilder] Actualizando valores iniciales:', initialValuesKey.substring(0, 200));
            prevInitialValuesRef.current = initialValuesKey;
            reset(initialValues);
            hasResetRef.current = true;
        }
    }, [initialValuesKey, reset, initialValues]);

    const formData = watch();

    // Track previous formData para evitar llamadas innecesarias a onChange
    const prevFormDataRef = useRef<string>('');

    // Emit onChange cuando cambia el form
    useEffect(() => {
        if (onChange && isDirty) {
            const currentFormDataStr = JSON.stringify(formData);

            // Solo llamar onChange si los datos realmente cambiaron
            if (currentFormDataStr !== prevFormDataRef.current) {
                prevFormDataRef.current = currentFormDataStr;
                onChange(formData);
            }
        }
    }, [formData, isDirty, onChange]);

    // Handle submit
    const handleFormSubmit = async (data: any) => {
        try {
            setSubmitting(true);
            await onSubmit(data);
        } finally {
            setSubmitting(false);
        }
    };

    // Obtener secciones del tab activo
    const sectionsForTab = config.sections[activeTab] || [];

    // Render Section
    const renderSection = (section: SectionConfig) => {
        // Evaluar visibilidad de la sección
        if (section.visibleIf && !section.visibleIf(formData)) {
            return null;
        }

        return (
            <View key={section.id} style={styles.section}>
                {/* Section Header */}
                {section.title && (
                    <Text style={[
                        styles.sectionTitle,
                        theme.typography.h3,
                        { color: theme.colors.text.primary }
                    ]}>
                        {section.title}
                    </Text>
                )}

                {section.description && (
                    <Text style={[
                        styles.sectionDescription,
                        theme.typography.bodySmall,
                        { color: theme.colors.text.secondary }
                    ]}>
                        {section.description}
                    </Text>
                )}

                {/* Section Content */}
                {section.component ? (
                    // Custom component - resolver si es string
                    (() => {
                        const SectionComponent = resolveComponent(section.component);
                        return SectionComponent ? (
                            <SectionComponent {...section.componentProps} />
                        ) : null;
                    })()
                ) : (
                    // Fields
                    <View style={styles.fieldsContainer}>
                        {section.fields?.map(field => (
                            <FieldRenderer
                                key={field.name}
                                field={field}
                                control={control}
                                formData={formData}
                                disabled={disabled}
                                protectedFields={protectedFields} // NEW
                                onProtectedFieldEdit={onProtectedFieldEdit} // NEW
                            />
                        ))}
                    </View>
                )}
            </View>
        );
    };

    // Loading state
    if (loading) {
        return (
            <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background }]}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
                <Text style={[
                    styles.loadingText,
                    theme.typography.body,
                    { color: theme.colors.text.secondary, marginTop: theme.spacing.md }
                ]}>
                    Cargando formulario...
                </Text>
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
            {/* Header (si existe) */}
            {config.header && <config.header />}

            {/* Tabs */}
            {config.tabs && config.tabs.length > 1 && (
                <View style={[styles.tabsContainer, { backgroundColor: theme.colors.surface }]}>
                    <SegmentedButtons
                        value={activeTab}
                        onValueChange={setActiveTab}
                        buttons={config.tabs.map(tab => ({
                            value: tab.id,
                            label: tab.label,
                            icon: tab.icon,
                            disabled: tab.disabled,
                        }))}
                    />
                </View>
            )}

            {/* Content */}
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Sections */}
                {sectionsForTab.map(section => renderSection(section))}

                {/* Submit Button */}
                <View style={styles.submitContainer}>
                    <Button
                        mode="contained"
                        onPress={handleSubmit(handleFormSubmit)}
                        loading={submitting}
                        disabled={disabled || submitting}
                        icon={config.submitButton?.icon}
                        style={[
                            styles.submitButton,
                            { backgroundColor: config.submitButton?.color || theme.colors.primary }
                        ]}
                        labelStyle={{ fontSize: 16, fontWeight: '600' }}
                    >
                        {submitting
                            ? (config.submitButton?.loadingText || 'Guardando...')
                            : (config.submitButton?.label || 'Guardar')
                        }
                    </Button>
                </View>

                {/* Padding bottom for scroll */}
                <View style={{ height: 40 }} />
            </ScrollView>

            {/* Footer (si existe) */}
            {config.footer && <config.footer />}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 16,
    },
    tabsContainer: {
        padding: 16,
        paddingBottom: 8,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: 16,
    },
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        marginBottom: 8,
    },
    sectionDescription: {
        marginBottom: 16,
    },
    fieldsContainer: {
        // Fields tienen su propio margin-bottom
    },
    submitContainer: {
        marginTop: 32,
    },
    submitButton: {
        paddingVertical: 8,
    },
});
