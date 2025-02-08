const express = require('express');
const router = express.Router();
const componentMovementController = require('../controllers/componentMovementController');
const { authenticateToken } = require('../middleware/authMiddleware');

/**
 * @swagger
 * /component-movements:
 *   post:
 *     summary: Crear un nuevo movimiento de componente
 *     tags: [Movimientos de Componentes]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - componentId
 *               - quantity
 *               - reason
 *               - movementType
 *             properties:
 *               componentId:
 *                 type: integer
 *                 description: ID del componente
 *               quantity:
 *                 type: integer
 *                 description: Cantidad del movimiento (debe ser positivo)
 *               reason:
 *                 type: string
 *                 description: Razón del movimiento
 *               movementType:
 *                 type: string
 *                 enum: [ingreso, egreso]
 *                 description: Tipo de movimiento
 *               academicPeriodId:
 *                 type: integer
 *                 description: ID del periodo académico (opcional)
 *     responses:
 *       201:
 *         description: Movimiento creado exitosamente
 *       400:
 *         description: Datos inválidos o cantidad insuficiente para egreso
 *       401:
 *         description: No autorizado
 *       404:
 *         description: Componente no encontrado o periodo académico no encontrado
 */
router.post('/', authenticateToken, componentMovementController.createComponentMovement);

/**
 * @swagger
 * /component-movements:
 *   get:
 *     summary: Obtener movimientos de componentes
 *     tags: [Movimientos de Componentes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: componentId
 *         schema:
 *           type: integer
 *         description: Filtrar por ID de componente
 *       - in: query
 *         name: movementType
 *         schema:
 *           type: string
 *           enum: [ingreso, egreso]
 *         description: Filtrar por tipo de movimiento
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Fecha inicial para filtrar
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Fecha final para filtrar
 *       - in: query
 *         name: requestId
 *         schema:
 *           type: integer
 *         description: Filtrar por ID de solicitud
 *     responses:
 *       200:
 *         description: Lista de movimientos
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   movementId:
 *                     type: integer
 *                   componentId:
 *                     type: integer
 *                   quantity:
 *                     type: integer
 *                   reason:
 *                     type: string
 *                   movementType:
 *                     type: string
 *                   movementDate:
 *                     type: string
 *                     format: date-time
 *                   component:
 *                     type: object
 *                   academicPeriod:
 *                     type: object
 *       401:
 *         description: No autorizado
 */
router.get('/', authenticateToken, componentMovementController.getComponentMovements);

module.exports = router;