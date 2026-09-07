import { AuthCard } from "../_components/auth-card";
import { LoginForm } from "../_components/login-form";
import { auth } from "~/auth";
import { redirect } from "next/navigation";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{
    verification?: string;
    reset?: string;
    error?: string;
  }>;
}) {
  const session = await auth();
  if (session?.user.id) redirect("/");
  const params = await searchParams;

  return (
    <AuthCard
      title="Iniciar sesión"
      description="Accede al espacio privado del taller con tu correo o tu cuenta de Google."
    >
      <LoginForm
        verification={params.verification}
        reset={params.reset}
        authError={params.error}
        googleEnabled={Boolean(
          process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET,
        )}
      />
    </AuthCard>
  );
}
