const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const requestModel = require("../models/requestModel");
const componentModel = require("../models/componentModel");
const loanHistoryService = require("../models/loanModel");
const EmailService = require("../src/mailer/emailService");
const path = require('path');
const fs = require('fs');

// Crear una solicitud con verificación de disponibilidad
const createRequest = async (req, res) => {
  let { userId, requestDetails, description, typeRequest, returnDate, responsible } =
    req.body;

  if (
    !userId ||
    !Array.isArray(requestDetails) ||
    requestDetails.length === 0 ||
    !typeRequest
  ) {
    return res.status(400).json({
      error: "Faltan campos obligatorios o el formato es incorrecto.",
    });
  }

  try {
    for (const detail of requestDetails) {
      try {
        await componentModel.calculateAvailableQuantity(
          detail.componentId,
          detail.quantity
        );
      } catch (error) {
        return res.status(400).json({
          error: `Error de disponibilidad: ${error.message}`,
          componentId: detail.componentId,
        });
      }
    }

    const data = {
      userId: parseInt(userId),
      description: description || null,
      typeRequest,
      returnDate: returnDate ? new Date(returnDate) : null,
      responsible: responsible,
      fileUrl: req.file ? `/uploads/comprobantes/${req.file.filename}` : null,
    };

    const newRequest = await requestModel.createRequest(data, requestDetails);
    await EmailService.sendNewRequestNotification(newRequest.requestId);
    return res.status(201).json(newRequest);
  } catch (error) {
    console.error("Error al crear la solicitud:", error.message);
    return res.status(500).json({ error: "Error interno del servidor" });
  }
};

// Obtener todas las solicitudes activas
const getFilteredRequests = async (req, res) => {
  try {
    const { userId, status, isActive } = req.query;

    const filters = {
      userId: userId ? parseInt(userId) : undefined,
      status: status || undefined,
      isActive: isActive !== undefined ? isActive === "true" : undefined,
    };

    const requests = await requestModel.getFilteredRequests(filters);

    return res.status(200).json(requests);
  } catch (error) {
    console.error("Error en getFilteredRequests:", error.message);
    return res.status(500).json({ error: "Error interno del servidor." });
  }
};

// Obtener una solicitud por ID
const getRequestById = async (req, res) => {
  const { id } = req.params;

  try {
    const request = await requestModel.getRequestById(id);
    if (!request) {
      return res.status(404).json({ error: "Solicitud no encontrada" });
    }
    return res.status(200).json(request); 
  } catch (error) {
    console.error("Error en getRequestById del controlador:", error.message);
    return res.status(500).json({ error: error.message });
  }
};

// Aceptar solicitud con verificación adicional de disponibilidad
const acceptRequest = async (req, res) => {
  const { id } = req.params;
  const requestId = parseInt(id);
  
  if (isNaN(requestId)) {
    return res.status(400).json({ error: "ID de solicitud inválido" });
  }

  try {
    const request = await requestModel.getRequestById(requestId);
    if (!request) {
      return res.status(404).json({ error: "Solicitud no encontrada" });
    }

    const stockErrors = [];

    for (const detail of request.requestDetails) {
      try {
        // Primero obtenemos el componente
        const component = await prisma.component.findUnique({
          where: { id: detail.componentId }
        });

        // Luego verificamos la disponibilidad
        await componentModel.checkComponentAvailability(
          detail.componentId,
          detail.quantity
        );
      } catch (error) {
        // Si no pudimos obtener el componente o hay error de disponibilidad
        const component = await prisma.component.findUnique({
          where: { id: detail.componentId }
        });

        stockErrors.push({
          componentId: detail.componentId,
          componentName: detail.component.name,
          requestedQuantity: detail.quantity,
          availableQuantity: component ? component.quantity : 0, // Validamos que exista el componente
          message: `No hay suficiente cantidad disponible del componente: ${detail.component.name}`
        });
      }
    }

    if (stockErrors.length > 0) {
      return res.status(400).json({
        error: "Errores de disponibilidad de stock",
        stockErrors: stockErrors
      });
    }

    const updatedRequest = await requestModel.acceptRequest(requestId);
    await EmailService.sendRequestApprovalNotification(updatedRequest.requestId);
    
    return res.status(200).json({
      message: "Solicitud aceptada con éxito.",
      updatedRequest,
    });
  } catch (error) {
    console.error("Error al aceptar la solicitud:", error.message);
    return res.status(500).json({ error: error.message });
  }
};

