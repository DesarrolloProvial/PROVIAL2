/**
 * Rutas de importación de datos Excel
 */

import { Router } from 'express';
import { authenticate } from '../middlewares/auth';
import { authorizeAdminOrSuperAdmin } from '../middlewares/superAdmin';
import { uploadExcel, importarExcel } from '../controllers/importExcel.controller';

const router = Router();

// Solo SUPER_ADMIN y ADMIN pueden importar datos
router.post(
  '/import-excel',
  authenticate,
  authorizeAdminOrSuperAdmin(),
  uploadExcel.single('archivo'),
  importarExcel
);

export default router;
