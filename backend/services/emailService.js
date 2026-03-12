export const sendEmail = async ({ to, subject, html }) => {
  if (!process.env.BREVO_API_KEY || !process.env.EMAIL_USER) {
    throw new Error('El servicio de correo no está configurado.');
  }

  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': process.env.BREVO_API_KEY,
    },
    body: JSON.stringify({
      sender: { name: 'NEXT', email: process.env.EMAIL_USER },
      to: [{ email: to }],
      subject,
      htmlContent: html,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Error al enviar correo: ${errorText}`);
  }
};