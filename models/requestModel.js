const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const componentModel = require("./componentModel");
const loanHistoryService = require("./loanModel");

// Crear una solicitud con verificación de disponibilidad
const createRequest = async (data, requestDetails) => {
  if (!data.userId) {
    throw new Error("El campo userId es obligatorio para crear una solicitud.");
  }

  try {
    await Promise.all(
      requestDetails.map(async (detail) => {
        await componentModel.calculateAvailableQuantity(
          detail.componentId,
          detail.quantity
        );
      })
    );

    // Si todas las verificaciones pasan, crear la solicitud
    const request = await prisma.$transaction(async (prisma) => {
      return await prisma.request.create({
        data: {
          user: { connect: { userId: data.userId } },
          typeRequest: data.typeRequest,
          status: data.status || "pendiente",
          description: data.description || null,
          fileUrl: data.fileUrl || null,
          returnDate: data.returnDate,
          responsible: data.responsible,
          requestDetails: {
            create: requestDetails.map((detail) => ({
              component: { connect: { id: detail.componentId } },
              quantity: detail.quantity,
            })),
          },
        },
        include: {
          requestDetails: {
            include: {
              component: true,
            },
          },
        },
      });
    });

    return request;
  } catch (error) {
    throw error;
  }
};

// Obtener todas las solicitudes activas
const getFilteredRequests = async (filters = {}) => {
  try {
    const { userId, status, isActive } = filters;

    const requests = await prisma.request.findMany({
      where: {
        ...(userId && { userId }), 
        ...(status && { status }), 
        ...(isActive !== undefined && { isActive }), 
      },
      include: {
        user: true, 
        requestDetails: {
          include: {
            component: true, 
          },
        },
      },
    });

    return requests;
  } catch (error) {
    console.error("Error en getFilteredRequests:", error.message);
    throw new Error("Error al obtener las solicitudes con filtros.");
  }
};

// Obtener una solicitud por ID
const getRequestById = async (id) => {
  try {
    const request = await prisma.request.findUnique({
      where: { requestId: Number(id) },
      include: {
        user: true,
        requestDetails: {
          include: {
            component: {
              include: {
                category: true,
              },
            },
          },
        },
      },
    });
    return request;
  } catch (error) {
    console.error("Error en getRequestById:", error.message);
    throw new Error("Error al obtener la solicitud");
  }
};

// Actualizar una solicitud por ID (aceptar solicitud)
const acceptRequest = async (requestId) => {
  try {
    // Aumentamos el timeout de la transacción
    return await prisma.$transaction(
      async (tx) => {
        // Obtener la solicitud con sus detalles en una sola consulta
        const request = await tx.request.findUnique({
          where: { requestId },
          include: {
            requestDetails: true,
          },
        });

        if (!request) {
          throw new Error(
            `No se encontró la solicitud con el ID ${requestId}.`
          );
        }

        if (request.status !== "pendiente") {
          throw new Error(
            "Solo las solicitudes en estado pendiente pueden ser aceptadas."
          );
        }

        // Verificar el periodo académico activo
        const activePeriod = await tx.academicPeriod.findFirst({
          where: { isActive: true },
        });

        if (!activePeriod) {
          throw new Error(
            "No hay un periodo académico activo. No se puede aceptar la solicitud."
          );
        }

        // Crear todos los registros en paralelo
        await Promise.all([
          tx.request.update({
            where: { requestId },
            data: { status: "prestamo" },
          }),

          // Crear registros de préstamo
          tx.loanHistory.createMany({
            data: request.requestDetails.map((detail) => ({
              requestId,
              userId: request.userId,
              componentId: detail.componentId,
              startDate: new Date(),
              status: "no_devuelto",
            })),
          }),

          // Crear el registro del período
          tx.requestPeriod.create({
            data: {
              requestId,
              academicPeriodId: activePeriod.id,
              typeDate: "inicio",
              requestPeriodDate: new Date(),
            },
          }),
        ]);

        // Retornar la solicitud actualizada
        return await tx.request.findUnique({
          where: { requestId },
          include: {
            requestDetails: true,
            relatedPeriods: true,
          },
        });
      },
      {
        timeout: 10000, 
      }
    ); 
  } catch (error) {
    throw error;
  }
};

