"use client";
import { useState } from "react";
import { api } from "~/trpc/react";
import { StudentsSection } from "./studentsSection";
import { RegisterSection } from "./registerSection";
import { BirthdaysSection } from "./birthdaysSection";
import { HeaderSection } from "./headerSection";

export function Dashboard() {
  const [search, setSearch] = useState("");

  const { data: students, isLoading } = api.students.list.useQuery(
    { search: search.trim() ?? undefined },
    { refetchOnWindowFocus: false },
  );

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-10 px-4 py-10">
      <HeaderSection
        students={students}
        search={search}
        setSearch={setSearch}
      />
      <RegisterSection />
      <BirthdaysSection students={students} />
      <StudentsSection isLoading={isLoading} students={students} />
    </div>
  );
}
