const jwt = require("jsonwebtoken");
const path = require("path");
const upload = require("../config/uploadConfig");
const userModel = require("../models/userModel");
const EmailService = require("../src/mailer/emailService");
const { blacklistToken } = require("../middleware/blacklistedTokens");
const { generateToken, setTokenCookie } = require("../Utils/tokenUtils");

// Crear un usuario (manual)
const registerUser = async (req, res) => {
  try {
    const data = req.body;

    if (req.file) {
      data.imageUrl = `/uploads/users/${req.file.filename}`;
    }

    const user = await userModel.createUser(data);

    res.status(201).json({
      message: "Usuario registrado exitosamente",
      userId: user.userId,
    });
  } catch (error) {
    console.error("Error en registro de usuario:", error);
    res.status(500).json({ error: error.message });
  }
};

// Iniciar sesión (manual)
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await userModel.verifyUserCredentials(email, password);

    const token = generateToken({
      userId: user.userId,
      email: user.email,
      role: user.role,
    });
    setTokenCookie(res, token);

    res.status(200).json({ user });
  } catch (error) {
    res.status(401).json({ error: error.message });
  }
};

// Actualizar un usuario (solo el propio usuario o un admin)
const updateUser = async (req, res) => {
  const { id } = req.params;
  const data = req.body;

  if (req.user.userId !== Number(id) && req.user.role !== "admin") {
    return res
      .status(403)
      .json({ message: "No tienes permisos para realizar esta acción" });
  }

  try {
    if (req.file) {
      data.newImageUrl = `/uploads/users/${req.file.filename}`;
    }

    const updatedUser = await userModel.updateUser(id, data);

    res
      .status(200)
      .json({ message: "Usuario actualizado exitosamente", user: updatedUser });
  } catch (error) {
    console.error("Error al actualizar el usuario:", error.message);
    res.status(500).json({ error: error.message });
  }
};

// Desactivar un usuario (solo el propio usuario o un admin)
const deactivateUser = async (req, res) => {
  const { id } = req.params;

  if (req.user.userId !== Number(id) && req.user.role !== "admin") {
    return res
      .status(403)
      .json({ message: "No tienes permisos para realizar esta acción" });
  }

  try {
    const user = await userModel.getUserById(id);

    if (!user) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    const deactivatedUser = await userModel.deactivateUser(id);
    res
      .status(200)
      .json({
        message: "Usuario desactivado exitosamente",
        user: deactivatedUser,
      });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const logoutUser = (req, res) => {
  const token = req.cookies?.authToken;
  if (!token) {
    return res
      .status(400)
      .json({ message: "No se proporcionó un token para cerrar sesión" });
  }

  blacklistToken(token); 
  res.clearCookie("authToken"); 
  res.status(200).json({ message: "Sesión cerrada correctamente" });
};

const extendSession = (req, res) => {
  try {
    const token = req.cookies?.authToken;
    if (!token) {
      return res.status(401).json({ message: "Token no proporcionado" });
    }

    const user = jwt.verify(token, process.env.JWT_SECRET);

    const newToken = generateToken({
      userId: user.userId,
      email: user.email,
      role: user.role,
    });
    setTokenCookie(res, newToken);

    res.status(200).json({ message: "Sesión extendida exitosamente" });
  } catch (error) {
    console.error("Error al extender la sesión:", error);
    res.status(403).json({ message: "Token inválido o expirado" });
  }
};

const getAuthenticatedUser = async (req, res) => {
  try {
    const { userId } = req.user; 

    const user = await userModel.getUserById(userId);

    res.status(200).json(user);
  } catch (error) {
    console.error("Error al obtener el usuario autenticado:", error);
    res
      .status(500)
      .json({
        message: error.message || "Error al obtener la información del usuario",
      });
  }
};

const getSessionTime = (req, res) => {
  try {
    const token = req.cookies?.authToken;
    if (!token) {
      return res.status(401).json({ message: "Token no proporcionado." });
    }

    const decodedToken = jwt.decode(token);

    if (!decodedToken || !decodedToken.exp) {
      return res.status(400).json({ message: "Token inválido." });
    }

    const currentTime = Math.floor(Date.now() / 1000); 
    const remainingTime = (decodedToken.exp - currentTime) * 1000; 

    if (remainingTime <= 0) {
      return res.status(401).json({ message: "La sesión ha expirado." });
    }

    res.status(200).json({ remainingTime });
  } catch (error) {
    console.error("Error al obtener el tiempo restante de la sesión:", error);
    res.status(500).json({ message: "Error al procesar la solicitud." });
  }
};

const getAllUsers = async (req, res) => {
  try {
    const users = await userModel.getAllUsers();
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const requestPasswordReset = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ 
        error: "Debe proporcionar un correo electrónico" 
      });
    }

    const { user, temporalPassword } = await userModel.requestPasswordReset(email);

    // Enviar correo con la contraseña temporal
    await EmailService.sendPasswordResetEmail(email, temporalPassword);

    res.status(200).json({
      message: "Se ha enviado un correo con las instrucciones para recuperar su contraseña"
    });

  } catch (error) {
    console.error("Error en requestPasswordReset:", error);
    res.status(error.message.includes("No existe ningún usuario") ? 404 : 500)
      .json({ error: error.message });
  }
};

module.exports = {
  registerUser,
  loginUser,
  updateUser,
  deactivateUser,
  logoutUser,
  extendSession,
  getAuthenticatedUser,
  getSessionTime,
  getAllUsers,
  requestPasswordReset
};
