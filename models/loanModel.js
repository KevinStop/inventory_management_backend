const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const createLoanRecord = async ({ requestId, userId, componentDetails }) => {
  try {
    // Crear un registro por cada componente solicitado
    const loanRecords = componentDetails.map((detail) => ({
      requestId,
      userId,
      componentId: detail.componentId,
      startDate: new Date(),
      status: "no_devuelto",
      // Removemos quantity ya que no existe en el modelo
    }));

    // Si necesitamos crear múltiples registros para la cantidad solicitada
    const allLoanRecords = loanRecords.flatMap((record) => {
      const records = [];
      for (let i = 0; i < record.quantity; i++) {
        records.push({
          requestId: record.requestId,
          userId: record.userId,
          componentId: record.componentId,
          startDate: record.startDate,
          status: record.status,
        });
      }
      return records;
    });

    return await prisma.loanHistory.createMany({
      data: loanRecords,
    });
  } catch (error) {
    console.error("Error creating loan records:", error.message);
    throw new Error("Error creating loan records: " + error.message);
  }
};

const updateLoanStatus = async (requestId, status, statusHistory = null) => {
  try {
    const currentLoans = await prisma.loanHistory.findMany({
      where: { requestId },
      select: { status: true },
    });

    return await prisma.loanHistory.updateMany({
      where: { requestId },
      data: {
        status,
        ...(status === "devuelto"
          ? {
              endDate: new Date(),
              wasReturned: true,
              finalStatus: "finalizado_normal",
            }
          : {}),
        ...(status === "no_devuelto"
          ? {
              wasReturned: false,
              finalStatus: "finalizado_no_devuelto",
            }
          : {}),
        ...(statusHistory ? { statusHistory } : {}),
      },
    });
  } catch (error) {
    throw new Error(`Error updating loan status: ${error.message}`);
  }
};

// Reportes de préstamos
const getLoansByUser = async (userId) => {
  try {
    return await prisma.loanHistory.findMany({
      where: { userId },
      include: {
        component: true,
        request: true,
        user: true,
      },
    });
  } catch (error) {
    throw new Error(`Error getting loans by user: ${error.message}`);
  }
};

const getCurrentLoans = async (filters = {}) => {
  try {
    const { userId, componentId, startDate, endDate } = filters;

    // Construir la condición base
    const whereCondition = {
      OR: [
        { status: "no_devuelto" },
        {
          AND: [{ status: "devuelto" }, { wasReturned: false }],
        },
      ],
    };

    // Agregar filtros adicionales
    if (userId) {
      whereCondition.userId = parseInt(userId);
    }

    if (componentId) {
      whereCondition.componentId = parseInt(componentId);
    }

    // Agregar filtros de fecha
    if (startDate || endDate) {
      whereCondition.startDate = {};
      if (startDate) {
        whereCondition.startDate.gte = new Date(startDate);
      }
      if (endDate) {
        whereCondition.startDate.lte = new Date(endDate);
      }
    }

    return await prisma.loanHistory.findMany({
      where: whereCondition,
      include: {
        component: true,
        user: true,
        request: true,
      },
      orderBy: {
        startDate: "desc",
      },
    });
  } catch (error) {
    console.error("Error en getCurrentLoans:", error);
    throw new Error(`Error getting current loans: ${error.message}`);
  }
};

// Calcula la duración promedio considerando el tipo de finalización
const getAverageLoanDuration = async () => {
  try {
    const loans = await prisma.loanHistory.findMany({
      where: {
        OR: [
          {
            status: "devuelto",
            endDate: { not: null },
          },
          {
            status: "no_devuelto",
            request: { status: "no_devuelto" },
          },
        ],
      },
      select: {
        startDate: true,
        endDate: true,
        status: true,
        wasReturned: true,
        finalStatus: true,
      },
    });

    const durations = loans.map((loan) => {
      const endDate = loan.endDate || new Date();
      const duration = endDate.getTime() - loan.startDate.getTime();
      return {
        duration: duration / (1000 * 60 * 60 * 24), // días
        wasReturned: loan.wasReturned,
        finalStatus: loan.finalStatus,
      };
    });

    // Separar promedios por tipo de finalización
    const returnedLoans = durations.filter((d) => d.wasReturned);
    const notReturnedLoans = durations.filter((d) => !d.wasReturned);

    return {
      overall: durations.reduce((a, b) => a + b.duration, 0) / durations.length,
      returned: returnedLoans.length
        ? returnedLoans.reduce((a, b) => a + b.duration, 0) /
          returnedLoans.length
        : 0,
      notReturned: notReturnedLoans.length
        ? notReturnedLoans.reduce((a, b) => a + b.duration, 0) /
          notReturnedLoans.length
        : 0,
    };
  } catch (error) {
    throw new Error(
      `Error calculating average loan duration: ${error.message}`
    );
  }
};

