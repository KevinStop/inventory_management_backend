const express = require('express');
const router = express.Router();
const requestController = require('../controllers/requestController');
const upload = require('../config/uploadConfig');
const { authenticateToken } = require('../middleware/authMiddleware');

// Middleware para validar datos de solicitud
const validateRequestData = (req, res, next) => {
  let { userId, requestDetails, typeRequest } = req.body;

  if (!userId) {
    return res.status(400).json({ error: 'Usuario no autenticado.' });
  }

  // Validar tipo de solicitud
  if (!typeRequest) {
    return res.status(400).json({ error: 'El tipo de solicitud es obligatorio.' });
  }

  // Intentar parsear requestDetails si es string
  if (typeof requestDetails === 'string') {
    try {
      requestDetails = JSON.parse(requestDetails);
      req.body.requestDetails = requestDetails;
    } catch (error) {
      return res.status(400).json({ error: 'Error al procesar los detalles de la solicitud.' });
    }
  }

  // Validar estructura de requestDetails
  if (!Array.isArray(requestDetails) || requestDetails.length === 0) {
    return res.status(400).json({ error: 'Debe incluir al menos un componente en la solicitud.' });
  }

  // Validar que cada detalle tenga la estructura correcta
  const isValidDetail = requestDetails.every(detail => 
    detail.componentId && 
    typeof detail.quantity === 'number' && 
    detail.quantity > 0
  );

  if (!isValidDetail) {
    return res.status(400).json({ 
      error: 'Los detalles de la solicitud deben incluir componentId y quantity válidos.' 
    });
  }

  next();
};

/**
 * @swagger
 * /requests:
 *   post:
 *     summary: Crear una nueva solicitud de préstamo
 *     tags: [Solicitudes]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *               - typeRequest
 *               - requestDetails
 *             properties:
 *               userId:
 *                 type: integer
 *                 description: ID del usuario solicitante
 *               typeRequest:
 *                 type: string
 *                 description: Tipo de solicitud
 *               description:
 *                 type: string
 *                 description: Descripción de la solicitud
 *               returnDate:
 *                 type: string
 *                 format: date
 *                 description: Fecha de devolución esperada
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: Archivo adjunto (opcional)
 *               requestDetails:
 *                 type: array
 *                 description: Detalles de los componentes solicitados
 *                 items:
 *                   type: object
 *                   properties:
 *                     componentId:
 *                       type: integer
 *                     quantity:
 *                       type: integer
 *     responses:
 *       201:
 *         description: Solicitud creada exitosamente
 *       400:
 *         description: Datos inválidos o componentes no disponibles
 *       401:
 *         description: No autorizado
 */
router.post('/', authenticateToken, upload.single('file'), validateRequestData, requestController.createRequest);

/**
 * @swagger
 * /requests/{id}/reject:
 *   post:
 *     summary: Rechazar una solicitud
 *     tags: [Solicitudes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - rejectionNotes
 *             properties:
 *               rejectionNotes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Solicitud rechazada exitosamente
 *       401:
 *         description: No autorizado
 */
router.post('/:id/reject', authenticateToken, requestController.rejectRequest);

/**
 * @swagger
 * /requests:
 *   get:
 *     summary: Obtener solicitudes filtradas
 *     tags: [Solicitudes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: userId
 *         schema:
 *           type: integer
 *         description: Filtrar por ID de usuario
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pendiente, prestamo, finalizado, no_devuelto]
 *         description: Filtrar por estado
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *         description: Filtrar por estado activo/inactivo
 *     responses:
 *       200:
 *         description: Lista de solicitudes
 *       401:
 *         description: No autorizado
 */
router.get('/', authenticateToken, requestController.getFilteredRequests);

/**
 * @swagger
 * /requests/{id}:
 *   get:
 *     summary: Obtener una solicitud por ID
 *     tags: [Solicitudes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la solicitud
 *     responses:
 *       200:
 *         description: Solicitud encontrada
 *       401:
 *         description: No autorizado
 *       404:
 *         description: Solicitud no encontrada
 */
router.get('/:id', authenticateToken, requestController.getRequestById);

/**
 * @swagger
 * /requests/not-returned:
 *   get:
 *     summary: Obtener préstamos no devueltos
 *     tags: [Solicitudes]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de préstamos no devueltos
 *       401:
 *         description: No autorizado
 */
router.get('/not-returned', authenticateToken, requestController.getNotReturnedLoans);

/**
 * @swagger
 * /requests/{id}:
 *   put:
 *     summary: Aceptar una solicitud de préstamo
 *     tags: [Solicitudes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la solicitud
 *     responses:
 *       200:
 *         description: Solicitud aceptada exitosamente
 *       400:
 *         description: La solicitud no está en estado pendiente
 *       401:
 *         description: No autorizado
 *       404:
 *         description: Solicitud no encontrada
 */
router.put('/:id', authenticateToken, requestController.acceptRequest);

/**
 * @swagger
 * /requests/{id}/finalize:
 *   put:
 *     summary: Finalizar una solicitud de préstamo
 *     tags: [Solicitudes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               adminNotes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Solicitud finalizada exitosamente
 *       401:
 *         description: No autorizado
 */
router.put('/:id/finalize', authenticateToken, requestController.finalizeRequest);

/**
 * @swagger
 * /requests/{id}/not-returned:
 *   put:
 *     summary: Marcar una solicitud como no devuelta
 *     tags: [Solicitudes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               adminNotes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Solicitud marcada como no devuelta
 *       401:
 *         description: No autorizado
 */
router.put('/:id/not-returned', authenticateToken, requestController.markAsNotReturned);

/**
 * @swagger
 * /requests/{id}/return-date:
 *   put:
 *     summary: Actualizar fecha de devolución de una solicitud
 *     tags: [Solicitudes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - newReturnDate
 *             properties:
 *               newReturnDate:
 *                 type: string
 *                 format: date
 *     responses:
 *       200:
 *         description: Fecha de devolución actualizada exitosamente
 *       401:
 *         description: No autorizado
 */
router.put('/:id/return-date', authenticateToken, requestController.updateReturnDate);

/**
 * @swagger
 * /requests/{id}:
 *   delete:
 *     summary: Eliminar una solicitud
 *     tags: [Solicitudes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Solicitud eliminada exitosamente
 *       400:
 *         description: No se puede eliminar la solicitud
 *       401:
 *         description: No autorizado
 */
router.delete('/:id', authenticateToken, requestController.deleteRequest);

module.exports = router;