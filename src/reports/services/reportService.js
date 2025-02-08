const BaseReportTemplate = require("../templates/baseTemplate");
const loanModel = require("../../../models/loanModel");
const componentModel = require("../../../models/componentModel");
const requestModel = require("../../../models/requestModel");
const academicPeriodModel = require("../../../models/academicPeriodModel");
const componentMovementModel = require("../../../models/componentMovementModel");

class ReportService {
  constructor() {
    this.template = BaseReportTemplate;
  }

  // 1. Reporte de préstamos por período
  async generateLoansByPeriodReport(filters) {
    try {
      const template = new BaseReportTemplate(
        "REPORTE DE PRÉSTAMOS POR PERÍODO"
      );

      // Obtener datos
      const periodId = filters.academicPeriodId;
      // Pasar todos los filtros al modelo
      const loans = await loanModel.getLoansByPeriod(periodId, {
        startDate: filters.startDate,
        endDate: filters.endDate,
        status: filters.status,
      });

      // Validar datos
      if (!Array.isArray(loans) || !loans.length) {
        throw new Error(
          "No hay préstamos registrados para los filtros seleccionados"
        );
      }

      // Agregar información del filtrado al resumen
      const summary = {
        "Total de préstamos": loans.length,
        "Préstamos activos": loans.filter((l) => l.status === "no_devuelto")
          .length,
        "Préstamos devueltos": loans.filter((l) => l.status === "devuelto")
          .length,
        "Período de reporte": `${
          filters.startDate
            ? new Date(filters.startDate).toLocaleDateString("es-ES")
            : "Inicio del período"
        } - ${
          filters.endDate
            ? new Date(filters.endDate).toLocaleDateString("es-ES")
            : "Fin del período"
        }`,
        "Estado filtrado": filters.status || "Todos",
      };

      // Preparar datos para la tabla
      const headers = [
        "Usuario",
        "Componente",
        "Fecha Inicio",
        "Estado",
        "Fecha Devolución",
      ];
      const data = loans.map((loan) => [
        loan.user?.name ?? "Desconocido",
        loan.component?.name ?? "Sin nombre",
        template.formatter?.formatDateTime(loan.startDate) ?? "Sin fecha",
        template.formatter?.formatLoanStatus(loan.status) ??
          "Estado desconocido",
        template.formatter?.formatDateTime(loan.endDate) ?? "Sin fecha",
      ]);

      // Generar PDF
      const doc = await template.initializeReport(filters);
      template.addSummarySection(doc, summary);
      template.addDataTable(doc, headers, data);
      return template.finalizeReport(doc);
    } catch (error) {
      throw new Error(`Error generando reporte de préstamos: ${error.message}`);
    }
  }

  // 2. Reporte de componentes más solicitados
  async generateMostRequestedComponentsReport(filters) {
    try {
      const template = new BaseReportTemplate(
        "REPORTE DE COMPONENTES MÁS SOLICITADOS"
      );

      // Obtener datos usando los filtros
      const componentStats = await loanModel.getMostRequestedComponents(
        filters
      );

      // Validar datos
      if (!componentStats.length) {
        throw new Error(
          "No hay datos de componentes solicitados para los filtros seleccionados"
        );
      }

      // Preparar información del período de reporte
      const reportPeriod =
        filters.startDate && filters.endDate
          ? `Período: ${template.formatter.formatDate(
              filters.startDate
            )} - ${template.formatter.formatDate(filters.endDate)}`
          : "Período: Todo el historial";

      // Preparar resumen
      const summary = {
        "Total de componentes": componentStats.length,
        "Período del reporte": reportPeriod,
        "Categoría filtrada": filters.category || "Todas",
        "Componente más solicitado": `${componentStats[0].component.name} (${componentStats[0]._count.componentId} préstamos)`,
        "Total de préstamos registrados": componentStats.reduce(
          (sum, stat) => sum + stat._count.componentId,
          0
        ),
      };

      // Preparar datos para la tabla
      const headers = [
        "Componente",
        "Categoría",
        "Total Préstamos",
        "Stock Actual",
        "Último Préstamo",
      ];

      const data = componentStats.map((stat) => [
        stat.component.name,
        stat.component.category.name,
        stat._count.componentId.toString(),
        stat.component.quantity.toString(),
        template.formatter.formatDate(stat.component.updatedAt),
      ]);

      // Generar PDF
      const doc = await template.initializeReport(filters);
      // Agregar sección de resumen
      template.addSummarySection(doc, summary);
      // Agregar tabla de datos
      template.addDataTable(doc, headers, data);

      return template.finalizeReport(doc);
    } catch (error) {
      console.error("Error en generateMostRequestedComponentsReport:", error);
      throw new Error(
        `Error generando reporte de componentes solicitados: ${error.message}`
      );
    }
  }

