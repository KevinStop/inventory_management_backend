const newRequestTemplate = (requestData) => {
  return `
      <div style="font-family: Arial, sans-serif; padding: 20px;">
        <h2>Nueva Solicitud de Componentes</h2>
        <p>Se ha recibido una nueva solicitud con los siguientes detalles:</p>
        <ul>
          <li>Usuario: ${requestData.userName}</li>
          <li>Fecha de solicitud: ${new Date(
            requestData.createdAt
          ).toLocaleDateString()}</li>
          <li>Tipo de solicitud: ${requestData.typeRequest}</li>
          <li>Descripción: ${requestData.description || "No especificada"}</li>
        </ul>
        <p>Por favor, revise la solicitud en el sistema para su aprobación o rechazo.</p>
      </div>
    `;
};

const approvedRequestTemplate = (requestData) => {
  return `
      <div style="font-family: Arial, sans-serif; padding: 20px;">
        <h2>Solicitud Aprobada</h2>
        <p>Su solicitud ha sido aprobada con los siguientes detalles:</p>
        <ul>
          <li>Número de solicitud: ${requestData.requestId}</li>
          <li>Fecha de aprobación: ${new Date().toLocaleDateString()}</li>
          <li>Notas del administrador: ${
            requestData.adminNotes || "No hay notas adicionales"
          }</li>
        </ul>
        <p>Puede proceder a retirar los componentes solicitados.</p>
      </div>
    `;
};

const rejectedRequestTemplate = (requestData) => {
  return `
      <div style="font-family: Arial, sans-serif; padding: 20px;">
        <h2>Solicitud Rechazada</h2>
        <p>Lamentamos informarle que su solicitud ha sido rechazada.</p>
        <ul>
          <li>Número de solicitud: ${requestData.requestId}</li>
          <li>Fecha de rechazo: ${new Date().toLocaleDateString()}</li>
          <li>Motivo: ${requestData.adminNotes || "No especificado"}</li>
        </ul>
        <p>Si tiene alguna pregunta, por favor contacte al administrador del sistema.</p>
      </div>
    `;
};

const returnDateTemplate = (data) => `
  <div style="font-family: Arial, sans-serif; padding: 20px;">
    <h2>Fecha de devolución cumplida</h2>
    <p>Estimado/a ${data.userName},</p>
    <p>Le recordamos que hoy es la fecha establecida para la devolución de los siguientes componentes:</p>
    <ul>
      ${data.components.map(comp => `
        <li>${comp.name} (Cantidad: ${comp.quantity})</li>
      `).join('')}
    </ul>
    <p>Fecha de devolución: ${new Date(data.returnDate).toLocaleDateString()}</p>
    <p>Por favor, realice la devolución lo antes posible para evitar inconvenientes.</p>
  </div>
`;

const adminReturnDateTemplate = (data) => `
  <div style="font-family: Arial, sans-serif; padding: 20px;">
    <h2>Notificación de fecha de devolución</h2>
    <p>Se ha cumplido la fecha de devolución para los siguientes componentes:</p>
    <p><strong>Usuario:</strong> ${data.userName} (${data.userEmail})</p>
    <ul>
      ${data.components.map(comp => `
        <li>${comp.name} (Cantidad: ${comp.quantity})</li>
      `).join('')}
    </ul>
    <p>Fecha de devolución: ${new Date(data.returnDate).toLocaleDateString()}</p>
  </div>
`;

const upcomingReturnTemplate = (data) => `
  <div style="font-family: Arial, sans-serif; padding: 20px;">
    <h2>Recordatorio de próxima devolución</h2>
    <p>Estimado/a ${data.userName},</p>
    <p>Le recordamos que mañana vence el plazo para la devolución de los siguientes componentes:</p>
    <ul>
      ${data.components.map(comp => `
        <li>${comp.name} (Cantidad: ${comp.quantity})</li>
      `).join('')}
    </ul>
    <p>Fecha de devolución: ${new Date(data.returnDate).toLocaleDateString()}</p>
  </div>
`;

const passwordResetTemplate = (data) => `
  <div style="font-family: Arial, sans-serif; padding: 20px;">
    <h2>Recuperación de Contraseña</h2>
    <p>Estimado/a usuario,</p>
    <p>Se ha generado una contraseña temporal para su cuenta:</p>
    <p style="background-color: #f0f0f0; padding: 10px; font-family: monospace; font-size: 16px;">
      ${data.temporalPassword}
    </p>
    <p>Por favor, use esta contraseña temporal para iniciar sesión y cambiar su contraseña lo antes posible.</p>
    <p><strong>Nota:</strong> Por seguridad, esta contraseña temporal tiene una validez limitada.</p>
  </div>
`;

module.exports = {
  newRequestTemplate,
  approvedRequestTemplate,
  rejectedRequestTemplate,
  returnDateTemplate,
  adminReturnDateTemplate,
  upcomingReturnTemplate,
  passwordResetTemplate
};
