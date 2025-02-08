const requestDetailModel = require('../models/requestDetailModel');
const componentModel = require('../models/componentModel'); 

// Crear un detalle de solicitud
const createRequestDetail = async (req, res) => {
  try {
    const { requestId, componentId, quantity } = req.body;

    const newRequestDetail = await requestDetailModel.createRequestDetail({
      requestId,
      componentId,
      quantity,
    });

    res.status(201).json(newRequestDetail);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Obtener todos los detalles de solicitud
const getAllRequestDetails = async (req, res) => {
  try {
    const requestDetails = await requestDetailModel.getAllRequestDetails();
    res.status(200).json(requestDetails);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Obtener un detalle de solicitud por ID
const getRequestDetailById = async (req, res) => {
  try {
    const { id } = req.params;
    const requestDetail = await requestDetailModel.getRequestDetailById(id);
    if (!requestDetail) {
      return res.status(404).json({ message: 'Detalle de solicitud no encontrado' });
    }
    res.status(200).json(requestDetail);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Actualizar un detalle de solicitud por ID
const updateRequestDetail = async (req, res) => {
  try {
    const { id } = req.params;
    const { quantity } = req.body;

    const updatedRequestDetail = await requestDetailModel.updateRequestDetail(id, { quantity });

    if (updatedRequestDetail.status === 'aceptada') {
      await componentModel.updateComponentQuantity(updatedRequestDetail.componentId, -quantity);
    }

    res.status(200).json(updatedRequestDetail);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Eliminar un detalle de solicitud por ID (cuando la solicitud es rechazada o cancelada)
const deleteRequestDetail = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedRequestDetail = await requestDetailModel.deleteRequestDetail(id);

    const requestDetail = await requestDetailModel.getRequestDetailById(id);
    await componentModel.updateComponentQuantity(requestDetail.componentId, requestDetail.quantity);

    res.status(200).json({ message: 'Detalle de solicitud eliminado correctamente' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createRequestDetail,
  getAllRequestDetails,
  getRequestDetailById,
  updateRequestDetail,
  deleteRequestDetail,
};
