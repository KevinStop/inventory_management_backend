const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Crear un nuevo periodo académico
const createAcademicPeriod = async (data) => {
  try {
    const academicPeriodData = {
      name: data.name,
      startDate: new Date(data.startDate),
      endDate: new Date(data.endDate),
    };

    const academicPeriod = await prisma.academicPeriod.create({
      data: academicPeriodData,
    });

    return academicPeriod;
  } catch (error) {
    console.error('Error al crear el periodo académico:', error.message);
    throw new Error('Error al crear el periodo académico');
  }
};

// Obtener todos los periodos académicos
const getAllAcademicPeriods = async (includeStats = false) => {
  try {
    let academicPeriods = await prisma.academicPeriod.findMany({
      orderBy: { startDate: 'asc' },
      include: {
        requestPeriods: true,
        componentMovements: true
      }
    });

    if (includeStats) {
      academicPeriods = await Promise.all(academicPeriods.map(async (period) => {
        // Obtener préstamos del período
        const loans = await prisma.loanHistory.findMany({
          where: {
            request: {
              relatedPeriods: {
                some: {
                  academicPeriodId: period.id
                }
              }
            }
          }
        });

        // Calcular estadísticas
        return {
          ...period,
          stats: {
            totalLoans: loans.length,
            activeLoans: loans.filter(loan => loan.status === 'no_devuelto').length,
            completedLoans: loans.filter(loan => loan.status === 'devuelto').length
          }
        };
      }));
    }

    return academicPeriods;
  } catch (error) {
    console.error('Error al obtener los periodos académicos:', error.message);
    throw new Error('Error al obtener los periodos académicos');
  }
};

// Obtener un periodo académico por ID
const getAcademicPeriodById = async (id) => {
  try {
    const academicPeriod = await prisma.academicPeriod.findUnique({
      where: { id: parseInt(id) },
    });

    if (!academicPeriod) {
      throw new Error('Periodo académico no encontrado');
    }

    return academicPeriod;
  } catch (error) {
    console.error('Error al obtener el periodo académico:', error.message);
    throw new Error('Error al obtener el periodo académico');
  }
};

// Actualizar un periodo académico por ID
const updateAcademicPeriod = async (id, data) => {
  try {
    const updatedData = {
      name: data.name,
      startDate: new Date(data.startDate),
      endDate: new Date(data.endDate),
      isActive: data.isActive,
    };

    const updatedAcademicPeriod = await prisma.academicPeriod.update({
      where: { id: parseInt(id) },
      data: updatedData,
    });

    return updatedAcademicPeriod;
  } catch (error) {
    console.error('Error al actualizar el periodo académico:', error.message);
    throw new Error('Error al actualizar el periodo académico');
  }
};

// Eliminar un periodo académico por ID
const deleteAcademicPeriod = async (id) => {
  try {
    // Verificar si hay préstamos activos en el período
    const activeLoans = await prisma.loanHistory.findMany({
      where: {
        status: 'no_devuelto',
        request: {
          relatedPeriods: {
            some: {
              academicPeriodId: parseInt(id)
            }
          }
        }
      }
    });

    if (activeLoans.length > 0) {
      throw new Error('No se puede eliminar un período con préstamos activos');
    }

    return await prisma.$transaction(async (tx) => {
      // Actualizar registros históricos
      await tx.loanHistory.updateMany({
        where: {
          request: {
            relatedPeriods: {
              some: {
                academicPeriodId: parseInt(id)
              }
            }
          },
          status: 'no_devuelto'
        },
        data: {
          status: 'devuelto',
          endDate: new Date()
        }
      });

      // Eliminar registros relacionados
      await tx.requestPeriod.deleteMany({
        where: { academicPeriodId: parseInt(id) }
      });

      await tx.componentMovement.deleteMany({
        where: { academicPeriodId: parseInt(id) }
      });

      const deletedPeriod = await tx.academicPeriod.delete({
        where: { id: parseInt(id) }
      });

      return deletedPeriod;
    });
  } catch (error) {
    console.error('Error al eliminar el periodo académico:', error.message);
    throw new Error(`Error al eliminar el periodo académico: ${error.message}`);
  }
};

async function deactivateAllAcademicPeriods() {
  return prisma.academicPeriod.updateMany({
    where: { isActive: true },
    data: { isActive: false },
  });
}

const setActiveAcademicPeriod = async (id) => {
  try {
    return await prisma.$transaction(async (tx) => {
      // Verificar si el período existe
      const periodToActivate = await tx.academicPeriod.findUnique({
        where: { id: parseInt(id) }
      });

      if (!periodToActivate) {
        throw new Error('Periodo académico no encontrado');
      }

      // Desactivar todos los períodos primero
      await tx.academicPeriod.updateMany({
        where: { isActive: true },
        data: { isActive: false }
      });

      // Activar el período seleccionado
      return await tx.academicPeriod.update({
        where: { id: parseInt(id) },
        data: { isActive: true }
      });
    });
  } catch (error) {
    console.error('Error al activar el periodo académico:', error.message);
    throw new Error(`Error al activar el periodo académico: ${error.message}`);
  }
};

const getPeriodReports = async (periodId) => {
  try {
    const period = await prisma.academicPeriod.findUnique({
      where: { id: parseInt(periodId) },
      include: {
        componentMovements: {
          include: {
            component: true
          }
        },
        requestPeriods: {
          include: {
            request: {
              include: {
                user: true,
                requestDetails: {
                  include: {
                    component: true
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!period) {
      throw new Error('Periodo no encontrado');
    }

    // Obtener préstamos del período
    const loans = await prisma.loanHistory.findMany({
      where: {
        request: {
          relatedPeriods: {
            some: {
              academicPeriodId: parseInt(periodId)
            }
          }
        }
      },
      include: {
        component: true,
        user: true
      }
    });

    return {
      period,
      statistics: {
        totalLoans: loans.length,
        activeLoans: loans.filter(loan => loan.status === 'no_devuelto').length,
        completedLoans: loans.filter(loan => loan.status === 'devuelto').length,
        totalMovements: period.componentMovements.length,
        movementsByType: {
          ingresos: period.componentMovements.filter(m => m.movementType === 'ingreso').length,
          egresos: period.componentMovements.filter(m => m.movementType === 'egreso').length
        }
      },
      loans,
      movements: period.componentMovements,
      requests: period.requestPeriods.map(rp => rp.request)
    };
  } catch (error) {
    console.error('Error al obtener reportes del período:', error.message);
    throw new Error(`Error al obtener reportes del período: ${error.message}`);
  }
};

const getActivePeriod = async () => {
  try {
    return await prisma.academicPeriod.findFirst({
      where: { isActive: true }
    });
  } catch (error) {
    console.error('Error al obtener el periodo activo:', error.message);
    throw new Error('Error al obtener el periodo activo');
  }
};

module.exports = {
  createAcademicPeriod,
  getAllAcademicPeriods,
  getAcademicPeriodById,
  updateAcademicPeriod,
  deleteAcademicPeriod,
  deactivateAllAcademicPeriods,
  setActiveAcademicPeriod,
  getPeriodReports,
  getActivePeriod
};
