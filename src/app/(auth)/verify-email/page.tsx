import { AuthCard } from "../_components/auth-card";
import { EmailRequestForm } from "../_components/email-request-form";

export default function VerifyEmailPage() {
  return (
    <AuthCard
      title="Verificar correo"
      description="Solicita un nuevo enlace si el anterior venció o no llegó."
    >
      <EmailRequestForm mode="verification" />
    </AuthCard>
  );
}
