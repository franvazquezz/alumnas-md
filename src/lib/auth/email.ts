type AuthEmail = {
  to: string;
  subject: string;
  heading: string;
  message: string;
  actionLabel: string;
  actionUrl: string;
};

const escapeHtml = (value: string) =>
  value.replace(
    /[&<>'"]/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "'": "&#39;",
        '"': "&quot;",
      })[character] ?? character,
  );

export async function sendAuthEmail(email: AuthEmail) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.AUTH_EMAIL_FROM;

  if (!apiKey || !from) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("RESEND_API_KEY and AUTH_EMAIL_FROM are required");
    }

    console.info(
      `[auth-email] ${email.subject} -> ${email.to}: ${email.actionUrl}`,
    );
    return;
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [email.to],
      subject: email.subject,
      html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#1b0b0d"><h1>${escapeHtml(email.heading)}</h1><p>${escapeHtml(email.message)}</p><p><a href="${escapeHtml(email.actionUrl)}" style="display:inline-block;background:#a30d0d;color:#fff;padding:12px 18px;border-radius:10px;text-decoration:none">${escapeHtml(email.actionLabel)}</a></p><p style="font-size:12px;color:#6b5560">Si no solicitaste esta acción, puedes ignorar este correo.</p></div>`,
    }),
  });

  if (!response.ok) {
    throw new Error(`Email delivery failed with status ${response.status}`);
  }
}
