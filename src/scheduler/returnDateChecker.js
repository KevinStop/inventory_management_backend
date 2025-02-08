const { PrismaClient } = require('@prisma/client');
const EmailService = require('../mailer/emailService');
const prisma = new PrismaClient();

async function checkReturnDates() {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Verificar solicitudes que vencen hoy
    const dueToday = await prisma.request.findMany({
      where: {
        status: 'prestamo',
        returnDate: {
          gte: today,
          lt: tomorrow
        },
        isActive: true
      }
    });

    // Enviar notificaciones para las que vencen hoy
    for (const request of dueToday) {
      await EmailService.sendReturnDateNotification(request.requestId);
    }

    // Verificar solicitudes que vencen mañana (para recordatorio)
    const dueTomorrow = await prisma.request.findMany({
      where: {
        status: 'prestamo',
        returnDate: {
          gte: tomorrow,
          lt: new Date(tomorrow.getTime() + 24 * 60 * 60 * 1000)
        },
        isActive: true
      }
    });

    // Enviar recordatorios para las que vencen mañana
    for (const request of dueTomorrow) {
      await EmailService.sendUpcomingReturnReminder(request.requestId);
    }

  } catch (error) {
    console.error('Error checking return dates:', error);
  }
}

module.exports = checkReturnDates;