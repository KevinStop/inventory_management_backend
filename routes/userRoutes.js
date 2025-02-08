const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const upload = require('../config/uploadConfig');
const { authenticateToken } = require('../middleware/authMiddleware');

/**
 * @swagger
 * /users/register:
 *   post:
 *     summary: Registrar un nuevo usuario
 *     tags: [Usuarios]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - name
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Email del usuario
 *               password:
 *                 type: string
 *                 format: password
 *                 description: Contraseña del usuario (mínimo 6 caracteres)
 *               name:
 *                 type: string
 *                 description: Nombre del usuario
 *               imageUrl:
 *                 type: string
 *                 description: URL de la imagen de perfil (opcional)
 *     responses:
 *       201:
 *         description: Usuario registrado exitosamente
 *       400:
 *         description: Datos inválidos en la solicitud
 *       409:
 *         description: El email ya está registrado
 */
router.post('/register', userController.registerUser);

/**
 * @swagger
 * /users/login:
 *   post:
 *     summary: Iniciar sesión
 *     tags: [Usuarios]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 format: password
 *     responses:
 *       200:
 *         description: Login exitoso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                 user:
 *                   type: object
 *       401:
 *         description: Credenciales inválidas
 */
router.post('/login', userController.loginUser);

/**
 * @swagger
 * /users/logout:
 *   post:
 *     summary: Cerrar sesión
 *     tags: [Usuarios]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Sesión cerrada exitosamente
 *       401:
 *         description: No autorizado
 */
router.post('/logout', authenticateToken, userController.logoutUser);

/**
 * @swagger
 * /users/reset-password:
 *   post:
 *     summary: Solicitar restablecimiento de contraseña
 *     tags: [Usuarios]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *     responses:
 *       200:
 *         description: Se ha enviado un correo con la nueva contraseña temporal
 *       404:
 *         description: No existe un usuario con ese email
 */
router.post('/reset-password', userController.requestPasswordReset);

/**
 * @swagger
 * /users/me:
 *   get:
 *     summary: Obtener información del usuario autenticado
 *     tags: [Usuarios]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Información del usuario actual
 *       401:
 *         description: No autorizado
 */
router.get('/me', authenticateToken, userController.getAuthenticatedUser);

/**
 * @swagger
 * /users/all:
 *   get:
 *     summary: Obtener todos los usuarios activos
 *     tags: [Usuarios]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de usuarios activos
 *       401:
 *         description: No autorizado
 */
router.get('/all', authenticateToken, userController.getAllUsers);

/**
 * @swagger
 * /users/{id}:
 *   put:
 *     summary: Actualizar información del usuario
 *     tags: [Usuarios]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del usuario
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               password:
 *                 type: string
 *               image:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Usuario actualizado exitosamente
 *       401:
 *         description: No autorizado
 *       404:
 *         description: Usuario no encontrado
 */
router.put('/:id', authenticateToken, upload.single('image'), userController.updateUser);

/**
 * @swagger
 * /users/{id}/deactivate:
 *   put:
 *     summary: Desactivar usuario
 *     tags: [Usuarios]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del usuario a desactivar
 *     responses:
 *       200:
 *         description: Usuario desactivado exitosamente
 *       401:
 *         description: No autorizado
 *       404:
 *         description: Usuario no encontrado
 */
router.put('/:id/deactivate', authenticateToken, userController.deactivateUser);

module.exports = router;