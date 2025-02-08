const componentModel = require('../models/componentModel');
const loanHistoryService = require('../models/loanModel');
const upload = require('../config/uploadConfig');
const path = require('path');
const fs = require('fs');

// Crear un componente
const createComponentWithMovement = async (req, res) => {
  try {
    const data = req.body;

    if (req.file) {
      data.imageUrl = `/uploads/componentes/${req.file.filename}`;
    }

    // Validar los datos requeridos
    if (!data.name || !data.quantity || !data.categoryId || !data.reason) {
      return res.status(400).json({
        error: 'Faltan campos obligatorios (name, quantity, categoryId, reason).',
      });
    }

    const result = await componentModel.createComponentWithMovement(data);

    res.status(201).json(result);
  } catch (error) {
    console.error('Error al crear el componente con movimiento:', error.message);
    res.status(500).json({ error: error.message });
  }
};

// Obtener todos los componentes con filtro por estado
const getAllComponents = async (req, res) => {
  const { name, status, includeAvailable, categoryId } = req.query;
  const shouldIncludeAvailable = includeAvailable !== 'false';

  try {
    let components;
    
    if (name) {
      components = await componentModel.searchComponentsByName(name);
    } else if (categoryId) {
      components = await componentModel.filterComponentsByCategories(categoryId);
    } else {
      components = await componentModel.getAllComponents(status, shouldIncludeAvailable);
    }

    if (req.user?.role === 'user') {
      components = components
        .filter(comp => comp.isActive && comp.availableQuantity > 0)
        .map(comp => ({
          id: comp.id,
          name: comp.name,
          description: comp.description,
          imageUrl: comp.imageUrl,
          category: comp.category,
          quantity: comp.quantity,
          availableQuantity: comp.quantity - (comp.inRequests || 0) - (comp.notReturnedQuantity || 0),
          categoryId: comp.categoryId
        }));
    } else {
      components = components.map(comp => ({
        ...comp,
        availabilityDetails: {
          total: comp.quantity,
          available: comp.availableQuantity,
          inLoans: comp.inLoans || 0,
          inRequests: comp.inRequests || 0
        }
      }));
    }

    res.status(200).json({ 
      components,
      total: components.length,
      filters: {
        name,
        status,
        categoryId
      }
    });
  } catch (error) {
    console.error('Error getting components:', error);
    res.status(500).json({ 
      error: 'Error al obtener los componentes',
      details: error.message 
    });
  }
};

// Obtener un componente por ID
const getComponentById = async (req, res) => {
  const { id } = req.params;
  try {
    const component = await componentModel.getComponentById(id);
    if (!component) {
      return res.status(404).json({ error: 'Componente no encontrado' });
    }
    res.status(200).json(component);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Actualizar un componente por ID
const updateComponent = async (req, res) => {
  const { id } = req.params;
  const data = req.body;

  try {
    const currentComponent = await componentModel.getComponentById(id);
    if (!currentComponent) {
      return res.status(404).json({ error: 'Componente no encontrado' });
    }
    if (req.file) {
      const oldImagePath = path.join(__dirname, '..', 'uploads/componentes', path.basename(currentComponent.imageUrl));
      data.imageUrl = `/uploads/componentes/${req.file.filename}`;
      if (currentComponent.imageUrl && fs.existsSync(oldImagePath)) {
        fs.unlinkSync(oldImagePath);
      }
    } else {
      data.imageUrl = currentComponent.imageUrl;
    }
    const updatedComponent = await componentModel.updateComponent(id, data);
    res.status(200).json(updatedComponent);
  } catch (error) {
    console.error('Error al actualizar el componente:', error.message);
    res.status(500).json({ error: error.message });
  }
};

// Eliminar un componente por ID
const deleteComponent = async (req, res) => {
  const { id } = req.params;
  try {
    const component = await componentModel.getComponentById(id);
    if (!component) {
      return res.status(404).json({ error: 'Componente no encontrado' });
    }

    const activeLoans = await loanHistoryService.getCurrentLoans();
    const hasActiveLoans = activeLoans.some(loan => loan.componentId === parseInt(id));

    if (hasActiveLoans) {
      return res.status(400).json({ 
        error: 'No se puede eliminar el componente porque tiene préstamos activos'
      });
    }

    if (component.imageUrl) {
      const imagePath = path.join(__dirname, '../uploads/componentes', path.basename(component.imageUrl));
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }

    const deletedComponent = await componentModel.deleteComponent(id);
    res.status(200).json({
      message: 'Componente y registros relacionados eliminados exitosamente',
      deletedComponent
    });
  } catch (error) {
    console.error('Error al eliminar el componente:', error.message);
    res.status(500).json({ error: error.message });
  }
};

const filterComponentsByCategories = async (req, res) => {
  const { categoryIds } = req.query; 
  try {
    if (!categoryIds) {
      return res.status(400).json({ error: 'Se deben proporcionar IDs de categorías' });
    }
    const components = await componentModel.filterComponentsByCategories(categoryIds);
    res.status(200).json({ components });
  } catch (error) {
    console.error('Error al filtrar los componentes:', error);
    res.status(500).json({ error: error.message });
  }
};


module.exports = {
  createComponentWithMovement,
  getAllComponents,
  getComponentById,
  updateComponent,
  deleteComponent,
  filterComponentsByCategories,
};