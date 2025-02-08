const moment = require('moment');

// Configurar moment en español
moment.locale('es');

class ReportFormatters {
  // Formateo de fechas
  static formatDate(date, format = 'DD/MM/YYYY') {
    if (!date) return 'N/A';
    return moment(date).format(format);
  }

  static formatDateTime(date) {
    if (!date) return 'N/A';
    return moment(date).format('DD/MM/YYYY HH:mm');
  }

  static formatDateRange(startDate, endDate) {
    return `${this.formatDate(startDate)} - ${this.formatDate(endDate)}`;
  }

  // Formateo de estados
  static formatRequestStatus(status) {
    const statusMap = {
      'pendiente': 'Pendiente',
      'prestamo': 'En Préstamo',
      'finalizado': 'Finalizado',
      'no_devuelto': 'No Devuelto'
    };
    return statusMap[status] || status;
  }

  static formatLoanStatus(status) {
    const statusMap = {
      'devuelto': 'Devuelto',
      'no_devuelto': 'No Devuelto'
    };
    return statusMap[status] || status;
  }

  // Formateo de cantidades y números
  static formatQuantity(quantity) {
    return quantity?.toString() || '0';
  }

  static formatPercentage(value, decimals = 2) {
    if (typeof value !== 'number') return '0%';
    return `${value.toFixed(decimals)}%`;
  }

  // Formateo de movimientos
  static formatMovementType(type) {
    const typeMap = {
      'ingreso': 'Ingreso',
      'egreso': 'Egreso'
    };
    return typeMap[type] || type;
  }

  // Formateo de roles de usuario
  static formatUserRole(role) {
    const roleMap = {
      'admin': 'Administrador',
      'user': 'Usuario'
    };
    return roleMap[role] || role;
  }

  // Formateo de texto y descripciones
  static formatDescription(description, maxLength = 100) {
    if (!description) return 'Sin descripción';
    if (description.length <= maxLength) return description;
    return `${description.substring(0, maxLength)}...`;
  }

  // Formateo de nombres de componentes
  static formatComponentName(name, category) {
    if (!category) return name;
    return `${name} (${category})`;
  }

  // Formateo de periodos académicos
  static formatAcademicPeriod(period) {
    if (!period) return 'N/A';
    return `${period.name} (${this.formatDateRange(period.startDate, period.endDate)})`;
  }

  // Formateo de estado de devolución
  static formatReturnStatus(wasReturned, finalStatus) {
    if (wasReturned) {
      return 'Devuelto correctamente';
    }
    const statusMap = {
      'finalizado_no_devuelto': 'Finalizado sin devolución',
      'finalizado_normal': 'Finalizado normalmente'
    };
    return statusMap[finalStatus] || 'No devuelto';
  }

  // Formateo de métricas
  static formatMetrics(value, type) {
    switch (type) {
      case 'duration':
        return `${Math.round(value)} días`;
      case 'count':
        return value.toString();
      case 'average':
        return value.toFixed(2);
      default:
        return value.toString();
    }
  }

  // Formateo de tablas para reportes
  static formatTableData(data, columns) {
    return data.map(item => {
      return columns.map(column => {
        const value = column.path.split('.').reduce((obj, key) => obj?.[key], item);
        return column.format ? column.format(value) : value;
      });
    });
  }
}

module.exports = ReportFormatters;