// Eliminar una solicitud por ID (con transacción)
const deleteRequest = async (requestId, userId, role) => {
  try {
    // Verificar permisos y obtener la solicitud con todos sus detalles
    const request = await prisma.request.findUnique({
      where: { requestId },
      include: {
        requestDetails: true,
        loanHistories: true,
        relatedPeriods: true, // Cambiado de requestPeriods a relatedPeriods
      },
    });

    if (!request) {
      throw new Error(`No se encontró la solicitud con el ID ${requestId}.`);
    }

    // Verificaciones de permisos mejoradas
    if (role === "user") {
      if (request.userId !== userId) {
        throw new Error("No tienes permiso para eliminar esta solicitud.");
      }
      if (request.status !== "pendiente") {
        throw new Error(
          'Solo puedes eliminar solicitudes en estado "pendiente".'
        );
      }
    }

    // Si es admin, verificar condiciones adicionales
    if (role === "admin") {
      if (request.status === "prestamo") {
        throw new Error(
          "No se puede eliminar una solicitud en estado de préstamo activo."
        );
      }
    }

    // Manejar como transacción
    const result = await prisma.$transaction(async (prisma) => {
      // Registrar la eliminación en el historial si hay préstamos asociados
      if (request.loanHistories.length > 0) {
        await prisma.loanHistory.updateMany({
          where: { requestId },
          data: {
            status: "devuelto",
            endDate: new Date(),
          },
        });
      }

      // Eliminar registros relacionados en orden específico
      // 1. Eliminar detalles de la solicitud
      await prisma.requestDetail.deleteMany({
        where: { requestId },
      });

      // 2. Eliminar períodos relacionados (usando el nombre correcto)
      await prisma.requestPeriod.deleteMany({
        where: { requestId },
      });

      // 3. Eliminar históricos de préstamo
      await prisma.loanHistory.deleteMany({
        where: { requestId },
      });

      // 4. Finalmente eliminar la solicitud principal
      const deletedRequest = await prisma.request.delete({
        where: { requestId },
      });

      return {
        success: true,
        message: "Solicitud eliminada exitosamente",
        deletedRequest,
      };
    });

    return result;
  } catch (error) {
    throw error;
  }
};

// Finalizar una solicitud
const finalizeRequest = async (requestId, adminNotes = null) => {
  try {
    const result = await prisma.$transaction(async (tx) => {
      const existingRequest = await tx.request.findUnique({
        where: { requestId },
      });

      if (!existingRequest) {
        throw new Error(`No se encontró la solicitud con el ID ${requestId}.`);
      }

      if (existingRequest.status === "finalizado") {
        throw new Error("La solicitud ya está finalizada.");
      }

      if (existingRequest.status === "no_devuelto") {
        // Solo actualizar isActive y adminNotes si está en no_devuelto
        const updatedRequest = await tx.request.update({
          where: { requestId },
          data: {
            isActive: false,
            adminNotes: adminNotes || "Finalizado desde estado no devuelto",
          },
        });

        const activePeriod = await tx.academicPeriod.findFirst({
          where: { isActive: true },
        });

        if (!activePeriod) {
          throw new Error("No hay un periodo académico activo.");
        }

        const requestPeriod = await tx.requestPeriod.create({
          data: {
            requestId: updatedRequest.requestId,
            academicPeriodId: activePeriod.id,
            typeDate: "fin",
            requestPeriodDate: new Date(),
          },
        });

        return { updatedRequest, requestPeriod };
      }

      // Proceder con la lógica normal para otros estados
      validateStatusTransition(existingRequest.status, "finalizado");

      const activePeriod = await tx.academicPeriod.findFirst({
        where: { isActive: true },
      });

      if (!activePeriod) {
        throw new Error("No hay un periodo académico activo.");
      }

      const updatedRequest = await tx.request.update({
        where: { requestId },
        data: {
          status: "finalizado",
          isActive: false,
          adminNotes: adminNotes || "Finalizado normalmente",
        },
      });

      await loanHistoryService.updateLoanStatus(requestId, "devuelto", {
        wasReturned: true,
        finalStatus: "finalizado_normal",
        notes: adminNotes || "Finalizado normalmente",
      });

      const requestPeriod = await tx.requestPeriod.create({
        data: {
          requestId: updatedRequest.requestId,
          academicPeriodId: activePeriod.id,
          typeDate: "fin",
          requestPeriodDate: new Date(),
        },
      });

      return { updatedRequest, requestPeriod };
    });

    return result;
  } catch (error) {
    throw error;
  }
};

// Modelo
const updateReturnDate = async (requestId, userId, role, newReturnDate) => {
  try {
    return await prisma.$transaction(async (tx) => {
      const request = await checkRequestPermissions(requestId, userId, role);

      if (request.status !== "prestamo") {
        throw new Error('Solo se puede actualizar la fecha de retorno para solicitudes en estado "prestamo".');
      }

      // Obtener el historial de préstamo activo
      const loanHistory = await tx.loanHistory.findFirst({
        where: {
          requestId,
          endDate: null,
        },
      });

      if (!loanHistory) {
        throw new Error("No se encontró un préstamo activo para esta solicitud.");
      }

      // Verificar si ya se actualizó la fecha usando los períodos de solicitud
      const existingUpdatePeriod = await tx.requestPeriod.findFirst({
        where: {
          requestId,
          typeDate: "actualizacion_retorno"
        }
      });

      if (existingUpdatePeriod) {
        throw new Error("La fecha de retorno ya ha sido modificada anteriormente.");
      }

      // Obtener período académico activo
      const activePeriod = await tx.academicPeriod.findFirst({
        where: { isActive: true }
      });

      if (!activePeriod) {
        throw new Error("No hay un periodo académico activo.");
      }

      // Actualizar la fecha de retorno
      const updatedRequest = await tx.request.update({
        where: { requestId },
        data: {
          returnDate: new Date(newReturnDate),
        },
      });

      // Registrar el período de actualización
      await tx.requestPeriod.create({
        data: {
          requestId,
          academicPeriodId: activePeriod.id,
          typeDate: "actualizacion_retorno",
          requestPeriodDate: new Date()
        }
      });

      return updatedRequest;
    });
  } catch (error) {
    throw error;
  }
};

