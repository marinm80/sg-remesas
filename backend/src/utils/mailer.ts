import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

let transporter: nodemailer.Transporter;

/**
 * Inicializa y recupera el transportador de Nodemailer (Caché local)
 */
async function getTransporter(): Promise<nodemailer.Transporter> {
  if (transporter) return transporter;

  const hasSMTP = process.env.SMTP_HOST && process.env.SMTP_PORT && process.env.SMTP_USER && process.env.SMTP_PASS;

  if (hasSMTP) {
    console.log('[Mailer] Usando credenciales SMTP provistas en el archivo .env');
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_PORT === '465',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  } else {
    console.log('[Mailer] No se encontraron credenciales SMTP en el .env. Generando cuenta de desarrollo en Ethereal Email...');
    const testAccount = await nodemailer.createTestAccount();
    console.log(`[Mailer] Cuenta de Ethereal generada con éxito: ${testAccount.user}`);
    transporter = nodemailer.createTransport({
      host: testAccount.smtp.host,
      port: testAccount.smtp.port,
      secure: testAccount.smtp.secure,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
  }

  return transporter;
}

export interface SendMailOptions {
  to: string;
  subject: string;
  text: string;
  html: string;
}

/**
 * Envía un correo electrónico e imprime la URL de previsualización si se usa Ethereal
 */
export async function sendMail(options: SendMailOptions): Promise<void> {
  try {
    const client = await getTransporter();
    const info = await client.sendMail({
      from: process.env.SMTP_FROM || 'no-reply@sgremesas.com',
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
    });

    console.log(`[Mailer] Correo electrónico enviado exitosamente a: ${options.to}`);
    
    // Obtener la URL de previsualización si es una cuenta de Ethereal
    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) {
      console.log(`[Mailer] [PREVIEW] Previsualización del correo en Ethereal: ${previewUrl}`);
    }
  } catch (error: any) {
    console.error('[Mailer] ERROR al enviar el correo electrónico:', error.message);
  }
}
