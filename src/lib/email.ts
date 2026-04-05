import { Resend } from "resend";

function getResend() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY não configurada");
  return new Resend(apiKey);
}

const FROM_EMAIL = process.env.EMAIL_FROM || "ScreenFlow <noreply@resend.dev>";

export async function sendPasswordResetEmail(
  email: string,
  token: string,
  baseUrl: string
) {
  const resetUrl = `${baseUrl}/reset-password?token=${token}`;

  const resend = getResend();
  await resend.emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: "ScreenFlow — Redefinir senha",
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
        <h2 style="color: #e87b35; margin-bottom: 16px;">Redefinir senha</h2>
        <p style="color: #333; font-size: 14px; line-height: 1.6;">
          Recebemos uma solicitacao para redefinir sua senha no ScreenFlow.
        </p>
        <p style="color: #333; font-size: 14px; line-height: 1.6;">
          Clique no botao abaixo para criar uma nova senha. Este link expira em <strong>1 hora</strong>.
        </p>
        <div style="text-align: center; margin: 32px 0;">
          <a href="${resetUrl}" style="display: inline-block; background: #e87b35; color: #fff; text-decoration: none; padding: 12px 32px; border-radius: 8px; font-weight: 600; font-size: 14px;">
            Redefinir minha senha
          </a>
        </div>
        <p style="color: #999; font-size: 12px; line-height: 1.6;">
          Se voce nao solicitou essa alteracao, ignore este email.
        </p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
        <p style="color: #bbb; font-size: 11px;">ScreenFlow — Gestao de Telas Corporativas</p>
      </div>
    `,
  });
}