const checkRequestPermissions = async (requestId, userId, role) => {
  try {
    const request = await prisma.request.findUnique({
      where: { requestId },
    });

    if (!request) {
      throw new Error(`No se encontró la solicitud con el ID ${requestId}.`);
    }

    // Validar permisos
    if (role === "user" && request.userId !== userId) {
      throw new Error("No tienes permiso para modificar esta solicitud.");
    }

    if (role === "admin" && !request.isActive) {
      throw new Error("Solo se pueden modificar solicitudes activas.");
    }

    return request; // Devuelve la solicitud si pasa las validaciones
  } catch (error) {
    console.error("Error en checkRequestPermissions:", error.message);
    throw new Error("Permiso denegado: " + error.message);
  }
};

const validateStatusTransition = (currentStatus, newStatus) => {
  const validTransitions = {
    prestamo: ["finalizado", "no_devuelto"],
    no_devuelto: ["finalizado"],
    pendiente: ["prestamo"],
  };

  if (!validTransitions[currentStatus]?.includes(newStatus)) {
    throw new Error(
      `No se puede cambiar de estado ${currentStatus} a ${newStatus}`
    );
  }
};

// Método para marcar como no devuelto
const markAsNotReturned = async (requestId, adminNotes = null) => {
  try {
    const result = await prisma.$transaction(async (tx) => {
      // Verificar si la solicitud existe y está activa
      const existingRequest = await tx.request.findUnique({
        where: { requestId },
        include: {
          requestDetails: true,
        },
      });

      if (!existingRequest) {
        throw new Error(`No se encontró la solicitud con el ID ${requestId}.`);
      }

      // Validar la transición de estado
      validateStatusTransition(existingRequest.status, "no_devuelto");

      // Obtener el periodo académico activo
      const activePeriod = await tx.academicPeriod.findFirst({
        where: { isActive: true },
      });

      if (!activePeriod) {
        throw new Error("No hay un periodo académico activo.");
      }

      const defaultNote = "Componentes no devueltos";

      // Actualizar la solicitud
      const updatedRequest = await tx.request.update({
        where: { requestId },
        data: {
          status: "no_devuelto",
          adminNotes: adminNotes || defaultNote,
        },
      });

      // Actualizar LoanHistory
      await loanHistoryService.updateLoanStatus(requestId, "no_devuelto", {
        wasReturned: false,
        notes: adminNotes || defaultNote,
      });

      // Crear un nuevo registro en requestPeriod
      const requestPeriod = await tx.requestPeriod.create({
        data: {
          requestId: updatedRequest.requestId,
          academicPeriodId: activePeriod.id,
          typeDate: "no_devuelto",
          requestPeriodDate: new Date(),
        },
      });

      return { updatedRequest, requestPeriod };
    });

    return result;
  } catch (error) {
    console.error("Error en markAsNotReturned:", error.message);
    throw new Error("Error al marcar como no devuelto: " + error.message);
  }
};

const rejectRequest = async (requestId, adminId, rejectionNotes) => {
  try {
    const request = await prisma.request.findUnique({
      where: { requestId },
      include: {
        requestDetails: true,
        loanHistories: true,
        relatedPeriods: true,
      },
    });

    if (!request) {
      throw new Error(`No se encontró la solicitud con el ID ${requestId}.`);
    }

    if (request.status !== "pendiente") {
      throw new Error(
        'Solo se pueden rechazar solicitudes en estado "pendiente".'
      );
    }

    // Manejar como transacción
    const result = await prisma.$transaction(async (prisma) => {
      // Actualizar la solicitud a rechazada en lugar de eliminarla
      const rejectedRequest = await prisma.request.update({
        where: { requestId },
        data: {
          status: "finalizado",
          adminNotes: rejectionNotes,
          isActive: false,
          updatedAt: new Date(),
        },
        include: {
          user: true, // Incluir información del usuario para el correo
        },
      });

      return {
        success: true,
        message: "Solicitud rechazada exitosamente",
        rejectedRequest,
      };
    });

    return result;
  } catch (error) {
    console.error("Error en rejectRequest:", error.message);
    throw new Error("Error al rechazar la solicitud: " + error.message);
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
  checkRequestPermissions,
  validateStatusTransition,
  markAsNotReturned,
  rejectRequest,
};
