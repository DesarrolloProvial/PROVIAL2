import { Router } from 'express';
import {
  getRutas,
  getRuta,
  getDepartamentos,
  getDepartamento,
  getDepartamentosPorRegion,
  createDepartamento,
  updateDepartamento,
  getMunicipios,
  getMunicipio,
  getMunicipiosPorDepartamento,
  createMunicipio,
  updateMunicipio,
  buscarMunicipios,
  getRegiones,
} from '../controllers/geografia.controller';
import { authenticate, authorize } from '../middlewares/auth';

const router = Router();

// ========================================
// CONSULTAS PÚBLICAS (AUTENTICADAS)
// ========================================

// Rutas
router.get('/rutas', authenticate, getRutas);
router.get('/rutas/:id', authenticate, getRuta);

// Departamentos
router.get('/departamentos', authenticate, getDepartamentos);
router.get('/departamentos/:id', authenticate, getDepartamento);
router.get('/departamentos/region/:region', authenticate, getDepartamentosPorRegion);

// Municipios
router.get('/municipios', authenticate, getMunicipios);
router.get('/municipios/:id', authenticate, getMunicipio);
router.get('/departamentos/:departamento_id/municipios', authenticate, getMunicipiosPorDepartamento);

// Búsqueda
router.get('/buscar/municipios', authenticate, buscarMunicipios);

// Regiones
router.get('/regiones', authenticate, getRegiones);

// ========================================
// GESTIÓN (SOLO ADMIN)
// ========================================

// Crear departamento
router.post('/departamentos', authenticate, authorize('ADMIN'), createDepartamento);

// Actualizar departamento
router.patch('/departamentos/:id', authenticate, authorize('ADMIN'), updateDepartamento);

// Crear municipio
router.post('/municipios', authenticate, authorize('ADMIN'), createMunicipio);

// Actualizar municipio
router.patch('/municipios/:id', authenticate, authorize('ADMIN'), updateMunicipio);

export default router;
