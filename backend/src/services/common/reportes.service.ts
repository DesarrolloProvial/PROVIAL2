import PDFDocument from 'pdfkit';
import ExcelJS from 'exceljs';
import { PassThrough } from 'stream';
import { db } from '../config/database';

// ============================================
// COLORES Y ESTILOS
// ============================================

const COLORS = {
  primary: '#1e3a5f',
  secondary: '#3b82f6',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  gray: '#6b7280',
  lightGray: '#f3f4f6',
  white: '#ffffff',
  black: '#1f2937',
};

// ============================================
// SERVICIO DE REPORTES
// ============================================

export const ReportesService = {
  // ============================================
  // REPORTE DE INSPECCIONES 360
  // ============================================

  /**
   * Generar reporte PDF de inspecciones 360 de una unidad
   */
  async generarReporteInspecciones360PDF(
    unidadId: number,
    fechaInicio: Date,
    fechaFin: Date
  ): Promise<PassThrough> {
    // Obtener datos
    const unidad = await db.oneOrNone(`
      SELECT u.codigo, u.tipo_unidad, u.placa, u.marca, u.modelo, s.nombre AS sede_nombre
      FROM unidad u
      LEFT JOIN sede s ON s.id = u.sede_id
      WHERE u.id = $1
    `, [unidadId]);

    if (!unidad) throw new Error('Unidad no encontrada');

    const inspecciones = await db.query(`
      SELECT
        i.id,
        i.fecha_realizacion,
        i.fecha_aprobacion,
        i.estado,
        ui.nombre_completo AS inspector_nombre,
        uc.nombre_completo AS comandante_nombre,
        i.observaciones_inspector,
        i.observaciones_comandante,
        i.motivo_rechazo
      FROM inspeccion_360 i
      LEFT JOIN usuario ui ON ui.id = i.realizado_por
      LEFT JOIN usuario uc ON uc.id = i.aprobado_por
      WHERE i.unidad_id = $1
        AND i.fecha_realizacion BETWEEN $2 AND $3
      ORDER BY i.fecha_realizacion DESC
    `, [unidadId, fechaInicio, fechaFin]);

    // Generar PDF
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'LETTER',
          margins: { top: 50, bottom: 50, left: 50, right: 50 },
          info: {
            Title: `Reporte Inspecciones 360 - ${unidad.codigo}`,
            Author: 'PROVIAL',
          },
        });

        const stream = new PassThrough();
        doc.pipe(stream);

        // Encabezado
        doc.rect(0, 0, doc.page.width, 80).fill(COLORS.primary);
        doc.fontSize(20).fillColor(COLORS.white).text('PROVIAL', 50, 25);
        doc.fontSize(12).text('Reporte de Inspecciones 360', 50, 50);

        let y = 100;

        // Info de unidad
        doc.fontSize(14).fillColor(COLORS.primary).text('Informacion de la Unidad', 50, y);
        y += 25;
        doc.fontSize(10).fillColor(COLORS.black);
        doc.text(`Codigo: ${unidad.codigo}`, 50, y);
        doc.text(`Tipo: ${unidad.tipo_unidad}`, 200, y);
        doc.text(`Placa: ${unidad.placa || 'N/A'}`, 350, y);
        y += 15;
        doc.text(`Marca/Modelo: ${unidad.marca || ''} ${unidad.modelo || ''}`, 50, y);
        doc.text(`Sede: ${unidad.sede_nombre || 'N/A'}`, 250, y);
        y += 25;

        // Periodo
        doc.fontSize(10).fillColor(COLORS.gray);
        doc.text(`Periodo: ${fechaInicio.toLocaleDateString()} - ${fechaFin.toLocaleDateString()}`, 50, y);
        y += 30;

        // Resumen
        const total = inspecciones.rows.length;
        const aprobadas = inspecciones.rows.filter((i: any) => i.estado === 'APROBADA').length;
        const rechazadas = inspecciones.rows.filter((i: any) => i.estado === 'RECHAZADA').length;
        const pendientes = inspecciones.rows.filter((i: any) => i.estado === 'PENDIENTE').length;

        doc.fontSize(12).fillColor(COLORS.primary).text('Resumen', 50, y);
        y += 20;
        doc.fontSize(10).fillColor(COLORS.black);
        doc.text(`Total: ${total}`, 50, y);
        doc.fillColor(COLORS.success).text(`Aprobadas: ${aprobadas}`, 150, y);
        doc.fillColor(COLORS.danger).text(`Rechazadas: ${rechazadas}`, 280, y);
        doc.fillColor(COLORS.warning).text(`Pendientes: ${pendientes}`, 410, y);
        y += 30;

        // Tabla de inspecciones
        doc.fontSize(12).fillColor(COLORS.primary).text('Detalle de Inspecciones', 50, y);
        y += 20;

        // Headers de tabla
        doc.rect(50, y, doc.page.width - 100, 20).fill(COLORS.lightGray);
        doc.fontSize(9).fillColor(COLORS.black);
        doc.text('Fecha', 55, y + 5);
        doc.text('Inspector', 140, y + 5);
        doc.text('Comandante', 270, y + 5);
        doc.text('Estado', 400, y + 5);
        doc.text('Obs.', 480, y + 5);
        y += 25;

        // Filas
        for (const insp of inspecciones.rows) {
          if (y > doc.page.height - 80) {
            doc.addPage();
            y = 50;
          }

          const fecha = new Date(insp.fecha_realizacion).toLocaleDateString('es-GT');
          const estadoColor = insp.estado === 'APROBADA' ? COLORS.success :
            insp.estado === 'RECHAZADA' ? COLORS.danger : COLORS.warning;

          doc.fontSize(8).fillColor(COLORS.black);
          doc.text(fecha, 55, y);
          doc.text(insp.inspector_nombre?.substring(0, 20) || 'N/A', 140, y);
          doc.text(insp.comandante_nombre?.substring(0, 20) || '-', 270, y);
          doc.fillColor(estadoColor).text(insp.estado, 400, y);
          doc.fillColor(COLORS.black).text(insp.observaciones_inspector ? 'Si' : '-', 480, y);

          y += 15;
        }

        // Pie de pagina
        doc.fontSize(8).fillColor(COLORS.gray);
        doc.text(
          `Generado el ${new Date().toLocaleString('es-GT')} - PROVIAL`,
          50,
          doc.page.height - 30,
          { align: 'center', width: doc.page.width - 100 }
        );

        doc.end();
        resolve(stream);
      } catch (error) {
        reject(error);
      }
    });
  },

  /**
   * Generar reporte Excel de inspecciones 360
   */
  async generarReporteInspecciones360Excel(
    unidadId: number,
    fechaInicio: Date,
    fechaFin: Date
  ): Promise<ExcelJS.Workbook> {
    const unidad = await db.oneOrNone(`
      SELECT u.codigo, u.tipo_unidad, u.placa, s.nombre AS sede_nombre
      FROM unidad u
      LEFT JOIN sede s ON s.id = u.sede_id
      WHERE u.id = $1
    `, [unidadId]);

    if (!unidad) throw new Error('Unidad no encontrada');

    const inspecciones = await db.query(`
      SELECT
        i.id,
        i.fecha_realizacion,
        i.fecha_aprobacion,
        i.estado,
        ui.nombre_completo AS inspector_nombre,
        ui.chapa AS inspector_chapa,
        uc.nombre_completo AS comandante_nombre,
        uc.chapa AS comandante_chapa,
        i.observaciones_inspector,
        i.observaciones_comandante,
        i.motivo_rechazo
      FROM inspeccion_360 i
      LEFT JOIN usuario ui ON ui.id = i.realizado_por
      LEFT JOIN usuario uc ON uc.id = i.aprobado_por
      WHERE i.unidad_id = $1
        AND i.fecha_realizacion BETWEEN $2 AND $3
      ORDER BY i.fecha_realizacion DESC
    `, [unidadId, fechaInicio, fechaFin]);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'PROVIAL';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Inspecciones 360');

    // Titulo
    sheet.mergeCells('A1:H1');
    sheet.getCell('A1').value = `Inspecciones 360 - Unidad ${unidad.codigo}`;
    sheet.getCell('A1').font = { size: 16, bold: true };
    sheet.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1e3a5f' } };
    sheet.getCell('A1').font = { size: 16, bold: true, color: { argb: 'FFFFFF' } };

    // Info
    sheet.getCell('A2').value = `Tipo: ${unidad.tipo_unidad} | Placa: ${unidad.placa || 'N/A'} | Sede: ${unidad.sede_nombre}`;
    sheet.getCell('A3').value = `Periodo: ${fechaInicio.toLocaleDateString()} - ${fechaFin.toLocaleDateString()}`;

    // Headers
    const headers = ['ID', 'Fecha', 'Inspector', 'Chapa Insp.', 'Comandante', 'Chapa Cmd.', 'Estado', 'Observaciones'];
    sheet.addRow([]);
    const headerRow = sheet.addRow(headers);
    headerRow.eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '3b82f6' } };
      cell.font = { bold: true, color: { argb: 'FFFFFF' } };
      cell.alignment = { horizontal: 'center' };
    });

    // Datos
    for (const insp of inspecciones.rows) {
      sheet.addRow([
        insp.id,
        new Date(insp.fecha_realizacion).toLocaleDateString('es-GT'),
        insp.inspector_nombre || 'N/A',
        insp.inspector_chapa || '',
        insp.comandante_nombre || '-',
        insp.comandante_chapa || '',
        insp.estado,
        insp.observaciones_inspector || '',
      ]);
    }

    // Ajustar anchos
    sheet.columns.forEach((column, i) => {
      column.width = [8, 12, 25, 12, 25, 12, 12, 40][i];
    });

    return workbook;
  },

  // ============================================
  // REPORTE DE ESTADISTICAS DE BRIGADAS
  // ============================================

  /**
   * Generar reporte PDF de estadisticas de brigadas
   */
  async generarReporteBrigadasPDF(
    sedeId: number | null,
    fechaInicio: Date,
    fechaFin: Date
  ): Promise<PassThrough> {
    let sedeNombre = 'Todas las sedes';
    if (sedeId) {
      const sede = await db.oneOrNone('SELECT nombre FROM sede WHERE id = $1', [sedeId]);
      sedeNombre = sede?.nombre || 'Sede desconocida';
    }

    // Obtener estadisticas
    const brigadasData = await db.any(`
      SELECT
        u.id,
        u.nombre_completo,
        u.chapa,
        s.nombre AS sede_nombre,
        COUNT(DISTINCT tt.asignacion_id) AS total_turnos,
        COUNT(DISTINCT sit.id) AS total_situaciones,
        SUM(CASE WHEN sit.tipo_situacion = 'INCIDENTE' THEN 1 ELSE 0 END) AS incidentes,
        SUM(CASE WHEN sit.tipo_situacion = 'ASISTENCIA_VEHICULAR' THEN 1 ELSE 0 END) AS asistencias,
        SUM(CASE WHEN sit.tipo_situacion = 'EMERGENCIA' THEN 1 ELSE 0 END) AS emergencias
      FROM usuario u
      JOIN rol r ON u.rol_id = r.id
      LEFT JOIN sede s ON s.id = u.sede_id
      LEFT JOIN tripulacion_turno tt ON tt.usuario_id = u.id
      LEFT JOIN asignacion_unidad a ON a.id = tt.asignacion_id
      LEFT JOIN salida_unidad su ON su.asignacion_id = a.id
      LEFT JOIN situacion sit ON sit.salida_unidad_id = su.id
      WHERE r.nombre = 'BRIGADA'
        AND u.activo = TRUE
        ${sedeId ? 'AND u.sede_id = $1' : ''}
      GROUP BY u.id, u.nombre_completo, u.chapa, s.nombre
      ORDER BY total_turnos DESC
    `, sedeId ? [sedeId] : []);
    const brigadas = { rows: brigadasData };

    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'LETTER',
          layout: 'landscape',
          margins: { top: 50, bottom: 50, left: 50, right: 50 },
        });

        const stream = new PassThrough();
        doc.pipe(stream);

        // Encabezado
        doc.rect(0, 0, doc.page.width, 70).fill(COLORS.primary);
        doc.fontSize(18).fillColor(COLORS.white).text('PROVIAL - Estadisticas de Brigadas', 50, 25);
        doc.fontSize(10).text(`${sedeNombre} | ${fechaInicio.toLocaleDateString()} - ${fechaFin.toLocaleDateString()}`, 50, 48);

        let y = 90;

        // Headers de tabla
        doc.rect(50, y, doc.page.width - 100, 22).fill(COLORS.secondary);
        doc.fontSize(9).fillColor(COLORS.white);
        doc.text('Brigada', 55, y + 6);
        doc.text('Chapa', 200, y + 6);
        doc.text('Sede', 280, y + 6);
        doc.text('Turnos', 400, y + 6);
        doc.text('Situaciones', 460, y + 6);
        doc.text('Incidentes', 540, y + 6);
        doc.text('Asistencias', 610, y + 6);
        doc.text('Emergencias', 690, y + 6);
        y += 28;

        // Filas
        let rowIndex = 0;
        for (const b of brigadas.rows) {
          if (y > doc.page.height - 60) {
            doc.addPage();
            y = 50;
          }

          if (rowIndex % 2 === 0) {
            doc.rect(50, y - 2, doc.page.width - 100, 18).fill(COLORS.lightGray);
          }

          doc.fontSize(8).fillColor(COLORS.black);
          doc.text(b.nombre_completo?.substring(0, 25) || 'N/A', 55, y);
          doc.text(b.chapa || '-', 200, y);
          doc.text(b.sede_nombre?.substring(0, 15) || '-', 280, y);
          doc.text(b.total_turnos?.toString() || '0', 415, y);
          doc.text(b.total_situaciones?.toString() || '0', 480, y);
          doc.text(b.incidentes?.toString() || '0', 560, y);
          doc.text(b.asistencias?.toString() || '0', 630, y);
          doc.text(b.emergencias?.toString() || '0', 710, y);

          y += 18;
          rowIndex++;
        }

        // Pie
        doc.fontSize(8).fillColor(COLORS.gray);
        doc.text(
          `Generado el ${new Date().toLocaleString('es-GT')} - Total brigadas: ${brigadas.rows.length}`,
          50,
          doc.page.height - 30
        );

        doc.end();
        resolve(stream);
      } catch (error) {
        reject(error);
      }
    });
  },

  /**
   * Generar reporte Excel de estadisticas de brigadas
   */
  async generarReporteBrigadasExcel(
    sedeId: number | null,
    fechaInicio: Date,
    fechaFin: Date
  ): Promise<ExcelJS.Workbook> {
    let sedeNombre = 'Todas las sedes';
    if (sedeId) {
      const sede = await db.oneOrNone('SELECT nombre FROM sede WHERE id = $1', [sedeId]);
      sedeNombre = sede?.nombre || 'Sede desconocida';
    }

    const brigadasData = await db.any(`
      SELECT
        u.id,
        u.nombre_completo,
        u.chapa,
        u.telefono,
        s.nombre AS sede_nombre,
        COUNT(DISTINCT tt.asignacion_id) AS total_turnos,
        COUNT(DISTINCT sit.id) AS total_situaciones,
        SUM(CASE WHEN sit.tipo_situacion = 'INCIDENTE' THEN 1 ELSE 0 END) AS incidentes,
        SUM(CASE WHEN sit.tipo_situacion = 'ASISTENCIA_VEHICULAR' THEN 1 ELSE 0 END) AS asistencias,
        SUM(CASE WHEN sit.tipo_situacion = 'EMERGENCIA' THEN 1 ELSE 0 END) AS emergencias,
        SUM(CASE WHEN sit.tipo_situacion = 'PATRULLAJE' THEN 1 ELSE 0 END) AS patrullajes
      FROM usuario u
      JOIN rol r ON u.rol_id = r.id
      LEFT JOIN sede s ON s.id = u.sede_id
      LEFT JOIN tripulacion_turno tt ON tt.usuario_id = u.id
      LEFT JOIN asignacion_unidad a ON a.id = tt.asignacion_id
      LEFT JOIN salida_unidad su ON su.asignacion_id = a.id
      LEFT JOIN situacion sit ON sit.salida_unidad_id = su.id
      WHERE r.nombre = 'BRIGADA'
        AND u.activo = TRUE
        ${sedeId ? 'AND u.sede_id = $1' : ''}
      GROUP BY u.id, u.nombre_completo, u.chapa, u.telefono, s.nombre
      ORDER BY total_turnos DESC
    `, sedeId ? [sedeId] : []);
    const brigadas = { rows: brigadasData };

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Estadisticas Brigadas');

    // Titulo
    sheet.mergeCells('A1:K1');
    sheet.getCell('A1').value = `Estadisticas de Brigadas - ${sedeNombre}`;
    sheet.getCell('A1').font = { size: 16, bold: true };
    sheet.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1e3a5f' } };
    sheet.getCell('A1').font = { size: 16, bold: true, color: { argb: 'FFFFFF' } };

    sheet.getCell('A2').value = `Periodo: ${fechaInicio.toLocaleDateString()} - ${fechaFin.toLocaleDateString()}`;

    // Headers
    const headers = ['ID', 'Nombre', 'Chapa', 'Telefono', 'Sede', 'Turnos', 'Situaciones', 'Incidentes', 'Asistencias', 'Emergencias', 'Patrullajes'];
    sheet.addRow([]);
    const headerRow = sheet.addRow(headers);
    headerRow.eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '3b82f6' } };
      cell.font = { bold: true, color: { argb: 'FFFFFF' } };
    });

    // Datos
    for (const b of brigadas.rows) {
      sheet.addRow([
        b.id,
        b.nombre_completo,
        b.chapa || '',
        b.telefono || '',
        b.sede_nombre || '',
        parseInt(b.total_turnos) || 0,
        parseInt(b.total_situaciones) || 0,
        parseInt(b.incidentes) || 0,
        parseInt(b.asistencias) || 0,
        parseInt(b.emergencias) || 0,
        parseInt(b.patrullajes) || 0,
      ]);
    }

    // Ajustar anchos
    sheet.columns.forEach((column, i) => {
      column.width = [8, 30, 12, 15, 20, 10, 12, 12, 12, 12, 12][i];
    });

    return workbook;
  },
};

export default ReportesService;
