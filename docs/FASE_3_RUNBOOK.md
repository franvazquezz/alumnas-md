# Fase 3 — Autenticación

**Estado:** implementación y verificación completas el 7 de septiembre de 2026;
configuración de proveedores y despliegue pendientes.

## Decisiones

- NextAuth/Auth.js 5 es la capa de autenticación y el adaptador Prisma conserva
  usuarios y cuentas OAuth.
- Las contraseñas se guardan en `PasswordCredential` con `scrypt`, sal aleatoria
  y comparación constante. La longitud mínima es 12 caracteres.
- NextAuth emite una cookie JWT cifrada, pero cada JWT referencia una fila
  `Session` en PostgreSQL. Toda lectura vuelve a validar esa fila; eliminarla
  revoca el acceso inmediatamente.
- Google sólo se habilita cuando existen `AUTH_GOOGLE_ID` y
  `AUTH_GOOGLE_SECRET`. El enlazado peligroso por simple coincidencia de correo
  permanece desactivado. Una cuenta existente conecta Google desde una sesión
  autenticada.
- El alta requiere una `Invitation` vigente, ligada a correo, taller, rol y,
  para alumnas, a una ficha `Student`. Los tokens se guardan únicamente como
  SHA-256.
- Verificación y recuperación usan tokens de un solo uso. Restablecer la
  contraseña revoca todas las sesiones.
- Login, registro, recuperación y reenvío de verificación tienen límites
  persistentes por IP y correo, con identificadores HMAC en lugar de datos en
  claro.

## Variables

Obligatorias en producción:

```dotenv
DATABASE_URL="postgresql://..."
AUTH_SECRET="..."
AUTH_URL="https://alumnas.mdceramica.ar"
AUTH_GOOGLE_ID="..."
AUTH_GOOGLE_SECRET="..."
RESEND_API_KEY="..."
AUTH_EMAIL_FROM="MD Cerámica <cuentas@mdceramica.ar>"
```

Generar `AUTH_SECRET` con `openssl rand -base64 32`. En Google Cloud registrar
exactamente `https://alumnas.mdceramica.ar/api/auth/callback/google` como URI de
redirección. El remitente de Resend debe pertenecer a un dominio verificado.

## Aplicación controlada

1. Mantener el proyecto Vercel pausado.
2. Confirmar host, base y usuario de `DATABASE_URL`.
3. Crear un respaldo nuevo.
4. Ejecutar primero sobre la copia local persistente:

```bash
pnpm db:migrate
pnpm exec prisma migrate status
pnpm exec prisma migrate diff \
  --from-config-datasource \
  --to-schema prisma/schema.prisma --exit-code
```

5. Crear el OWNER inicial con `pnpm auth:bootstrap` y verificar login, cierre de
   sesión y recuperación.
6. Repetir migración y controles en Neon durante una ventana controlada.
7. Configurar secretos en Vercel y desplegar, pero conservar el proyecto pausado
   hasta completar la fase 4.

## Controles de aceptación

- `/` y `/students/[id]` redirigen a `/login` sin sesión.
- Los procedimientos tRPC rechazan una sesión ausente o revocada.
- La contraseña incorrecta y el correo no verificado no crean sesión.
- Una invitación no puede reutilizarse ni usarse con otro correo o ficha.
- La verificación permite el primer login por contraseña.
- El restablecimiento invalida todas las sesiones anteriores.
- Google admite únicamente correos verificados, usuarios con membresía o una
  invitación vigente.
- `pnpm check`, `pnpm build` y la comparación de esquema pasan.

## Límite deliberado

La fase 3 autentica identidades y bloquea el acceso anónimo. La autorización
detallada (`OWNER`, `ADMIN`, `STUDENT`) y el filtrado por `studioId` pertenecen a
la fase 4. No reanudar el despliegue público antes de completar esa fase.
