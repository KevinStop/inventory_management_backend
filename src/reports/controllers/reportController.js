const reportService = require("../services/reportService");
const loanModel = require("../../../models/loanModel");
const componentModel = require("../../../models/componentModel");
const componentMovementModel = require("../../../models/componentMovementModel");
const moment = require("moment");

class ReportController {
  constructor() {
    this.reportService = reportService;
  }
  // Método común para manejar la generación de reportes
  static async handleReportGeneration(req, res, reportFunction, reportName) {
    try {
      // Log de lo que recibimos

      // Obtener los filtros de la query
      const filters = ReportController.processFilters(req.query);

      // Log antes de llamar a la función del reporte

      // Generar el reporte
      const doc = await reportFunction.call(this, filters);

      // Generar nombre del archivo
      const timestamp = moment().format("YYYYMMDD-HHmmss");
      const filename = `${reportName}_${timestamp}.pdf`;

      // Configurar headers
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${filename}"`
      );

      // Enviar el PDF
      doc.pipe(res);
      doc.end();
    } catch (error) {
      console.error(`Error detallado en handleReportGeneration:`, error);
      console.error("Stack trace completo:", error.stack);
      res.status(500).json({
        error: "Error generando reporte",
        details: error.message,
        stack: error.stack,
      });
    }
  }

  // Procesar y validar filtros comunes
  static processFilters(filters) {
    const processedFilters = {};

    // Procesar fechas
    if (filters.startDate) {
      processedFilters.startDate = new Date(filters.startDate);
    }
    if (filters.endDate) {
      processedFilters.endDate = new Date(filters.endDate);
    }

    // Procesar IDs
    if (filters.academicPeriodId) {
      processedFilters.academicPeriodId = parseInt(filters.academicPeriodId);
    }
    if (filters.componentId) {
      processedFilters.componentId = parseInt(filters.componentId);
    }
    if (filters.userId) {
      processedFilters.userId = parseInt(filters.userId);
    }

    // Procesar otros filtros
    if (filters.status && filters.status !== "null") {
      processedFilters.status = filters.status;
    }
    if (filters.movementType) {
      processedFilters.movementType = filters.movementType;
    }
    if (filters.category) {
      processedFilters.category = filters.category;
    }

    return processedFilters;
  }

  // 1. Reporte de préstamos por período
  async generateLoansByPeriodReport(req, res) {
    await ReportController.handleReportGeneration(
      req,
      res,
      reportService.generateLoansByPeriodReport,
      "prestamos_periodo"
    );
  }

  // 2. Reporte de componentes más solicitados
  async generateMostRequestedComponentsReport(req, res) {
    await ReportController.handleReportGeneration(
      req,
      res,
      reportService.generateMostRequestedComponentsReport,
      "componentes_solicitados"
    );
  }

  // 3. Reporte de usuarios con préstamos activos
  async generateActiveLoansReport(req, res) {
    await ReportController.handleReportGeneration(
      req,
      res,
      reportService.generateActiveLoansReport,
      "prestamos_activos"
    );
  }

  // 4. Reporte de componentes con bajo stock
  async generateLowStockReport(req, res) {
    await ReportController.handleReportGeneration(
      req,
      res,
      reportService.generateLowStockReport,
      "bajo_stock"
    );
  }

  // 5. Reporte de movimientos de componentes
  async generateComponentMovementsReport(req, res) {
    await ReportController.handleReportGeneration(
      req,
      res,
      reportService.generateComponentMovementsReport,
      "movimientos_componentes"
    );
  }

  // 6. Reporte de préstamos no devueltos
  async generateNotReturnedReport(req, res) {
    await ReportController.handleReportGeneration(
      req,
      res,
      reportService.generateNotReturnedReport,
      "prestamos_no_devueltos"
    );
  }

  // Endpoint para obtener los tipos de reportes disponibles
  getAvailableReports(req, res) {
    const reports = [
      {
        id: "loans-by-period",
        name: "Préstamos por Período",
        description:
          "Reporte detallado de préstamos en un período académico específico",
        availableFilters: [
          "academicPeriodId",
          "startDate",
          "endDate",
          "status",
        ],
      },
      {
        id: "most-requested",
        name: "Componentes más Solicitados",
        description: "Análisis de los componentes con mayor demanda",
        availableFilters: ["startDate", "endDate", "category"],
      },
      {
        id: "active-loans",
        name: "Préstamos Activos",
        description: "Lista actual de préstamos en curso",
        availableFilters: ["userId", "componentId"],
      },
      {
        id: "low-stock",
        name: "Componentes con Bajo Stock",
        description: "Componentes que requieren reabastecimiento",
        availableFilters: ["category"],
      },
      {
        id: "movements",
        name: "Movimientos de Componentes",
        description: "Registro de todos los movimientos de inventario",
        availableFilters: [
          "startDate",
          "endDate",
          "componentId",
          "movementType",
        ],
      },
      {
        id: "not-returned",
        name: "Préstamos No Devueltos",
        description: "Lista de préstamos marcados como no devueltos",
        availableFilters: ["startDate", "endDate", "userId"],
      },
    ];

    res.status(200).json({ reports });
  }

  // Endpoint para validar filtros antes de generar el reporte
  validateReportFilters(req, res) {
    try {
      const { reportType, filters } = req.body;

      if (!reportType) {
        return res.status(400).json({
          error: "Tipo de reporte no especificado",
        });
      }

      const processedFilters = ReportController.processFilters(filters); // Usar el método estático

      const validationResult = ReportController.validateFiltersForReportType(
        reportType,
        processedFilters
      );

      if (!validationResult.isValid) {
        return res.status(400).json({
          error: "Filtros inválidos",
          details: validationResult.errors,
        });
      }

      res.status(200).json({
        message: "Filtros válidos",
        processedFilters,
      });
    } catch (error) {
      console.error("Error completo:", error);
      console.error("Stack trace:", error.stack);
      res.status(500).json({
        error: "Error validando filtros",
        details: error.message,
        stack: error.stack,
      });
    }
  }

  // Método auxiliar para validar filtros según el tipo de reporte
  static validateFiltersForReportType(reportType, filters) {
    const errors = [];

    switch (reportType) {
      case "loans-by-period":
        if (!filters.academicPeriodId) {
          errors.push("Se requiere el ID del período académico");
        }
        break;

      case "movements":
        if (!filters.startDate || !filters.endDate) {
          errors.push(
            "Se requieren fechas de inicio y fin para el reporte de movimientos"
          );
        }
        break;

      // Agregar más validaciones específicas según sea necesario
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  async getLoansByPeriodPreview(req, res) {
    try {
      const filters = ReportController.processFilters(req.query);

      const periodId = filters.academicPeriodId;
      // Pasar todos los filtros al modelo
      const loans = await loanModel.getLoansByPeriod(periodId, {
        startDate: filters.startDate,
        endDate: filters.endDate,
        status: filters.status,
      });

      if (!loans.length) {
        return res.status(200).json({
          headers: [],
          data: [],
        });
      }

      // Preparar datos para la vista previa
      const headers = [
        "Usuario",
        "Componente",
        "Fecha Inicio",
        "Estado",
        "Fecha Devolución",
      ];
      const data = loans.map((loan) => [
        loan.user.name,
        loan.component.name,
        new Date(loan.startDate).toLocaleDateString(),
        loan.status,
        loan.endDate ? new Date(loan.endDate).toLocaleDateString() : "N/A",
      ]);

      res.status(200).json({
        headers,
        data,
      });
    } catch (error) {
      res.status(500).json({
        error: "Error obteniendo vista previa",
        details: error.message,
      });
    }
  }

  // Vista previa de componentes más solicitados
  async getMostRequestedComponentsPreview(req, res) {
    try {
      const filters = ReportController.processFilters(req.query);

      // Usar los nuevos filtros
      const componentStats = await loanModel.getMostRequestedComponents(
        filters
      );

      if (!componentStats.length) {
        return res.status(200).json({
          headers: [],
          data: [],
        });
      }

      // Preparar datos para la vista previa con información más detallada
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
        stat._count.componentId,
        stat.component.quantity,
        new Date(stat.component.updatedAt).toLocaleDateString(),
      ]);

      // Agregar mensaje sobre los filtros aplicados
      const filterSummary = [];
      if (filters.startDate)
        filterSummary.push(
          `Desde: ${new Date(filters.startDate).toLocaleDateString()}`
        );
      if (filters.endDate)
        filterSummary.push(
          `Hasta: ${new Date(filters.endDate).toLocaleDateString()}`
        );
      if (filters.category)
        filterSummary.push(`Categoría: ${filters.category}`);

      res.status(200).json({
        headers,
        data,
        filterSummary: filterSummary.length
          ? filterSummary.join(" | ")
          : "Sin filtros aplicados",
      });
    } catch (error) {
      console.error(
        "Error en vista previa de componentes más solicitados:",
        error
      );
      res.status(500).json({
        error: "Error obteniendo vista previa",
        details: error.message,
      });
    }
  }

  // Vista previa de préstamos activos
  async getActiveLoansPreview(req, res) {
    try {
      const filters = ReportController.processFilters(req.query);

      const activeLoans = await loanModel.getCurrentLoans(filters);

      if (!activeLoans.length) {
        return res.status(200).json({
          headers: [],
          data: [],
        });
      }

      // Preparar datos para la vista previa
      const headers = [
        "Usuario",
        "Componente",
        "Fecha Inicio",
        "Días Transcurridos",
        "Estado",
      ];

      const data = activeLoans.map((loan) => {
        const daysDiff = Math.floor(
          (new Date() - new Date(loan.startDate)) / (1000 * 60 * 60 * 24)
        );

        return [
          loan.user.name,
          loan.component.name,
          new Date(loan.startDate).toLocaleDateString(),
          daysDiff.toString(),
          loan.status === "no_devuelto" ? "No Devuelto" : "Devuelto",
        ];
      });

      // Agregar mensaje sobre los filtros aplicados
      const filterSummary = [];
      if (filters.userId)
        filterSummary.push(
          `Usuario: ${
            activeLoans.find((l) => l.userId === filters.userId)?.user.name ||
            filters.userId
          }`
        );
      if (filters.componentId)
        filterSummary.push(
          `Componente: ${
            activeLoans.find((l) => l.componentId === filters.componentId)
              ?.component.name || filters.componentId
          }`
        );

      res.status(200).json({
        headers,
        data,
        filterSummary: filterSummary.length
          ? filterSummary.join(" | ")
          : "Sin filtros aplicados",
      });
    } catch (error) {
      console.error("Error en vista previa de préstamos activos:", error);
      res.status(500).json({
        error: "Error obteniendo vista previa",
        details: error.message,
      });
    }
  }

  // Vista previa de componentes con bajo stock
  async getLowStockPreview(req, res) {
    try {
      const filters = ReportController.processFilters(req.query);

      // Obtener todos los componentes
      const components = await componentModel.getAllComponents();

      // Aplicar filtros
      let filteredComponents = components
        // Primero filtrar por bajo stock
        .filter((comp) => comp.quantity < 5)
        // Luego aplicar filtro de categoría si existe
        .filter((comp) => {
          if (filters.category) {
            return comp.category.name === filters.category;
          }
          return true;
        });

      if (!filteredComponents.length) {
        return res.status(200).json({
          headers: [],
          data: [],
        });
      }

      // Preparar datos para la vista previa
      const headers = [
        "Componente",
        "Categoría",
        "Stock Actual",
        "Último Movimiento",
        "Estado",
      ];

      const data = filteredComponents.map((comp) => [
        comp.name,
        comp.category.name,
        comp.quantity.toString(),
        new Date(comp.updatedAt).toLocaleDateString(),
        comp.quantity === 0 ? "Sin Stock" : "Stock Bajo",
      ]);

      // Agregar mensaje sobre los filtros aplicados
      const filterSummary = [];
      if (filters.category) {
        filterSummary.push(`Categoría: ${filters.category}`);
      }

      res.status(200).json({
        headers,
        data,
        filterSummary: filterSummary.length
          ? filterSummary.join(" | ")
          : "Sin filtros aplicados",
      });
    } catch (error) {
      console.error(
        "Error en vista previa de componentes con bajo stock:",
        error
      );
      res.status(500).json({
        error: "Error obteniendo vista previa",
        details: error.message,
      });
    }
  }

  // Vista previa de movimientos de componentes
  async getComponentMovementsPreview(req, res) {
    try {
      const filters = ReportController.processFilters(req.query);

      // Obtener movimientos usando los filtros
      const movements = await componentMovementModel.getComponentMovements(
        filters
      );

      if (!movements.length) {
        return res.status(200).json({
          headers: [],
          data: [],
        });
      }

      // Preparar datos para la vista previa
      const headers = [
        "Fecha",
        "Componente",
        "Tipo",
        "Cantidad",
        "Razón",
        "Período Académico",
      ];

      const data = movements.map((movement) => [
        new Date(movement.movementDate).toLocaleDateString(),
        movement.component.name,
        movement.movementType === "ingreso" ? "Ingreso" : "Egreso",
        Math.abs(movement.quantity).toString(),
        movement.reason,
        movement.academicPeriod ? movement.academicPeriod.name : "N/A",
      ]);

      // Agregar mensaje sobre los filtros aplicados
      const filterSummary = [];
      if (filters.startDate)
        filterSummary.push(
          `Desde: ${new Date(filters.startDate).toLocaleDateString()}`
        );
      if (filters.endDate)
        filterSummary.push(
          `Hasta: ${new Date(filters.endDate).toLocaleDateString()}`
        );
      if (filters.componentId) {
        const componentName = movements.find(
          (m) => m.componentId === filters.componentId
        )?.component.name;
        filterSummary.push(
          `Componente: ${componentName || filters.componentId}`
        );
      }
      if (filters.movementType)
        filterSummary.push(
          `Tipo: ${filters.movementType === "ingreso" ? "Ingreso" : "Egreso"}`
        );

      // Preparar resumen de movimientos
      const summary = {
        totalMovimientos: movements.length,
        ingresos: movements.filter((m) => m.movementType === "ingreso").length,
        egresos: movements.filter((m) => m.movementType === "egreso").length,
      };

      res.status(200).json({
        headers,
        data,
        filterSummary: filterSummary.length
          ? filterSummary.join(" | ")
          : "Sin filtros aplicados",
        summary,
      });
    } catch (error) {
      console.error(
        "Error en vista previa de movimientos de componentes:",
        error
      );
      res.status(500).json({
        error: "Error obteniendo vista previa",
        details: error.message,
      });
    }
  }

  // Vista previa de préstamos no devueltos
  async getNotReturnedPreview(req, res) {
    try {
      const filters = ReportController.processFilters(req.query);

      // Obtener préstamos no devueltos usando los filtros
      const notReturnedLoans = await loanModel.getNotReturnedLoans(filters);

      if (!notReturnedLoans.length) {
        return res.status(200).json({
          headers: [],
          data: [],
        });
      }

      // Preparar datos para la vista previa
      const headers = [
        "Usuario",
        "Componente",
        "Fecha Préstamo",
        "Días Transcurridos",
        "Estado Final",
        "Detalles",
      ];

      const data = notReturnedLoans.map((loan) => {
        const daysDiff = Math.floor(
          (new Date() - new Date(loan.startDate)) / (1000 * 60 * 60 * 24)
        );

        return [
          loan.user.name,
          loan.component.name,
          new Date(loan.startDate).toLocaleDateString(),
          daysDiff.toString(),
          "No Devuelto",
          loan.request.adminNotes || "Sin observaciones",
        ];
      });

      // Agregar mensaje sobre los filtros aplicados
      const filterSummary = [];
      if (filters.startDate)
        filterSummary.push(
          `Desde: ${new Date(filters.startDate).toLocaleDateString()}`
        );
      if (filters.endDate)
        filterSummary.push(
          `Hasta: ${new Date(filters.endDate).toLocaleDateString()}`
        );
      if (filters.userId) {
        const userName = notReturnedLoans.find(
          (l) => l.userId === filters.userId
        )?.user.name;
        filterSummary.push(`Usuario: ${userName || filters.userId}`);
      }

      // Preparar resumen estadístico
      const summary = {
        totalPrestamos: notReturnedLoans.length,
        promedioTiempoTranscurrido: Math.floor(
          notReturnedLoans.reduce((acc, loan) => {
            const days = Math.floor(
              (new Date() - new Date(loan.startDate)) / (1000 * 60 * 60 * 24)
            );
            return acc + days;
          }, 0) / notReturnedLoans.length
        ),
        usuariosAfectados: new Set(notReturnedLoans.map((loan) => loan.userId))
          .size,
      };

      res.status(200).json({
        headers,
        data,
        filterSummary: filterSummary.length
          ? filterSummary.join(" | ")
          : "Sin filtros aplicados",
        summary,
      });
    } catch (error) {
      console.error("Error en vista previa de préstamos no devueltos:", error);
      res.status(500).json({
        error: "Error obteniendo vista previa",
        details: error.message,
      });
    }
  }
}

module.exports = new ReportController();