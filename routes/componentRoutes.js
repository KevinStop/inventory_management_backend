const express = require('express');
const router = express.Router();
const componentController = require('../controllers/componentController');
const upload = require('../config/uploadConfig');
const { authenticateToken } = require('../middleware/authMiddleware');

/**
 * @swagger
 * /components:
 *   post:
 *     summary: Crear un nuevo componente con movimiento inicial
 *     tags: [Componentes]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - quantity
 *               - categoryId
 *             properties:
 *               name:
 *                 type: string
 *                 description: Nombre del componente
 *               quantity:
 *                 type: integer
 *                 description: Cantidad inicial del componente
 *               description:
 *                 type: string
 *                 description: Descripción del componente
 *               categoryId:
 *                 type: integer
 *                 description: ID de la categoría
 *               isActive:
 *                 type: boolean
 *                 description: Estado del componente
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: Imagen del componente
 *               reason:
 *                 type: string
 *                 description: Razón del movimiento inicial
 *     responses:
 *       201:
 *         description: Componente creado exitosamente
 *       400:
 *         description: Datos inválidos
 *       401:
 *         description: No autorizado
 */
router.post('/', authenticateToken, upload.single('image'), componentController.createComponentWithMovement);

/**
 * @swagger
 * /components/filter:
 *   get:
 *     summary: Filtrar componentes por categorías
 *     tags: [Componentes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: categoryIds
 *         required: true
 *         schema:
 *           type: string
 *         description: IDs de categorías separados por coma (ej. "1,2,3")
 *     responses:
 *       200:
 *         description: Lista de componentes filtrados por categorías
 *       400:
 *         description: IDs de categorías inválidos
 *       401:
 *         description: No autorizado
 */
router.get('/filter', authenticateToken, componentController.filterComponentsByCategories);

/**
 * @swagger
 * /components/{id}:
 *   get:
 *     summary: Obtener un componente por ID
 *     tags: [Componentes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del componente
 *     responses:
 *       200:
 *         description: Componente encontrado
 *       401:
 *         description: No autorizado
 *       404:
 *         description: Componente no encontrado
 */
router.get('/:id', authenticateToken, componentController.getComponentById);

/**
 * @swagger
 * /components:
 *   get:
 *     summary: Obtener todos los componentes
 *     tags: [Componentes]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [activo, inactivo]
 *         description: Filtrar por estado del componente
 *       - in: query
 *         name: includeAvailable
 *         schema:
 *           type: boolean
 *         description: Incluir información de disponibilidad
 *     responses:
 *       200:
 *         description: Lista de componentes
 */
router.get('/', componentController.getAllComponents);

/**
 * @swagger
 * /components/{id}:
 *   put:
 *     summary: Actualizar un componente
 *     tags: [Componentes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del componente
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               categoryId:
 *                 type: integer
 *               isActive:
 *                 type: boolean
 *               image:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Componente actualizado exitosamente
 *       401:
 *         description: No autorizado
 *       404:
 *         description: Componente no encontrado
 */
router.put('/:id', authenticateToken, upload.single('image'), componentController.updateComponent);

/**
 * @swagger
 * /components/{id}:
 *   delete:
 *     summary: Eliminar un componente
 *     tags: [Componentes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del componente
 *     responses:
 *       200:
 *         description: Componente eliminado exitosamente
 *       400:
 *         description: No se puede eliminar el componente (tiene préstamos activos o solicitudes pendientes)
 *       401:
 *         description: No autorizado
 *       404:
 *         description: Componente no encontrado
 */
router.delete('/:id', authenticateToken, componentController.deleteComponent);

module.exports = router;