  // 3. Reporte de usuarios con préstamos activos
  async generateActiveLoansReport(filters) {
    try {
      const template = new BaseReportTemplate("REPORTE DE PRÉSTAMOS ACTIVOS");

      // Obtener datos usando los filtros
      const activeLoans = await loanModel.getCurrentLoans(filters);

      // Validar datos
      if (!activeLoans.length) {
        throw new Error(
          "No hay préstamos activos para los filtros seleccionados"
        );
      }

      // Preparar resumen
      const summary = {
        "Total de préstamos activos": activeLoans.length,
        "Usuarios con préstamos": new Set(
          activeLoans.map((loan) => loan.user.name)
        ).size,
        "Usuario filtrado": filters.userId
          ? activeLoans.find((l) => l.userId === filters.userId)?.user.name ||
            filters.userId
          : "Todos",
        "Componente filtrado": filters.componentId
          ? activeLoans.find((l) => l.componentId === filters.componentId)
              ?.component.name || filters.componentId
          : "Todos",
        "Préstamo más antiguo": template.formatter.formatDateTime(
          activeLoans.reduce((oldest, loan) =>
            new Date(loan.startDate) < new Date(oldest.startDate)
              ? loan
              : oldest
          ).startDate
        ),
      };

      // Preparar datos para la tabla
      const headers = [
        "Usuario",
        "Componente",
        "Fecha Inicio",
        "Días Transcurridos",
        "Estado",
        "Observaciones",
      ];

      const data = activeLoans.map((loan) => {
        const daysDiff =
          (new Date() - new Date(loan.startDate)) / (1000 * 60 * 60 * 24);

        return [
          loan.user.name,
          loan.component.name,
          template.formatter.formatDateTime(loan.startDate),
          template.formatter.formatMetrics(daysDiff, "duration"),
          template.formatter.formatLoanStatus(loan.status),
          daysDiff > 30 ? "Préstamo extendido" : "En tiempo normal",
        ];
      });

      // Ordenar por días transcurridos (descendente)
      data.sort((a, b) => {
        const daysA = parseFloat(a[3]);
        const daysB = parseFloat(b[3]);
        return daysB - daysA;
      });

      // Generar PDF
      const doc = await template.initializeReport(filters);
      // Agregar sección de resumen
      template.addSummarySection(doc, summary);
      // Agregar tabla de datos
      template.addDataTable(doc, headers, data);

      // Agregar notas al pie si hay préstamos extendidos
      const extendedLoans = data.filter(
        (row) => row[5] === "Préstamo extendido"
      );
      if (extendedLoans.length > 0) {
        const notes = [
          `Hay ${extendedLoans.length} préstamo(s) con más de 30 días de duración.`,
          "Se recomienda hacer seguimiento a estos casos.",
        ];
        template.addNotes(doc, notes);
      }

      return template.finalizeReport(doc);
    } catch (error) {
      console.error("Error en generateActiveLoansReport:", error);
      throw new Error(
        `Error generando reporte de préstamos activos: ${error.message}`
      );
    }
  }

  // 4. Reporte de componentes con bajo stock
  async generateLowStockReport(filters) {
    try {
      const template = new BaseReportTemplate(
        "REPORTE DE COMPONENTES CON BAJO STOCK"
      );

      // Obtener todos los componentes
      const components = await componentModel.getAllComponents();

      // Filtrar componentes
      let lowStockComponents = components
        // Primero filtrar por bajo stock
        .filter((comp) => comp.quantity < 5)
        // Luego aplicar filtro de categoría si existe
        .filter((comp) => {
          if (filters.category) {
            return comp.category.name === filters.category;
          }
          return true;
        });

      // Ordenar por cantidad (ascendente)
      lowStockComponents.sort((a, b) => a.quantity - b.quantity);

      // Validar datos
      if (!lowStockComponents.length) {
        throw new Error(
          "No hay componentes con bajo stock para los filtros seleccionados"
        );
      }

      // Preparar resumen
      const summary = {
        "Total componentes con bajo stock": lowStockComponents.length,
        "Componentes sin stock": lowStockComponents.filter(
          (c) => c.quantity === 0
        ).length,
        "Categoría filtrada": filters.category || "Todas",
        "Stock promedio": (
          lowStockComponents.reduce((sum, comp) => sum + comp.quantity, 0) /
          lowStockComponents.length
        ).toFixed(2),
        "Categorías afectadas": new Set(
          lowStockComponents.map((comp) => comp.category.name)
        ).size,
      };

      // Preparar datos para la tabla
      const headers = [
        "Componente",
        "Categoría",
        "Stock Actual",
        "Último Movimiento",
        "Estado",
        "Recomendación",
      ];

      const data = lowStockComponents.map((comp) => [
        comp.name,
        comp.category.name,
        comp.quantity.toString(),
        template.formatter.formatDateTime(comp.updatedAt),
        comp.quantity === 0 ? "Sin Stock" : "Stock Bajo",
        comp.quantity === 0 ? "Reposición Urgente" : "Planificar Reposición",
      ]);

      // Generar PDF
      const doc = await template.initializeReport(filters);

      // Agregar sección de resumen
      template.addSummarySection(doc, summary);

      // Agregar tabla de datos
      template.addDataTable(doc, headers, data);

      // Agregar notas según la gravedad de la situación
      const notes = [];
      if (lowStockComponents.some((c) => c.quantity === 0)) {
        notes.push(
          "⚠️ Hay componentes sin stock disponible que requieren atención inmediata."
        );
      }
      if (lowStockComponents.length > 10) {
        notes.push(
          "Se recomienda revisar las políticas de reposición de inventario."
        );
      }
      if (notes.length > 0) {
        template.addNotes(doc, notes);
      }

      return template.finalizeReport(doc);
    } catch (error) {
      console.error("Error en generateLowStockReport:", error);
      throw new Error(
        `Error generando reporte de bajo stock: ${error.message}`
      );
    }
  }

