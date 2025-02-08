const academicPeriodModel = require('../models/academicPeriodModel');
const loanHistoryService = require('../models/loanModel');

// Crear un nuevo periodo académico
const createAcademicPeriod = async (req, res) => {
  try {
    const data = req.body;

    if (!data.name || !data.startDate || !data.endDate) {
      return res.status(400).json({ error: 'Todos los campos (name, startDate, endDate) son obligatorios' });
    }

    const academicPeriod = await academicPeriodModel.createAcademicPeriod(data);
    res.status(201).json(academicPeriod);
  } catch (error) {
    console.error('Error al crear el periodo académico:', error.message);
    res.status(500).json({ error: error.message });
  }
};

// Obtener todos los periodos académicos
const getAllAcademicPeriods = async (req, res) => {
  try {
    const { includeStats } = req.query;
    const academicPeriods = await academicPeriodModel.getAllAcademicPeriods(includeStats === 'true');
    res.status(200).json({ academicPeriods });
  } catch (error) {
    console.error('Error al obtener los periodos académicos:', error.message);
    res.status(500).json({ error: error.message });
  }
};

// Obtener un periodo académico por ID
const getAcademicPeriodById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ error: 'El ID del periodo académico es obligatorio' });
    }

    const academicPeriod = await academicPeriodModel.getAcademicPeriodById(id);
    res.status(200).json(academicPeriod);
  } catch (error) {
    console.error('Error al obtener el periodo académico:', error.message);
    res.status(500).json({ error: error.message });
  }
};

// Actualizar un periodo académico por ID
const updateAcademicPeriod = async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;

    if (!data.name || !data.startDate || !data.endDate) {
      return res.status(400).json({ error: 'Todos los campos (name, startDate, endDate) son obligatorios' });
    }

    const updatedAcademicPeriod = await academicPeriodModel.updateAcademicPeriod(id, data);
    res.status(200).json(updatedAcademicPeriod);
  } catch (error) {
    console.error('Error al actualizar el periodo académico:', error.message);
    res.status(500).json({ error: error.message });
  }
};

// Eliminar un periodo académico por ID
const deleteAcademicPeriod = async (req, res) => {
  try {
    const { id } = req.params;
 
    if (!id) {
      return res.status(400).json({ error: 'El ID del periodo académico es obligatorio' });
    }
 
    const deletedAcademicPeriod = await academicPeriodModel.deleteAcademicPeriod(id);
    res.status(200).json({
      message: 'Período académico eliminado exitosamente',
      deletedAcademicPeriod
    });
  } catch (error) {
    console.error('Error al eliminar el periodo académico:', error.message);
    res.status(500).json({ error: error.message });
  }
 };

 const setActiveAcademicPeriod = async (req, res) => {
  try {
    const { id } = req.params;
 
    if (!id) {
      return res.status(400).json({ error: 'El ID del periodo académico es obligatorio' });
    }
 
    const updatedPeriod = await academicPeriodModel.setActiveAcademicPeriod(id);
    
    res.status(200).json({
      message: 'Período académico activado exitosamente',
      updatedPeriod
    });
  } catch (error) {
    console.error('Error al activar el periodo académico:', error.message);
    res.status(500).json({ error: error.message });
  }
 }; 

 const getPeriodReports = async (req, res) => {
  try {
    const { periodId } = req.params;
 
    if (!periodId) {
      return res.status(400).json({ error: 'El ID del período es obligatorio' });
    }
 
    const reports = await academicPeriodModel.getPeriodReports(periodId);
 
    res.status(200).json(reports);
  } catch (error) {
    console.error('Error al obtener reportes del período:', error.message);
    res.status(500).json({ 
      error: 'Error al obtener reportes del período',
      details: error.message 
    });
  }
 };

module.exports = {
  createAcademicPeriod,
  getAllAcademicPeriods,
  getAcademicPeriodById,
  updateAcademicPeriod,
  deleteAcademicPeriod,
  setActiveAcademicPeriod,
  getPeriodReports
};