const getMostRequestedComponents = async (filters = {}) => {
  try {
    const { startDate, endDate, category } = filters;

    // Construir condición base para el where
    let whereCondition = {};

    // Agregar filtros de fecha si están presentes
    if (startDate || endDate) {
      whereCondition.startDate = {};
      if (startDate) {
        whereCondition.startDate.gte = new Date(startDate);
      }
      if (endDate) {
        whereCondition.startDate.lte = new Date(endDate);
      }
    }

    // Primero obtenemos el conteo agrupado con filtros
    const groupedResults = await prisma.loanHistory.groupBy({
      by: ["componentId"],
      _count: {
        componentId: true,
      },
      where: whereCondition,
      orderBy: {
        _count: {
          componentId: "desc",
        },
      },
    });

    // Luego obtenemos los detalles de los componentes
    const componentsWithDetails = await Promise.all(
      groupedResults.map(async (result) => {
        const component = await prisma.component.findUnique({
          where: {
            id: result.componentId,
            ...(category && {
              category: {
                name: category,
              },
            }),
          },
          include: {
            category: true,
          },
        });

        // Solo incluir si el componente existe y cumple con el filtro de categoría
        if (component) {
          return {
            componentId: result.componentId,
            _count: {
              componentId: result._count.componentId,
            },
            component: component,
          };
        }
        return null;
      })
    );

    // Filtrar componentes nulos (que no cumplieron con el filtro de categoría)
    return componentsWithDetails.filter((item) => item !== null);
  } catch (error) {
    console.error("Error en getMostRequestedComponents:", error);
    throw new Error(
      `Error getting most requested components: ${error.message}`
    );
  }
};

const getLoansByPeriod = async (academicPeriodId, filters = {}) => {
  try {
    const { startDate, endDate, status } = filters;

    // Construir la consulta base
    const whereCondition = {
      request: {
        relatedPeriods: {
          some: {
            academicPeriodId,
          },
        },
      },
    };

    // Agregar filtro de fechas si están presentes
    if (startDate || endDate) {
      whereCondition.startDate = {};
      if (startDate) {
        whereCondition.startDate.gte = new Date(startDate);
      }
      if (endDate) {
        whereCondition.startDate.lte = new Date(endDate);
      }
    }

    // Agregar filtro de estado si está presente y no es 'null'
    if (status && status !== "null") {
      whereCondition.status = status;
    }

    return await prisma.loanHistory.findMany({
      where: whereCondition,
      include: {
        component: true,
        user: true,
        request: {
          include: {
            relatedPeriods: {
              include: {
                academicPeriod: true,
              },
            },
          },
        },
      },
    });
  } catch (error) {
    console.error("Error en getLoansByPeriod:", error);
    throw new Error(`Error getting loans by period: ${error.message}`);
  }
};

const getReturnTimeComparison = async () => {
  try {
    return await prisma.loanHistory.findMany({
      where: {
        status: "devuelto",
        endDate: { not: null },
        request: {
          returnDate: { not: null },
        },
      },
      include: {
        request: {
          select: {
            returnDate: true,
          },
        },
      },
    });
  } catch (error) {
    throw new Error(`Error getting return time comparison: ${error.message}`);
  }
};

const getNotReturnedLoans = async (filters = {}) => {
  try {
    const { userId, startDate, endDate } = filters;

    const whereCondition = {
      status: "no_devuelto",
      request: {
        status: "no_devuelto",
      },
    };

    // Agregar filtro de usuario si está presente
    if (userId) {
      whereCondition.userId = parseInt(userId);
    }

    // Agregar filtros de fecha
    if (startDate || endDate) {
      whereCondition.startDate = {};
      if (startDate) {
        whereCondition.startDate.gte = new Date(startDate);
      }
      if (endDate) {
        whereCondition.startDate.lte = new Date(endDate);
      }
    }

    return await prisma.loanHistory.findMany({
      where: whereCondition,
      include: {
        component: true,
        user: true,
        request: true,
      },
      orderBy: {
        startDate: "desc",
      },
    });
  } catch (error) {
    console.error("Error en getNotReturnedLoans:", error);
    throw new Error(`Error getting not returned loans: ${error.message}`);
  }
};

module.exports = {
  // Operaciones básicas
  createLoanRecord,
  updateLoanStatus,

  // Reportes de préstamos
  getLoansByUser,
  getCurrentLoans,
  getAverageLoanDuration,
  getMostRequestedComponents,

  // Reportes por período
  getLoansByPeriod,
  getReturnTimeComparison,
  getNotReturnedLoans,
};