  // 5. Reporte de movimientos de componentes
  async generateComponentMovementsReport(filters) {
    try {
      const template = new BaseReportTemplate(
        "REPORTE DE MOVIMIENTOS DE COMPONENTES"
      );

      // Obtener datos con filtros
      const movements = await componentMovementModel.getComponentMovements(
        filters
      );

      // Validar datos
      if (!movements.length) {
        throw new Error(
          "No hay movimientos registrados para los filtros especificados"
        );
      }

      // Preparar información del período
      const reportPeriod =
        filters.startDate && filters.endDate
          ? `${template.formatter.formatDate(
              filters.startDate
            )} - ${template.formatter.formatDate(filters.endDate)}`
          : "Todo el historial";

      // Preparar resumen detallado
      const summary = {
        "Período del reporte": reportPeriod,
        "Total de movimientos": movements.length,
        Ingresos: movements.filter((m) => m.movementType === "ingreso").length,
        Egresos: movements.filter((m) => m.movementType === "egreso").length,
        "Componentes afectados": new Set(movements.map((m) => m.component.name))
          .size,
        "Total unidades ingresadas": movements
          .filter((m) => m.movementType === "ingreso")
          .reduce((sum, m) => sum + m.quantity, 0),
        "Total unidades retiradas": Math.abs(
          movements
            .filter((m) => m.movementType === "egreso")
            .reduce((sum, m) => sum + m.quantity, 0)
        ),
      };

      // Agregar información de filtros al resumen
      if (filters.componentId) {
        const componentName = movements.find(
          (m) => m.componentId === filters.componentId
        )?.component.name;
        summary["Componente filtrado"] = componentName || filters.componentId;
      }
      if (filters.movementType) {
        summary["Tipo de movimiento"] =
          filters.movementType === "ingreso" ? "Ingresos" : "Egresos";
      }

      // Preparar datos para la tabla
      const headers = [
        "Fecha",
        "Componente",
        "Tipo",
        "Cantidad",
        "Razón",
        "Período Académico",
        "Stock Resultante",
      ];

      // Ordenar movimientos por fecha (más recientes primero)
      movements.sort(
        (a, b) => new Date(b.movementDate) - new Date(a.movementDate)
      );

      const data = movements.map((movement) => [
        template.formatter.formatDateTime(movement.movementDate),
        movement.component.name,
        template.formatter.formatMovementType(movement.movementType),
        Math.abs(movement.quantity).toString(),
        movement.reason,
        movement.academicPeriod ? movement.academicPeriod.name : "N/A",
        movement.component.quantity.toString(), // Stock actual del componente
      ]);

      // Generar PDF
      const doc = await template.initializeReport(filters);

      // Agregar sección de resumen
      template.addSummarySection(doc, summary);

      // Agregar tabla de datos
      template.addDataTable(doc, headers, data);

      // Agregar notas si es necesario
      const notes = [];
      const egresosRecientes = movements.filter(
        (m) =>
          m.movementType === "egreso" &&
          (new Date() - new Date(m.movementDate)) / (1000 * 60 * 60 * 24) <= 7
      ).length;

      if (egresosRecientes > 5) {
        notes.push(
          `Se detectaron ${egresosRecientes} egresos en la última semana.`
        );
        notes.push(
          "Se recomienda revisar la frecuencia de salidas de componentes."
        );
      }

      if (notes.length > 0) {
        template.addNotes(doc, notes);
      }

      return template.finalizeReport(doc);
    } catch (error) {
      console.error("Error en generateComponentMovementsReport:", error);
      throw new Error(
        `Error generando reporte de movimientos: ${error.message}`
      );
    }
  }

