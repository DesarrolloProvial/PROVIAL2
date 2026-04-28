import { Request, Response } from 'express';
import { ReportesService } from '../../services/common/reportes.service';
import { normalizeId } from '../../utils/db.utils';

// ============================================
// CONTROLADOR DE REPORTES
// ============================================

export const ReportesController = {
  /**
   * Obtener tipos de reportes disponibles
   * GET /api/reportes/tipos
   */
  async obtenerTipos(_req: Request, res: Response) {
    try {
      const tipos = [
        { codigo: 'INSPECCIONES_360', nombre: 'Inspecciones 360', formatos: ['pdf', 'excel'], descripcion: 'Reporte de inspecciones vehiculares' },
        { codigo: 'BRIGADAS', nombre: 'Estadísticas de Brigadas', formatos: ['pdf', 'excel'], descripcion: 'Rendimiento y actividad de brigadas' },
        { codigo: 'SITUACIONES', nombre: 'Situaciones', formatos: ['pdf', 'excel'], descripcion: 'Resumen de situaciones atendidas' },
        { codigo: 'UNIDADES', nombre: 'Estado de Unidades', formatos: ['pdf', 'excel'], descripcion: 'Estado y uso de vehículos' },
        { codigo: 'ACCIDENTOLOGIA', nombre: 'Accidentología', formatos: ['pdf', 'excel'], descripcion: 'Análisis de accidentes' },
      ];
      res.json({ tipos });
    } catch (error) {
      console.error('obtenerTipos:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  },

  /**
   * Generar reporte de inspecciones 360 (PDF)
   * GET /api/reportes/inspecciones-360/:unidadId/pdf
   */
  async inspecciones360PDF(req: Request, res: Response) {
    try {
      const unidadId = normalizeId(req.params.unidadId) ?? 0;
      const { fecha_inicio, fecha_fin } = req.query;

      // Validar fechas
      const fechaInicio = fecha_inicio
        ? new Date(fecha_inicio as string)
        : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 dias atras

      const fechaFin = fecha_fin
        ? new Date(fecha_fin as string)
        : new Date();

      const stream = await ReportesService.generarReporteInspecciones360PDF(
        unidadId,
        fechaInicio,
        fechaFin
      );

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename=inspecciones_360_${unidadId}_${fechaInicio.toISOString().split('T')[0]}.pdf`
      );

      stream.pipe(res);
    } catch (error) {
      console.error('inspecciones360PDF:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  },

  /**
   * Generar reporte de inspecciones 360 (Excel)
   * GET /api/reportes/inspecciones-360/:unidadId/excel
   */
  async inspecciones360Excel(req: Request, res: Response) {
    try {
      const unidadId = normalizeId(req.params.unidadId) ?? 0;
      const { fecha_inicio, fecha_fin } = req.query;

      const fechaInicio = fecha_inicio
        ? new Date(fecha_inicio as string)
        : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      const fechaFin = fecha_fin
        ? new Date(fecha_fin as string)
        : new Date();

      const workbook = await ReportesService.generarReporteInspecciones360Excel(
        unidadId,
        fechaInicio,
        fechaFin
      );

      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      res.setHeader(
        'Content-Disposition',
        `attachment; filename=inspecciones_360_${unidadId}_${fechaInicio.toISOString().split('T')[0]}.xlsx`
      );

      await workbook.xlsx.write(res);
      res.end();
    } catch (error) {
      console.error('inspecciones360Excel:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  },

  /**
   * Generar reporte de estadisticas de brigadas (PDF)
   * GET /api/reportes/brigadas/pdf
   */
  async brigadasPDF(req: Request, res: Response) {
    try {
      const { sede_id, fecha_inicio, fecha_fin } = req.query;

      const sedeId = normalizeId(sede_id as string);

      const fechaInicio = fecha_inicio
        ? new Date(fecha_inicio as string)
        : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      const fechaFin = fecha_fin
        ? new Date(fecha_fin as string)
        : new Date();

      const stream = await ReportesService.generarReporteBrigadasPDF(
        sedeId,
        fechaInicio,
        fechaFin
      );

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename=estadisticas_brigadas_${fechaInicio.toISOString().split('T')[0]}.pdf`
      );

      stream.pipe(res);
    } catch (error) {
      console.error('brigadasPDF:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  },

  /**
   * Generar reporte de estadisticas de brigadas (Excel)
   * GET /api/reportes/brigadas/excel
   */
  async brigadasExcel(req: Request, res: Response) {
    try {
      const { sede_id, fecha_inicio, fecha_fin } = req.query;

      const sedeId = normalizeId(sede_id as string);

      const fechaInicio = fecha_inicio
        ? new Date(fecha_inicio as string)
        : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      const fechaFin = fecha_fin
        ? new Date(fecha_fin as string)
        : new Date();

      const workbook = await ReportesService.generarReporteBrigadasExcel(
        sedeId,
        fechaInicio,
        fechaFin
      );

      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      res.setHeader(
        'Content-Disposition',
        `attachment; filename=estadisticas_brigadas_${fechaInicio.toISOString().split('T')[0]}.xlsx`
      );

      await workbook.xlsx.write(res);
      res.end();
    } catch (error) {
      console.error('brigadasExcel:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  },
};

export default ReportesController;
