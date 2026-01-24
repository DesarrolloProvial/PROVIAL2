# 🔄 MIGRACIÓN 107: Eliminar Duplicación usuario ↔ brigada

## 📋 Resumen

**Fecha:** 2026-01-22  
**Tipo:** Limpieza de duplicación  
**Impacto:** Medio - Solo restructura datos  
**Reversible:** Sí  
**Tiempo:** 1-2 horas

---

## 🎯 Objetivo

Eliminar campos duplicados entre `usuario` y `brigada`, estableciendo **un solo lugar** para cada dato.

---

## 📊 Decisiones de Campos

| Campo | Mantener en | Eliminar de | Razón |
|-------|-------------|-------------|-------|
| `sede_id` | ✅ `usuario` | ❌ `brigada` | Es dato corporativo |
| `email` | ✅ `usuario` | ❌ `brigada` | Es dato de cuenta |
| `telefono` | ✅ `brigada` | ❌ `usuario` | Es dato operativo |
| `nombre` | ✅ `usuario` | ❌ `brigada` | Ya está nombre_completo |

---

## 🏗️ Estructura Final

### **`usuario` - Autenticación y Corporativo**
- username, password, email ✅
- nombre_completo ✅
- sede_id ✅
- grupo, rol, chapa
- **SIN** telefono

### **`brigada` - Datos Operativos y Personales**
- código único
- telefono ✅
- licencia, contacto_emergencia
- **SIN** sede_id, email, nombre

### **`v_brigada_completa` - Vista Helper**
- TODO junto para queries fáciles

---

## ⏱️ Ventajas vs Fusión Total

| | Eliminar Duplicación | Fusión Total |
|-|----------------------|--------------|
| Tiempo | ✅ 1-2 horas | 6-8 horas |
| Riesgo | ✅ Bajo | Alto |
| Reversible | ✅ Fácil | Complejo |
| Cambios código | ✅ Mínimos | Muchos |

---

## 📝 Script SQL Completo

Ver sección anterior del documento para el script completo

---

## ✅ Checklist

- [ ] Backup DB
- [ ] Ejecutar migración
- [ ] Verificar vista
- [ ] Actualizar queries backend
- [ ] Testing
- [ ] Producción

---

**¿Procedo con esta opción simplificada?** 🚀
Solo 1-2 horas de trabajo vs 6-8 de la fusión.
