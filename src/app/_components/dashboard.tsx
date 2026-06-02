"use client";
import { useState } from "react";
import { api } from "~/trpc/react";
import { StudentsSection } from "./studentsSection";
import { RegisterSection } from "./registerSection";
import { BirthdaysSection } from "./birthdaysSection";
import { HeaderSection } from "./headerSection";
import { TodaySection } from "./todaySection";

const getCurrentYearMonth = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
};

export function Dashboard() {
  const [search, setSearch] = useState("");
  const [yearMonth] = useState(() => getCurrentYearMonth());

  const { data: students, isLoading } = api.students.list.useQuery(
    { search: search.trim() ?? undefined },
    { refetchOnWindowFocus: false },
  );
  const { data: monthlyDashboard, isLoading: isLoadingMonth } =
    api.students.monthlyDashboard.useQuery(
      { yearMonth },
      { refetchOnWindowFocus: false },
    );

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-5 pb-10 sm:py-8">
      <HeaderSection
        students={students}
        search={search}
        setSearch={setSearch}
      />
      <TodaySection
        isLoading={isLoading || isLoadingMonth}
        students={students}
        monthlyDashboard={monthlyDashboard}
      />
      <RegisterSection />
      <BirthdaysSection students={students} />
      <StudentsSection isLoading={isLoading} students={students} />
    </div>
  );
}
