const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const createComponentMovement = async (data) => {
  const {
    componentId,
    quantity,
    reason,
    movementType,
    academicPeriodId,
    requestId,
  } = data;

  try {
    return await prisma.$transaction(async (tx) => {
      // Validaciones básicas
      const movementQuantity = parseInt(quantity);
      if (isNaN(movementQuantity) || movementQuantity <= 0) {
        throw new Error('La cantidad debe ser un número positivo');
      }

      if (!reason || reason.trim() === '') {
        throw new Error('La razón del movimiento es obligatoria');
      }

      // Obtener el componente
      const component = await tx.component.findUnique({
        where: { id: parseInt(componentId) },
      });

      if (!component) {
        throw new Error('El componente no existe');
      }

      // Validación específica para egresos
      if (movementType === 'egreso') {
        const disponibleDespuesEgreso = component.quantity - movementQuantity;
        if (disponibleDespuesEgreso < 0) {
          throw new Error(`No hay suficientes componentes disponibles. Cantidad actual: ${component.quantity}, Cantidad solicitada: ${movementQuantity}`);
        }
      }
      
      // Obtener el periodo académico activo
      let activeAcademicPeriodId = academicPeriodId;
      if (!activeAcademicPeriodId) {
        const activePeriod = await tx.academicPeriod.findFirst({
          where: { isActive: true },
        });
        if (!activePeriod) {
          throw new Error('PERIODO_ACTIVO_NO_ENCONTRADO');
        }
        activeAcademicPeriodId = activePeriod.id;
      }

      // Calcular la nueva cantidad
      const newQuantity = movementType === 'ingreso'
        ? component.quantity + movementQuantity
        : component.quantity - movementQuantity;

      // Crear el registro de movimiento
      const componentMovement = await tx.componentMovement.create({
        data: {
          componentId: parseInt(componentId),
          quantity: movementType === 'ingreso' ? movementQuantity : -movementQuantity,
          reason: reason.trim(),
          movementType,
          academicPeriodId: activeAcademicPeriodId,
        },
      });

      // Actualizar la cantidad del componente
      await tx.component.update({
        where: { id: parseInt(componentId) },
        data: { quantity: newQuantity },
      });

      return componentMovement;
    });

  } catch (error) {
    console.error('Error en createComponentMovement:', error.message);
    throw error;
  }
};

// Método mejorado para obtener movimientos
const getComponentMovements = async (filters) => {
  try {
    const { componentId, movementType, startDate, endDate, requestId } = filters;

    const whereCondition = {};

    if (componentId) {
      whereCondition.componentId = parseInt(componentId);
    }

    if (movementType) {
      whereCondition.movementType = movementType;
    }

    if (requestId) {
      whereCondition.requestId = parseInt(requestId);
    }

    if (startDate || endDate) {
      whereCondition.movementDate = {};
      if (startDate) {
        whereCondition.movementDate.gte = new Date(startDate);
      }
      if (endDate) {
        whereCondition.movementDate.lte = new Date(endDate);
      }
    }

    const movements = await prisma.componentMovement.findMany({
      where: whereCondition,
      include: {
        component: true,
        academicPeriod: true,
      },
      orderBy: {
        movementDate: 'desc'
      }
    });

    return movements;
  } catch (error) {
    console.error("Error al obtener los movimientos de componentes:", error.message);
    throw new Error("Error al obtener los movimientos de componentes");
  }
};

module.exports = {
  createComponentMovement,
  getComponentMovements,
};