const transporter = require('./config');

class MailService {
  static async enviarCorreo(destinatario, asunto, contenido) {
    try {
      const info = await transporter.sendMail({
        from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_USER}>`,
        to: destinatario,
        subject: asunto,
        text: contenido,
        html: contenido,
      });
      
      return info;
    } catch (error) {
      console.error('Error al enviar correo:', error);
      throw new Error('Error al enviar el correo electrónico');
    }
  }
}

module.exports = MailService;