// Eliminar una solicitud
const deleteRequest = async (req, res) => {
  const { id } = req.params;
  const requestId = parseInt(id);
  const userId = req.user?.userId;
  const role = req.user?.role;

  if (isNaN(requestId)) {
    return res
      .status(400)
      .json({ error: "El ID de la solicitud debe ser un número válido." });
  }

  try {
    // Obtener la solicitud antes de eliminarla para acceder a su fileUrl
    const request = await requestModel.getRequestById(requestId);
    if (!request) {
      return res.status(404).json({ error: "Solicitud no encontrada" });
    }

    const activeLoans = await loanHistoryService.getCurrentLoans();
    const hasActiveLoans = activeLoans.some(
      (loan) => loan.requestId === requestId
    );

    if (hasActiveLoans) {
      return res.status(400).json({
        error: "No se puede eliminar una solicitud con préstamos activos.",
      });
    }

    // Eliminar el archivo si existe
    if (request.fileUrl) {
      const filePath = path.join(__dirname, '../uploads/comprobantes', path.basename(request.fileUrl));
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    const deletedRequest = await requestModel.deleteRequest(
      requestId,
      userId,
      role
    );

    return res.status(200).json({
      message: "Solicitud, archivo y registros relacionados eliminados con éxito.",
      deletedRequest,
    });
  } catch (error) {
    console.error("Error en deleteRequest:", error.message);
    const statusCode = error.message.includes("permisos") ? 403 : 500;
    return res.status(statusCode).json({ error: error.message });
  }
};

const rejectRequest = async (req, res) => {
  const { id } = req.params;
  const { rejectionNotes } = req.body;
  const requestId = parseInt(id);
  const adminId = req.user?.userId;

  if (isNaN(requestId)) {
    return res
      .status(400)
      .json({ error: "El ID de la solicitud debe ser un número válido." });
  }

  if (!rejectionNotes) {
    return res
      .status(400)
      .json({ error: "Debe proporcionar un motivo para el rechazo." });
  }

  try {
    // Obtener la solicitud antes de rechazarla para acceder a su fileUrl
    const request = await requestModel.getRequestById(requestId);
    if (!request) {
      return res.status(404).json({ error: "Solicitud no encontrada" });
    }

    // Eliminar el archivo si existe
    if (request.fileUrl) {
      const filePath = path.join(__dirname, '../uploads/comprobantes', path.basename(request.fileUrl));
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    const result = await requestModel.rejectRequest(
      requestId,
      adminId,
      rejectionNotes
    );

    await EmailService.sendRequestRejectionNotification(requestId);

    return res.status(200).json({
      message: "Solicitud rechazada y archivo eliminado exitosamente.",
      result,
    });
  } catch (error) {
    console.error("Error en rejectRequest:", error.message);
    return res.status(500).json({ error: error.message });
  }
};

// Finalizar una solicitud y reponer los componentes
const finalizeRequest = async (req, res) => {
  handleRequestAction(
    req,
    res,
    async (requestId, adminNotes) => {
      return await requestModel.finalizeRequest(requestId, adminNotes);
    },
    "finalizar la solicitud"
  );
};

// Controlador para marcar una solicitud como no devuelta
const markAsNotReturned = async (req, res) => {
  handleRequestAction(
    req,
    res,
    async (requestId, adminNotes) => {
      return await requestModel.markAsNotReturned(requestId, adminNotes);
    },
    "marcar como no devuelto"
  );
};

// Función auxiliar para manejar acciones comunes
const handleRequestAction = async (req, res, action, actionDescription) => {
  const { id } = req.params;
  const { adminNotes } = req.body;

  if (!id) {
    return res
      .status(400)
      .json({ error: "El ID de la solicitud no fue proporcionado." });
  }

  const requestId = parseInt(id, 10);

  if (isNaN(requestId)) {
    return res
      .status(400)
      .json({ error: "El ID de la solicitud debe ser un número válido." });
  }

  try {
    const result = await action(requestId, adminNotes);

    return res.status(200).json({
      message: `Solicitud ${actionDescription} con éxito.`,
      updatedRequest: result.updatedRequest,
      requestPeriod: result.requestPeriod,
    });
  } catch (error) {
    console.error(`Error al ${actionDescription}:`, error.message);
    return res
      .status(500)
      .json({ error: `Error al ${actionDescription}: ${error.message}` });
  }
};

const updateReturnDate = async (req, res) => {
  const { id } = req.params;
  const { newReturnDate } = req.body;

  if (!newReturnDate) {
    return res.status(400).json({ error: "La nueva fecha de retorno es obligatoria." });
  }

  const requestId = parseInt(id);
  const userId = req.user?.userId;
  const role = req.user?.role;

  if (isNaN(requestId)) {
    return res.status(400).json({ error: "El ID de la solicitud debe ser un número válido." });
  }

  try {
    const updatedRequest = await requestModel.updateReturnDate(
      requestId,
      userId,
      role,
      newReturnDate
    );

    return res.status(200).json({
      message: "Fecha de retorno actualizada con éxito.",
      updatedRequest,
    });
  } catch (error) {
    console.error("Error en updateReturnDate:", error.message);
    return res.status(400).json({ 
      error: error.message.replace("Error al actualizar la fecha de retorno: ", "")
    });
  }
};

const getNotReturnedLoans = async (req, res) => {
  try {
    const notReturnedLoans = await loanHistoryService.getNotReturnedLoans();
    res.status(200).json({ notReturnedLoans });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  createRequest,
  getFilteredRequests,
  getRequestById,
  acceptRequest,
  deleteRequest,
  finalizeRequest,
  updateReturnDate,
  markAsNotReturned,
  getNotReturnedLoans,
  rejectRequest,
};
