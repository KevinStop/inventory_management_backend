const componentMovementModel = require('../models/componentMovementModel');
const loanHistoryService = require('../models/loanModel');

// Crear un movimiento (ingreso o egreso)
const createComponentMovement = async (req, res) => {
  try {
    const data = req.body;

    if (!['ingreso', 'egreso'].includes(data.movementType)) {
      return res.status(400).json({ error: 'El tipo de movimiento debe ser "ingreso" o "egreso"' });
    }

    if (data.movementType === 'egreso' && data.requestId) {
      const activeLoans = await loanHistoryService.getCurrentLoans();
      const hasActiveLoan = activeLoans.some(
        loan => loan.componentId === parseInt(data.componentId) && 
                loan.requestId === parseInt(data.requestId)
      );

      if (!hasActiveLoan) {
        return res.status(400).json({ 
          error: 'No existe un préstamo activo para este componente y solicitud' 
        });
      }
    }

    const componentMovement = await componentMovementModel.createComponentMovement(data);

    res.status(201).json({
      message: `Movimiento de ${data.movementType} registrado exitosamente`,
      componentMovement
    });

  } catch (error) {
    console.error('Error en el controlador createComponentMovement:', error.message);

    if (error.message === 'PERIODO_ACTIVO_NO_ENCONTRADO') {
      return res.status(400).json({ error: 'No hay un periodo académico activo disponible.' });
    }

    if (error.message.includes('No hay suficientes componentes disponibles')) {
      return res.status(400).json({ error: error.message });
    }

    res.status(500).json({ error: 'Error al crear el movimiento del componente.' });
  }
};

// Obtener movimientos de componentes con filtros opcionales
const getComponentMovements = async (req, res) => {
  const { componentId, movementType, startDate, endDate, requestId } = req.query;

  try {
    const filters = {
      componentId,
      movementType,
      startDate,
      endDate,
      requestId 
    };

    const movements = await componentMovementModel.getComponentMovements(filters);

    if (requestId) {
      const loanInfo = await loanHistoryService.getLoansByRequest(requestId);
      res.status(200).json({ 
        movements,
        loanInfo
      });
    } else {
      res.status(200).json({ movements });
    }

  } catch (error) {
    console.error('Error al obtener los movimientos de componentes:', error.message);
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  createComponentMovement,
  getComponentMovements,
};
