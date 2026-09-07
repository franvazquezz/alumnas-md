import { AuthCard } from "../../_components/auth-card";
import { ResetPasswordForm } from "../../_components/reset-password-form";

export default async function ResetPasswordPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  return (
    <AuthCard
      title="Nueva contraseña"
      description="Elige una contraseña nueva para tu cuenta."
    >
      <ResetPasswordForm token={token} />
    </AuthCard>
  );
}
