import { notFound } from "next/navigation";

import { hashOpaqueToken } from "~/lib/auth/tokens";
import { db } from "~/server/db";
import { AuthCard } from "../../_components/auth-card";
import { RegisterForm } from "../../_components/register-form";

export default async function InvitationPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const invitation = await db.invitation.findUnique({
    where: { tokenHash: hashOpaqueToken(token) },
    include: { studio: { select: { name: true } } },
  });

  if (
    !invitation ||
    invitation.status !== "PENDING" ||
    invitation.expiresAt <= new Date()
  ) {
    notFound();
  }

  return (
    <AuthCard
      title="Crear tu cuenta"
      description={`Acepta la invitación de ${invitation.studio.name}. Después tendrás que verificar tu correo.`}
    >
      <RegisterForm token={token} email={invitation.email} />
    </AuthCard>
  );
}
