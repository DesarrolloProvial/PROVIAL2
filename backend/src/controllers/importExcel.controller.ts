/**
 * Controlador de importación de datos Excel
 * POST /api/admin/import-excel
 */

import { Request, Response } from 'express';
import multer from 'multer';
import { importExcelData } from '../services/importExcel.service';

// Multer en memoria, solo archivos Excel
const storage = multer.memoryStorage();

export const uploadExcel = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (_req, file, cb) => {
    const validMimes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
    ];
    if (validMimes.includes(file.mimetype) || file.originalname.endsWith('.xlsx') || file.originalname.endsWith('.xls')) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos Excel (.xlsx, .xls)'));
    }
  },
});

export async function importarExcel(req: Request, res: Response) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No se envio archivo Excel' });
    }

    const dryRun = req.body.dryRun === 'true' || req.body.dryRun === true;
    const mesFilter = req.body.mesFilter || null;
    const origenDatos = req.body.origenDatos || 'EXCEL_2025';

    console.log(`📊 [IMPORT] Iniciando importacion Excel (dryRun=${dryRun}, mes=${mesFilter || 'TODOS'}, origen=${origenDatos})`);
    console.log(`📁 [IMPORT] Archivo: ${req.file.originalname} (${(req.file.size / 1024 / 1024).toFixed(2)} MB)`);

    const result = await importExcelData(req.file.buffer, {
      dryRun,
      mesFilter,
      origenDatos,
    });

    console.log(`✅ [IMPORT] Completado: ${result.inserted} insertados, ${result.skipped} duplicados, ${result.errors} errores`);

    return res.json({
      success: true,
      dryRun,
      result,
    });
  } catch (error: any) {
    console.error('❌ [IMPORT] Error:', error.message);
    return res.status(500).json({
      error: 'Error en importacion',
      detail: error.message,
    });
  }
}

export default { uploadExcel, importarExcel };
