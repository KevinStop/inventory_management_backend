const express = require("express");
const router = express.Router();
const reportController = require("../src/reports/controllers/reportController");
const {
  authenticateToken,
  authorizeRoles,
} = require("../middleware/authMiddleware");

// Ruta para obtener tipos de reportes disponibles
router.get("/available", reportController.getAvailableReports);

// Ruta para validar filtros
router.post("/validate-filters", reportController.validateReportFilters);

// 1. Reporte de préstamos por período
router.get(
  "/loans-by-period",

  reportController.generateLoansByPeriodReport
);

// 2. Reporte de componentes más solicitados
router.get(
  "/most-requested-components",

  reportController.generateMostRequestedComponentsReport
);

// 3. Reporte de préstamos activos
router.get(
  "/active-loans",

  reportController.generateActiveLoansReport
);

// 4. Reporte de componentes con bajo stock
router.get(
  "/low-stock",

  reportController.generateLowStockReport
);

// 5. Reporte de movimientos de componentes
router.get(
  "/component-movements",

  reportController.generateComponentMovementsReport
);

// 6. Reporte de préstamos no devueltos
router.get(
  "/not-returned",

  reportController.generateNotReturnedReport
);

// Agregar las nuevas rutas de vista previa
router.get(
  "/loans-by-period/preview",

  reportController.getLoansByPeriodPreview
);

// Ruta para vista previa de componentes más solicitados
router.get(
  "/most-requested-components/preview",

  reportController.getMostRequestedComponentsPreview
);

// Ruta para vista previa de préstamos activos
router.get(
  "/active-loans/preview",

  reportController.getActiveLoansPreview
);

// Ruta para vista previa de componentes con bajo stock
router.get(
  "/low-stock/preview",

  reportController.getLowStockPreview
);

// Ruta para vista previa de movimientos de componentes
router.get(
  "/component-movements/preview",
  reportController.getComponentMovementsPreview
);

// Ruta para vista previa de préstamos no devueltos
router.get("/not-returned/preview", reportController.getNotReturnedPreview);

module.exports = router;
