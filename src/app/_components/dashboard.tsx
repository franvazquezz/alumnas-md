"use client";
import { useState } from "react";
import { api } from "~/trpc/react";
import { StudentsSection } from "./studentsSection";
import { RegisterSection } from "./registerSection";
import { BirthdaysSection } from "./birthdaysSection";
import { HeaderSection } from "./headerSection";

export function Dashboard() {
  const [search, setSearch] = useState("");

  const studentsQuery = api.students.list.useQuery(
    { search: search.trim() ?? undefined },
    { refetchOnWindowFocus: false },
  );

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-10 px-4 py-10">
      <HeaderSection
        students={studentsQuery.data}
        search={search}
        setSearch={setSearch}
      />
      <RegisterSection />
      {studentsQuery.data ? (
        <BirthdaysSection students={studentsQuery.data} />
      ) : null}
      <StudentsSection
        isLoading={studentsQuery.isLoading}
        isError={studentsQuery.isError}
        students={studentsQuery.data}
        search={search}
        onRetry={() => void studentsQuery.refetch()}
      />
    </div>
  );
}
