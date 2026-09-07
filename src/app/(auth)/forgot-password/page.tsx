import { AuthCard } from "../_components/auth-card";
import { EmailRequestForm } from "../_components/email-request-form";

export default function ForgotPasswordPage() {
  return (
    <AuthCard
      title="Recuperar contraseña"
      description="Te enviaremos un enlace de un solo uso que vence en 30 minutos."
    >
      <EmailRequestForm mode="reset" />
    </AuthCard>
  );
}