  // 6. Reporte de préstamos no devueltos
  async generateNotReturnedReport(filters) {
    try {
      const template = new BaseReportTemplate(
        "REPORTE DE PRÉSTAMOS NO DEVUELTOS"
      );

      // Obtener datos con filtros
      const notReturnedLoans = await loanModel.getNotReturnedLoans(filters);

      // Validar datos
      if (!notReturnedLoans.length) {
        throw new Error(
          "No hay préstamos no devueltos para los filtros seleccionados"
        );
      }

      // Calcular estadísticas para el resumen
      const totalDays = notReturnedLoans.reduce((sum, loan) => {
        return (
          sum + (new Date() - new Date(loan.startDate)) / (1000 * 60 * 60 * 24)
        );
      }, 0);

      // Preparar resumen
      const summary = {
        "Total préstamos no devueltos": notReturnedLoans.length,
        "Usuarios involucrados": new Set(
          notReturnedLoans.map((loan) => loan.user.name)
        ).size,
        "Componentes afectados": new Set(
          notReturnedLoans.map((loan) => loan.component.name)
        ).size,
        "Promedio días transcurridos": Math.floor(
          totalDays / notReturnedLoans.length
        ),
        "Préstamo más antiguo": template.formatter.formatDateTime(
          notReturnedLoans.reduce((oldest, loan) =>
            new Date(loan.startDate) < new Date(oldest.startDate)
              ? loan
              : oldest
          ).startDate
        ),
      };

      // Agregar información de filtros al resumen
      if (filters.userId) {
        const userName = notReturnedLoans.find(
          (l) => l.userId === filters.userId
        )?.user.name;
        summary["Usuario filtrado"] = userName || filters.userId;
      }
      if (filters.startDate && filters.endDate) {
        summary["Período analizado"] = `${template.formatter.formatDate(
          filters.startDate
        )} - ${template.formatter.formatDate(filters.endDate)}`;
      }

      // Preparar datos para la tabla
      const headers = [
        "Usuario",
        "Componente",
        "Fecha Préstamo",
        "Días Transcurridos",
        "Estado Final",
        "Observaciones",
        "Detalles de Solicitud",
      ];

      // Ordenar por días transcurridos (descendente)
      notReturnedLoans.sort(
        (a, b) =>
          new Date() -
          new Date(a.startDate) -
          (new Date() - new Date(b.startDate))
      );

      const data = notReturnedLoans.map((loan) => {
        const daysPassed =
          (new Date() - new Date(loan.startDate)) / (1000 * 60 * 60 * 24);

        return [
          loan.user.name,
          loan.component.name,
          template.formatter.formatDateTime(loan.startDate),
          template.formatter.formatMetrics(daysPassed, "duration"),
          template.formatter.formatReturnStatus(
            loan.wasReturned,
            loan.finalStatus
          ),
          daysPassed > 30
            ? "Requiere atención inmediata"
            : "Seguimiento normal",
          loan.request.adminNotes || "Sin observaciones adicionales",
        ];
      });

      // Generar PDF
      const doc = await template.initializeReport(filters);

      // Agregar sección de resumen
      template.addSummarySection(doc, summary);

      // Agregar tabla de datos
      template.addDataTable(doc, headers, data);

      // Agregar notas según la gravedad de la situación
      const notes = [];
      const longOverdueLoans = notReturnedLoans.filter(
        (loan) =>
          (new Date() - new Date(loan.startDate)) / (1000 * 60 * 60 * 24) > 30
      );

      if (longOverdueLoans.length > 0) {
        notes.push(
          `⚠️ Hay ${longOverdueLoans.length} préstamo(s) con más de 30 días sin devolución.`
        );
        notes.push(
          "Se recomienda iniciar procedimiento de seguimiento especial para estos casos."
        );
      }

      const repeatOffenders = Object.entries(
        notReturnedLoans.reduce((acc, loan) => {
          acc[loan.user.name] = (acc[loan.user.name] || 0) + 1;
          return acc;
        }, {})
      ).filter(([_, count]) => count > 1);

      if (repeatOffenders.length > 0) {
        notes.push(
          "Se detectaron usuarios con múltiples préstamos no devueltos:"
        );
        repeatOffenders.forEach(([name, count]) => {
          notes.push(`- ${name}: ${count} préstamos pendientes`);
        });
      }

      if (notes.length > 0) {
        template.addNotes(doc, notes);
      }

      return template.finalizeReport(doc);
    } catch (error) {
      console.error("Error en generateNotReturnedReport:", error);
      throw new Error(
        `Error generando reporte de préstamos no devueltos: ${error.message}`
      );
    }
  }
}

module.exports = new ReportService();
