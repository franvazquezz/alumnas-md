export function AuthCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-plum/15 w-full max-w-md rounded-3xl border bg-white/90 p-8 shadow-xl backdrop-blur">
      <p className="text-primary text-sm font-bold tracking-[0.14em] uppercase">
        MD Cerámica
      </p>
      <h1 className="text-plum mt-3 text-3xl font-black">{title}</h1>
      <p className="text-plum/70 mt-2 text-sm leading-6">{description}</p>
      <div className="mt-7">{children}</div>
    </section>
  );
}
