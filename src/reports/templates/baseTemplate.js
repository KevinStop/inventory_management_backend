const PDFGenerator = require("../utils/pdfGenerator");
const ReportFormatters = require("../utils/formatters");
const moment = require("moment");

class BaseReportTemplate {
  constructor(title, subtitle = "") {
    this.title = title;
    this.subtitle = subtitle;
    this.pdfGenerator = new PDFGenerator();
    this.formatter = ReportFormatters;
  }

  // Inicializar el reporte con la estructura básica
  async initializeReport() {
    const doc = this.pdfGenerator.initializeDocument().addHeader(this.title);

    // Agregar subtítulo si existe
    if (this.subtitle) {
      doc.doc.fontSize(14).text(this.subtitle, { align: "center" }).moveDown();
    }

    return doc;
  }

  // Agregar sección de resumen si es necesario
  addSummarySection(doc, summaryData) {
    doc.doc.fontSize(12).text("Resumen:", { underline: true }).moveDown(0.5);

    for (const [key, value] of Object.entries(summaryData)) {
      doc.doc.fontSize(10).text(`${key}: ${value}`).moveDown(0.2);
    }

    doc.doc.moveDown();
    return doc;
  }

  // Método auxiliar para calcular la altura del texto
  calculateTextHeight(text, fontSize, width) {
    const str = text?.toString() || '';
    const charsPerLine = Math.floor((width) / (fontSize / 2));
    const lines = Math.ceil(str.length / charsPerLine);
    return Math.max(lines * (fontSize * 1.2), fontSize * 1.2);
  }

  // Método auxiliar para calcular la altura máxima de una fila
  calculateRowHeight(row, columnWidth, options) {
    return Math.max(
      ...row.map(cell => 
        this.calculateTextHeight(
          cell, 
          options.fontSize, 
          columnWidth - 2 * options.padding
        )
      )
    ) + options.padding * 2;
  }

  addDataTable(doc, headers, data, options = {}) {
    const defaultOptions = {
      width: 495,
      minRowHeight: 20,
      fontSize: 9,
      headerColor: "#E4E4E4",
      zebraColor: "#F9F9F9",
      textColor: "#000000",
      padding: 4,
      margin: 50,
    };

    const tableOptions = { ...defaultOptions, ...options };
    const columnWidth = tableOptions.width / headers.length;

    // Posición inicial de la tabla
    let currentY = doc.doc.y;

    // Dibujar encabezados
    const headerHeight = this.calculateRowHeight(headers, columnWidth, tableOptions);
    
    // Dibujar borde superior de la tabla
    doc.doc
      .moveTo(tableOptions.margin, currentY)
      .lineTo(tableOptions.margin + tableOptions.width, currentY)
      .strokeColor('#000000')
      .lineWidth(1)
      .stroke();

    headers.forEach((header, i) => {
      // Dibujar fondo del encabezado
      doc.doc
        .rect(
          tableOptions.margin + i * columnWidth,
          currentY,
          columnWidth,
          headerHeight
        )
        .fillColor(tableOptions.headerColor)
        .fill();

      // Dibujar texto del encabezado
      // Texto del encabezado en negrita
      doc.doc
        .fillColor(tableOptions.textColor)
        .fontSize(tableOptions.fontSize)
        .font('Helvetica-Bold') // Cambiar a fuente en negrita
        .text(
          header,
          tableOptions.margin + i * columnWidth + tableOptions.padding,
          currentY + tableOptions.padding,
          {
            width: columnWidth - 2 * tableOptions.padding,
            align: "left"
          }
        )
        .font('Helvetica'); // Volver a la fuente normal
    });

    currentY += headerHeight;

    // Dibujar filas
    data.forEach((row, rowIndex) => {
      const rowHeight = Math.max(
        tableOptions.minRowHeight,
        this.calculateRowHeight(row, columnWidth, tableOptions)
      );

      // Verificar si necesitamos una nueva página
      if (currentY + rowHeight > doc.doc.page.height - 100) {
        doc.doc.addPage();
        currentY = 50;
        
        // Opcional: Repetir encabezados en la nueva página
        headers.forEach((header, i) => {
          doc.doc
            .rect(
              tableOptions.margin + i * columnWidth,
              currentY,
              columnWidth,
              headerHeight
            )
            .fillColor(tableOptions.headerColor)
            .fill()
            .fillColor(tableOptions.textColor)
            .text(
              header,
              tableOptions.margin + i * columnWidth + tableOptions.padding,
              currentY + tableOptions.padding,
              {
                width: columnWidth - 2 * tableOptions.padding,
                align: "left"
              }
            );
        });
        currentY += headerHeight;
      }

      // Color de fondo para filas alternas
      if (options.zebra && rowIndex % 2 === 1) {
        doc.doc
          .rect(
            tableOptions.margin,
            currentY,
            tableOptions.width,
            rowHeight
          )
          .fillColor(tableOptions.zebraColor)
          .fill();
      }

      // Dibujar bordes superiores de las celdas
      doc.doc
        .moveTo(tableOptions.margin, currentY)
        .lineTo(tableOptions.margin + tableOptions.width, currentY)
        .strokeColor('#000000')
        .lineWidth(0.5)
        .stroke();

      // Dibujar celdas
      row.forEach((cell, colIndex) => {
        doc.doc
          .fillColor(tableOptions.textColor)
          .fontSize(tableOptions.fontSize)
          .text(
            cell?.toString() || "",
            tableOptions.margin + colIndex * columnWidth + tableOptions.padding,
            currentY + tableOptions.padding,
            {
              width: columnWidth - 2 * tableOptions.padding,
              align: "left"
            }
          );
      });
      
      // Dibujar bordes inferiores de las celdas
      doc.doc
        .moveTo(tableOptions.margin, currentY + rowHeight)
        .lineTo(tableOptions.margin + tableOptions.width, currentY + rowHeight)
        .strokeColor('#000000')
        .lineWidth(0.5)
        .stroke();

      currentY += rowHeight;
    });

    // Dibujar borde inferior de la tabla
    doc.doc
      .moveTo(tableOptions.margin, currentY)
      .lineTo(tableOptions.margin + tableOptions.width, currentY)
      .strokeColor('#000000')
      .lineWidth(1)
      .stroke();

    doc.doc.y = currentY + 10; // Agregar un pequeño espacio después de la tabla
    return doc;
  }

  // Agregar notas al pie si es necesario
  addNotes(doc, notes) {
    if (!notes || notes.length === 0) return doc;

    doc.doc
      .moveDown()
      .fontSize(10)
      .text("Notas:", { underline: true })
      .moveDown(0.5);

    notes.forEach((note) => {
      doc.doc.text(`• ${note}`, { indent: 20 }).moveDown(0.2);
    });

    return doc;
  }

  // Finalizar el reporte
  finalizeReport(doc) {
    return doc.getDocument();
  }

  // Método para validar los datos antes de generar el reporte
  validateReportData(data) {
    if (!data || (Array.isArray(data) && data.length === 0)) {
      throw new Error("No hay datos disponibles para generar el reporte");
    }
    return true;
  }

  // Método para manejar errores durante la generación
  handleReportError(error) {
    console.error("Error generando reporte:", error);
    throw new Error(`Error al generar el reporte: ${error.message}`);
  }

  // Método para generar el nombre del archivo
  generateFileName(prefix = "reporte") {
    const timestamp = moment().format("YYYYMMDD-HHmmss");
    return `${prefix}_${timestamp}.pdf`;
  }
}

module.exports = BaseReportTemplate;
