import PDFDocument from 'pdfkit';
import { PassThrough } from 'stream';

// ============================================
// INTERFACES
// ============================================

interface Inspeccion360Data {
  id: number;
  unidad_codigo: string;
  tipo_unidad: string;
  placa?: string;
  sede_nombre?: string;
  plantilla_nombre: string;
  fecha_realizacion: string;
  fecha_aprobacion?: string;
  estado: 'PENDIENTE' | 'APROBADA' | 'RECHAZADA';
  inspector_nombre: string;
  inspector_chapa?: string;
  comandante_nombre?: string;
  comandante_chapa?: string;
  observaciones_inspector?: string;
  observaciones_comandante?: string;
  motivo_rechazo?: string;
  secciones: SeccionConRespuestas[];
}

interface SeccionConRespuestas {
  nombre: string;
  items: ItemConRespuesta[];
}

interface ItemConRespuesta {
  codigo: string;
  descripcion: string;
  tipo: string;
  requerido: boolean;
  valor: any;
  foto_url?: string;
  observacion?: string;
}

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
// FUNCIONES AUXILIARES
// ============================================

function formatFecha(fecha: string): string {
  const date = new Date(fecha);
  return date.toLocaleDateString('es-GT', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getValorColor(tipo: string, valor: any): string {
  if (tipo === 'CHECKBOX') {
    return valor ? COLORS.success : COLORS.danger;
  }
  if (tipo === 'ESTADO') {
    const valorUpper = String(valor).toUpperCase();
    if (['BUENO', 'FUNCIONANDO', 'NORMAL', 'LLENO'].includes(valorUpper)) {
      return COLORS.success;
    }
    if (['REGULAR', 'PARCIAL', 'BAJO', '3/4', '1/2'].includes(valorUpper)) {
      return COLORS.warning;
    }
    if (['MALO', 'NO FUNCIONA', 'CRITICO', 'RESERVA', '1/4'].includes(valorUpper)) {
      return COLORS.danger;
    }
  }
  return COLORS.black;
}

function formatValor(tipo: string, valor: any): string {
  if (tipo === 'CHECKBOX') {
    return valor ? 'SI' : 'NO';
  }
  if (valor === null || valor === undefined || valor === '') {
    return 'N/A';
  }
  return String(valor);
}

// ============================================
// SERVICIO DE GENERACION PDF
// ============================================

export const PDF360Service = {
  /**
   * Genera un PDF de la inspeccion 360
   * @returns Stream del PDF generado
   */
  async generarPDF(data: Inspeccion360Data): Promise<PassThrough> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'LETTER',
          margins: { top: 50, bottom: 50, left: 50, right: 50 },
          bufferPages: true,
          info: {
            Title: `Inspeccion 360 - ${data.unidad_codigo}`,
            Author: 'PROVIAL',
            Subject: `Inspeccion vehicular ${data.id}`,
          },
        });

        const stream = new PassThrough();
        doc.pipe(stream);

        // ========================================
        // ENCABEZADO
        // ========================================
        doc.rect(0, 0, doc.page.width, 90).fill(COLORS.primary);

        doc.fontSize(24)
           .fillColor(COLORS.white)
           .text('PROVIAL', 50, 25);

        doc.fontSize(12)
           .text('INSPECCION VEHICULAR 360', 50, 55);

        doc.fontSize(10)
           .text(`No. ${String(data.id).padStart(6, '0')}`, 450, 30, { align: 'right', width: 100 });

        // Estado badge
        const estadoColor = data.estado === 'APROBADA' ? COLORS.success :
                           data.estado === 'RECHAZADA' ? COLORS.danger : COLORS.warning;
        doc.roundedRect(450, 50, 100, 22, 5).fill(estadoColor);
        doc.fontSize(10)
           .fillColor(COLORS.white)
           .text(data.estado, 450, 56, { align: 'center', width: 100 });

        let y = 110;

        // ========================================
        // INFORMACION DEL VEHICULO
        // ========================================
        doc.rect(50, y, doc.page.width - 100, 70).fill(COLORS.lightGray);

        y += 10;
        doc.fontSize(11).fillColor(COLORS.primary).text('INFORMACION DEL VEHICULO', 60, y);

        y += 20;
        doc.fontSize(9).fillColor(COLORS.gray);
        doc.text('Unidad:', 60, y);
        doc.text('Tipo:', 180, y);
        doc.text('Placa:', 300, y);
        doc.text('Sede:', 420, y);

        y += 12;
        doc.fontSize(10).fillColor(COLORS.black);
        doc.text(data.unidad_codigo, 60, y);
        doc.text(data.tipo_unidad, 180, y);
        doc.text(data.placa || 'N/A', 300, y);
        doc.text(data.sede_nombre || 'N/A', 420, y);

        y += 40;

        // ========================================
        // INFORMACION DE LA INSPECCION
        // ========================================
        doc.fontSize(9).fillColor(COLORS.gray);
        doc.text('Inspector:', 60, y);
        doc.text('Fecha:', 300, y);

        y += 12;
        doc.fontSize(10).fillColor(COLORS.black);
        doc.text(`${data.inspector_nombre}${data.inspector_chapa ? ` (${data.inspector_chapa})` : ''}`, 60, y);
        doc.text(formatFecha(data.fecha_realizacion), 300, y);

        y += 20;
        doc.fontSize(9).fillColor(COLORS.gray);
        doc.text('Comandante:', 60, y);
        if (data.fecha_aprobacion) {
          doc.text('Aprobada:', 300, y);
        }

        y += 12;
        doc.fontSize(10).fillColor(COLORS.black);
        doc.text(`${data.comandante_nombre || 'Pendiente'}${data.comandante_chapa ? ` (${data.comandante_chapa})` : ''}`, 60, y);
        if (data.fecha_aprobacion) {
          doc.text(formatFecha(data.fecha_aprobacion), 300, y);
        }

        y += 30;

        // ========================================
        // SECCIONES DE INSPECCION
        // ========================================
        for (const seccion of data.secciones) {
          // Verificar si necesitamos nueva pagina
          if (y > doc.page.height - 100) {
            doc.addPage();
            y = 50;
          }

          // Titulo de seccion
          doc.rect(50, y, doc.page.width - 100, 22).fill(COLORS.secondary);
          doc.fontSize(10)
             .fillColor(COLORS.white)
             .text(seccion.nombre.toUpperCase(), 60, y + 6);
          y += 28;

          // Items de la seccion
          let itemIndex = 0;
          for (const item of seccion.items) {
            // Verificar si necesitamos nueva pagina
            if (y > doc.page.height - 40) {
              doc.addPage();
              y = 50;
            }

            const valorFormateado = formatValor(item.tipo, item.valor);
            const valorColor = getValorColor(item.tipo, item.valor);

            // Fondo alternado
            if (itemIndex % 2 === 0) {
              doc.rect(50, y - 2, doc.page.width - 100, 16).fill(COLORS.lightGray);
            }

            // Codigo
            doc.fontSize(7)
               .fillColor(COLORS.gray)
               .text(item.codigo, 55, y);

            // Descripcion
            doc.fontSize(9)
               .fillColor(COLORS.black)
               .text(item.descripcion, 95, y, { width: 320 });

            // Valor
            doc.fontSize(9)
               .fillColor(valorColor)
               .text(valorFormateado, 420, y, { width: 130, align: 'right' });

            y += 16;
            itemIndex++;
          }

          y += 10;
        }

        // ========================================
        // OBSERVACIONES
        // ========================================
        if (data.observaciones_inspector || data.observaciones_comandante || data.motivo_rechazo) {
          if (y > doc.page.height - 120) {
            doc.addPage();
            y = 50;
          }

          doc.rect(50, y, doc.page.width - 100, 22).fill(COLORS.primary);
          doc.fontSize(10)
             .fillColor(COLORS.white)
             .text('OBSERVACIONES', 60, y + 6);
          y += 28;

          if (data.observaciones_inspector) {
            doc.fontSize(8).fillColor(COLORS.gray).text('Inspector:', 55, y);
            y += 10;
            doc.fontSize(9).fillColor(COLORS.black).text(data.observaciones_inspector, 55, y, { width: doc.page.width - 110 });
            y += 20;
          }

          if (data.observaciones_comandante) {
            doc.fontSize(8).fillColor(COLORS.gray).text('Comandante:', 55, y);
            y += 10;
            doc.fontSize(9).fillColor(COLORS.black).text(data.observaciones_comandante, 55, y, { width: doc.page.width - 110 });
            y += 20;
          }

          if (data.motivo_rechazo) {
            doc.fontSize(8).fillColor(COLORS.danger).text('Motivo de Rechazo:', 55, y);
            y += 10;
            doc.fontSize(9).fillColor(COLORS.danger).text(data.motivo_rechazo, 55, y, { width: doc.page.width - 110 });
            y += 20;
          }
        }

        // ========================================
        // FIRMAS
        // ========================================
        if (y > doc.page.height - 100) {
          doc.addPage();
          y = 50;
        }

        y = doc.page.height - 100;

        // Linea de firma inspector
        doc.moveTo(100, y).lineTo(250, y).stroke(COLORS.gray);
        doc.fontSize(8)
           .fillColor(COLORS.gray)
           .text('Firma del Inspector', 100, y + 5, { width: 150, align: 'center' });
        doc.fontSize(7)
           .fillColor(COLORS.black)
           .text(data.inspector_nombre, 100, y + 15, { width: 150, align: 'center' });

        // Linea de firma comandante
        doc.moveTo(350, y).lineTo(500, y).stroke(COLORS.gray);
        doc.fontSize(8)
           .fillColor(COLORS.gray)
           .text('Firma del Comandante', 350, y + 5, { width: 150, align: 'center' });
        doc.fontSize(7)
           .fillColor(COLORS.black)
           .text(data.comandante_nombre || 'Pendiente', 350, y + 15, { width: 150, align: 'center' });

        // ========================================
        // PIE DE PAGINA
        // ========================================
        doc.fontSize(7)
           .fillColor(COLORS.gray)
           .text(
             `Documento generado el ${new Date().toLocaleString('es-GT')} - PROVIAL Sistema de Gestion`,
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
   * Prepara los datos de una inspeccion para generar PDF
   */
  async prepararDatos(
    inspeccion: any,
    plantilla: any,
    unidad: any,
    inspector: any,
    comandante: any | null
  ): Promise<Inspeccion360Data> {
    // Combinar secciones de la plantilla con respuestas
    const respuestasMap = new Map();
    if (Array.isArray(inspeccion.respuestas)) {
      inspeccion.respuestas.forEach((r: any) => {
        respuestasMap.set(r.codigo, r);
      });
    }

    const seccionesConRespuestas: SeccionConRespuestas[] = plantilla.secciones.map((seccion: any) => ({
      nombre: seccion.nombre,
      items: seccion.items.map((item: any) => {
        const respuesta = respuestasMap.get(item.codigo);
        return {
          codigo: item.codigo,
          descripcion: item.descripcion,
          tipo: item.tipo,
          requerido: item.requerido,
          valor: respuesta?.valor,
          foto_url: respuesta?.foto_url,
          observacion: respuesta?.observacion,
        };
      }),
    }));

    return {
      id: inspeccion.id,
      unidad_codigo: unidad.codigo,
      tipo_unidad: unidad.tipo_unidad,
      placa: unidad.placa,
      sede_nombre: unidad.sede_nombre,
      plantilla_nombre: plantilla.nombre,
      fecha_realizacion: inspeccion.fecha_realizacion,
      fecha_aprobacion: inspeccion.fecha_aprobacion,
      estado: inspeccion.estado,
      inspector_nombre: inspector.nombre_completo,
      inspector_chapa: inspector.chapa,
      comandante_nombre: comandante?.nombre_completo,
      comandante_chapa: comandante?.chapa,
      observaciones_inspector: inspeccion.observaciones_inspector,
      observaciones_comandante: inspeccion.observaciones_comandante,
      motivo_rechazo: inspeccion.motivo_rechazo,
      secciones: seccionesConRespuestas,
    };
  },
};
