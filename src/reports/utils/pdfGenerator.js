const PDFDocument = require("pdfkit");
const moment = require("moment");
const path = require("path");

class PDFGenerator {
  constructor() {
    // Configurar documento con márgenes ajustados
    this.doc = new PDFDocument({
      size: 'A4',
      bufferPages: true,
      margins: {
        top: 50,
        left: 50,
        right: 50,
        bottom: 70  // Margen inferior aumentado para el pie de página
      }
    });
  }

  initializeDocument() {
    this.doc.info["Title"] = "Sistema de Gestión de Componentes - Reporte";
    this.doc.info["Author"] = "Sistema de Gestión";
    this.doc.info["Creator"] = "PDFKit";
    this.doc.font("Helvetica").fontSize(12);
    return this;
  }

  addHeader(title) {
    const logoPath = path.join(__dirname, "../../../assets/logo.png");
    this.doc
      .image(logoPath, 50, 45, { width: 150 })
      .fontSize(20)
      .text(title, 120, 110)
      .moveDown();

    this.doc.moveTo(50, 130).lineTo(545, 130).stroke();

    this.doc
      .fontSize(10)
      .text(`Fecha de generación: ${moment().format("DD/MM/YYYY HH:mm")}`, {
        align: "right",
      });

    this.doc.moveDown();
    return this;
  }

  createTable(headers, rows, options = {}) {
    const defaultOptions = {
      width: 495,
      rowHeight: 20,
      fontSize: 10,
      headerColor: '#E4E4E4',
      textColor: '#000000',
      padding: 5
    };

    const tableOptions = { ...defaultOptions, ...options };
    const columnWidth = tableOptions.width / headers.length;
    const contentBottom = this.doc.page.height - 70; // Reservar espacio para el pie de página

    // Dibujar encabezados
    this.doc.fillColor(tableOptions.headerColor);
    headers.forEach((header, i) => {
      this.doc.rect(
        50 + (i * columnWidth),
        this.doc.y,
        columnWidth,
        tableOptions.rowHeight
      ).fill();
    });

    this.doc.fillColor(tableOptions.textColor);
    headers.forEach((header, i) => {
      this.doc.fontSize(tableOptions.fontSize)
        .text(
          header,
          50 + (i * columnWidth) + tableOptions.padding,
          this.doc.y - tableOptions.rowHeight + tableOptions.padding,
          { width: columnWidth - (2 * tableOptions.padding) }
        );
    });

    // Dibujar filas
    rows.forEach(row => {
      // Verificar si hay espacio suficiente para la siguiente fila
      if (this.doc.y + tableOptions.rowHeight > contentBottom) {
        this.doc.addPage();
        this.doc.y = 50; // Resetear Y al margen superior
      }

      this.doc.moveDown(0.5);
      row.forEach((cell, i) => {
        this.doc.fontSize(tableOptions.fontSize)
          .text(
            cell?.toString() || '',
            50 + (i * columnWidth) + tableOptions.padding,
            this.doc.y,
            { width: columnWidth - (2 * tableOptions.padding) }
          );
      });
    });

    return this;
  }

  getDocument() {
    return this.doc;
  }
}

module.exports = PDFGenerator;