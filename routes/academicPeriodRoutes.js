const express = require('express');
const router = express.Router();
const academicPeriodController = require('../controllers/academicPeriodController');
const { authenticateToken } = require('../middleware/authMiddleware');

/**
 * @swagger
 * /academic-periods:
 *   post:
 *     summary: Crear un nuevo periodo académico
 *     tags: [Periodos Académicos]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - startDate
 *               - endDate
 *             properties:
 *               name:
 *                 type: string
 *                 description: Nombre del periodo (ej. "2024-1")
 *               startDate:
 *                 type: string
 *                 format: date
 *                 description: Fecha de inicio del periodo
 *               endDate:
 *                 type: string
 *                 format: date
 *                 description: Fecha de finalización del periodo
 *     responses:
 *       201:
 *         description: Periodo académico creado exitosamente
 *       400:
 *         description: Datos inválidos en la solicitud
 *       401:
 *         description: No autorizado
 */
router.post('/', authenticateToken, academicPeriodController.createAcademicPeriod);

/**
 * @swagger
 * /academic-periods:
 *   get:
 *     summary: Obtener todos los periodos académicos
 *     tags: [Periodos Académicos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: includeStats
 *         schema:
 *           type: boolean
 *         description: Incluir estadísticas de préstamos del periodo
 *     responses:
 *       200:
 *         description: Lista de periodos académicos
 *       401:
 *         description: No autorizado
 */
router.get('/', authenticateToken, academicPeriodController.getAllAcademicPeriods);

/**
 * @swagger
 * /academic-periods/{id}:
 *   get:
 *     summary: Obtener un periodo académico por ID
 *     tags: [Periodos Académicos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del periodo académico
 *     responses:
 *       200:
 *         description: Periodo académico encontrado
 *       401:
 *         description: No autorizado
 *       404:
 *         description: Periodo académico no encontrado
 */
router.get('/:id', authenticateToken, academicPeriodController.getAcademicPeriodById);

/**
 * @swagger
 * /academic-periods/{periodId}/reports:
 *   get:
 *     summary: Obtener reportes de un periodo académico
 *     tags: [Periodos Académicos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: periodId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del periodo académico
 *     responses:
 *       200:
 *         description: Reportes del periodo académico
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 statistics:
 *                   type: object
 *                   properties:
 *                     totalLoans:
 *                       type: integer
 *                     activeLoans:
 *                       type: integer
 *                     completedLoans:
 *                       type: integer
 *       401:
 *         description: No autorizado
 *       404:
 *         description: Periodo no encontrado
 */
router.get('/:periodId/reports', authenticateToken, academicPeriodController.getPeriodReports);

/**
 * @swagger
 * /academic-periods/{id}:
 *   put:
 *     summary: Actualizar un periodo académico
 *     tags: [Periodos Académicos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del periodo académico
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               startDate:
 *                 type: string
 *                 format: date
 *               endDate:
 *                 type: string
 *                 format: date
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Periodo académico actualizado exitosamente
 *       401:
 *         description: No autorizado
 *       404:
 *         description: Periodo académico no encontrado
 */
router.put('/:id', authenticateToken, academicPeriodController.updateAcademicPeriod);

/**
 * @swagger
 * /academic-periods/{id}/activate:
 *   put:
 *     summary: Activar un periodo académico específico
 *     tags: [Periodos Académicos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del periodo académico a activar
 *     responses:
 *       200:
 *         description: Periodo académico activado exitosamente
 *       401:
 *         description: No autorizado
 *       404:
 *         description: Periodo académico no encontrado
 */
router.put('/:id/activate', authenticateToken, academicPeriodController.setActiveAcademicPeriod);

/**
 * @swagger
 * /academic-periods/{id}:
 *   delete:
 *     summary: Eliminar un periodo académico
 *     tags: [Periodos Académicos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del periodo académico
 *     responses:
 *       200:
 *         description: Periodo académico eliminado exitosamente
 *       401:
 *         description: No autorizado
 *       404:
 *         description: Periodo académico no encontrado
 *       400:
 *         description: No se puede eliminar un período con préstamos activos
 */
router.delete('/:id', authenticateToken, academicPeriodController.deleteAcademicPeriod);

module.exports = router;