import { useEffect, useMemo, useState } from "react";
import { Combobox, ComboboxInput, ComboboxOption, ComboboxOptions } from "@headlessui/react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { AxiosError } from "axios";
import { ArrowRight, Search, UserPlus, Users } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { AdminShell } from "@/components/layout/AdminShell";
import { EmptyState } from "@/components/shared/EmptyState";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { api, queryClient } from "@/lib/api";
import { cn } from "@/lib/utils";

type EnrollmentStatus = "ACTIVE" | "REVOKED" | "NONE";

type Student = {
  id: string;
  email: string;
  fullName: string;
  avatarUrl: string | null;
  enrollmentStatus: EnrollmentStatus;
  enrollmentType: "PAID" | "ADMIN_ENROLLED" | null;
  enrolledAt: string | null;
  courseCompletion: number;
  lastActiveAt: string | null;
};

type StudentSearchResult = {
  id: string;
  email: string;
  fullName: string;
  enrollmentStatus: EnrollmentStatus;
};

type PendingAction = {
  student: Pick<Student, "id" | "email" | "fullName" | "enrollmentStatus">;
  action: "enroll" | "revoke";
};

const StatusBadge = ({ status, label }: { status: EnrollmentStatus; label: string }) => {
  const styles: Record<EnrollmentStatus, { bg: string; color: string }> = {
    ACTIVE:  { bg: "rgba(34,197,94,0.12)", color: "rgb(21,128,61)" },
    REVOKED: { bg: "rgba(239,68,68,0.12)", color: "rgb(185,28,28)" },
    NONE:    { bg: "var(--color-surface-2)", color: "var(--color-text-muted)" }
  };
  const s = styles[status];
  return (
    <span
      className="rounded-full px-2.5 py-0.5 text-xs font-semibold"
      style={{ backgroundColor: s.bg, color: s.color }}
    >
      {label}
    </span>
  );
};

const formatDate = (value: string | null) => (value ? new Date(value).toLocaleDateString() : "-");

export const AdminStudents = () => {
  const { t, i18n } = useTranslation();
  const { locale } = useParams();
  const isAr = i18n.language === "ar";
  const prefix = locale === "en" || locale === "ar" ? `/${locale}` : "";
  const [searchValue, setSearchValue] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedSearchStudent, setSelectedSearchStudent] = useState<StudentSearchResult | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    const id = window.setTimeout(() => setDebouncedSearch(searchValue.trim()), 300);
    return () => window.clearTimeout(id);
  }, [searchValue]);

  const studentsQuery = useQuery({
    queryKey: ["admin-students"],
    queryFn: async () => {
      const response = await api.get<{ data: Student[]; pagination: { page: number; limit: number; total: number; totalPages: number } }>(
        "/admin/students", { params: { limit: 20 } }
      );
      return response.data;
    }
  });

  const searchQuery = useQuery({
    queryKey: ["admin-student-search", debouncedSearch],
    enabled: debouncedSearch.length >= 2,
    queryFn: async () => {
      const response = await api.get<{ results: StudentSearchResult[] }>("/admin/students/search", {
        params: { q: debouncedSearch, limit: 20 }
      });
      return response.data.results;
    }
  });

  const enrollMutation = useMutation({
    mutationFn: async (studentId: string) => api.post(`/admin/students/${studentId}/enroll`),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin-students"] }),
        queryClient.invalidateQueries({ queryKey: ["admin-student-search"] })
      ]);
    }
  });

  const revokeMutation = useMutation({
    mutationFn: async (studentId: string) => api.post(`/admin/students/${studentId}/revoke`),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin-students"] }),
        queryClient.invalidateQueries({ queryKey: ["admin-student-search"] })
      ]);
    }
  });

  const searchedStudent = useMemo(
    () => studentsQuery.data?.data.find((s) => s.id === selectedSearchStudent?.id) ?? selectedSearchStudent ?? null,
    [selectedSearchStudent, studentsQuery.data?.data]
  );

  const isMutating = enrollMutation.isPending || revokeMutation.isPending;
  const students = studentsQuery.data?.data ?? [];
  const activeCount = students.filter((student) => student.enrollmentStatus === "ACTIVE").length;
  const revokedCount = students.filter((student) => student.enrollmentStatus === "REVOKED").length;

  const getStatusLabel = (status: EnrollmentStatus): string => {
    const keyMap: Record<EnrollmentStatus, string> = {
      ACTIVE: "Active",
      REVOKED: "Revoked",
      NONE: "None"
    };
    return t(`admin.students.status${keyMap[status]}`);
  };

  const openAction = (student: PendingAction["student"], action: PendingAction["action"]) => {
    setActionError(null);
    setPendingAction({ student, action });
  };

  const confirmAction = async () => {
    if (!pendingAction) return;
    try {
      setActionError(null);
      if (pendingAction.action === "enroll") {
        await enrollMutation.mutateAsync(pendingAction.student.id);
      } else {
        await revokeMutation.mutateAsync(pendingAction.student.id);
      }
      setPendingAction(null);
      setSelectedSearchStudent(null);
    } catch (error) {
      const apiError = error as AxiosError<{ message?: string; error?: string }>;
      setActionError(apiError.response?.data?.message ?? apiError.response?.data?.error ?? "Action failed.");
    }
  };

  const renderActions = (student: PendingAction["student"]) =>
    student.enrollmentStatus === "ACTIVE" ? (
      <button
        className="rounded-lg border px-3 py-2 text-xs font-semibold transition-colors hover:bg-red-50 dark:hover:bg-red-900/20"
        style={{ borderColor: "rgba(239,68,68,0.4)", color: "rgb(185,28,28)" }}
        onClick={() => openAction(student, "revoke")}
        type="button"
      >
        {t("actions.revokeAccess")}
      </button>
    ) : (
      <button
        className="rounded-lg px-3 py-2 text-xs font-semibold text-white transition-all hover:opacity-95"
        style={{ background: "var(--gradient-brand)" }}
        onClick={() => openAction(student, "enroll")}
        type="button"
      >
        {t("actions.enroll")}
      </button>
    );

  return (
    <AdminShell title={t("admin.students.title")} description={t("admin.students.desc")}>
      <section className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="dashboard-panel dashboard-panel--accent p-5">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-600">{t("admin.students.totalStudents")}</p>
            <p className="mt-2 font-display text-3xl font-bold" style={{ color: "var(--color-text-primary)" }}>{students.length}</p>
          </div>
          <div className="dashboard-panel p-5">
            <p className="text-xs font-bold uppercase tracking-[0.16em]" style={{ color: "var(--color-text-muted)" }}>{t("admin.students.activeAccess")}</p>
            <p className="mt-2 font-display text-3xl font-bold" style={{ color: "var(--color-text-primary)" }}>{activeCount}</p>
          </div>
          <div className="dashboard-panel p-5">
            <p className="text-xs font-bold uppercase tracking-[0.16em]" style={{ color: "var(--color-text-muted)" }}>{t("admin.students.revoked")}</p>
            <p className="mt-2 font-display text-3xl font-bold" style={{ color: "var(--color-text-primary)" }}>{revokedCount}</p>
          </div>
        </div>

        <div className="dashboard-panel p-5">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-600">{t("admin.students.searchTitle")}</p>
              <p className="mt-1 text-sm" style={{ color: "var(--color-text-secondary)" }}>
                {t("admin.students.searchDesc")}
              </p>
            </div>
          </div>

          <Combobox value={selectedSearchStudent} onChange={setSelectedSearchStudent}>
            <div className="relative">
              <ComboboxInput
                aria-label="Search students"
                className="w-full rounded-xl border px-3 py-2.5 text-sm outline-none transition-all placeholder:opacity-40 focus:ring-2 focus:ring-brand-600/30 sm:max-w-md"
                style={{
                  backgroundColor: "var(--color-surface-2)",
                  borderColor: "var(--color-border-strong)",
                  color: "var(--color-text-primary)"
                }}
                displayValue={(s: StudentSearchResult | null) => s?.fullName ?? searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                placeholder={t("admin.students.searchPlaceholder")}
              />
              <Search className="pointer-events-none absolute end-3 top-3 h-4 w-4" style={{ color: "var(--color-text-muted)" }} />
              <ComboboxOptions
                className="absolute z-50 mt-2 max-h-72 w-full max-w-md overflow-auto rounded-xl border p-1 shadow-elevated"
                style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border-strong)" }}
              >
                {searchQuery.isLoading ? (
                  <div className="space-y-2 p-2">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ) : null}

                {debouncedSearch.length >= 2 && searchQuery.data?.length === 0 ? (
                  <div className="px-3 py-2 text-sm" style={{ color: "var(--color-text-muted)" }}>{t("admin.students.noStudentsFound")}</div>
                ) : null}

                {searchQuery.data?.map((student) => (
                  <ComboboxOption
                    key={student.id}
                    className={({ active }) =>
                      cn(
                        "cursor-pointer rounded-lg px-3 py-2.5 text-sm transition-colors",
                        active ? "bg-brand-600/10 text-brand-600" : ""
                      )
                    }
                    value={student}
                  >
                    <div className="font-semibold" style={{ color: "var(--color-text-primary)" }}>{student.fullName}</div>
                    <div className="text-xs" style={{ color: "var(--color-text-muted)" }}>{student.email}</div>
                  </ComboboxOption>
                ))}
              </ComboboxOptions>
            </div>
          </Combobox>

          {searchedStudent ? (
            <div className="dashboard-panel dashboard-panel--accent mt-4 flex flex-wrap items-center justify-between gap-3 rounded-[22px] p-4">
              <div>
                <p className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>{searchedStudent.fullName}</p>
                <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>{searchedStudent.email}</p>
              </div>
              <div className="flex items-center gap-3">
                <StatusBadge
                  status={searchedStudent.enrollmentStatus}
                  label={getStatusLabel(searchedStudent.enrollmentStatus)}
                />
                <Link
                  className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-xs font-semibold no-underline transition-colors hover:bg-surface2"
                  style={{ borderColor: "var(--color-border-strong)", color: "var(--color-text-primary)" }}
                  to={`${prefix}/admin/students/${searchedStudent.id}`}
                >
                  {t("admin.students.openDetail")}
                  <ArrowRight className="icon-dir h-3.5 w-3.5" />
                </Link>
                {renderActions(searchedStudent)}
              </div>
            </div>
          ) : null}
        </div>

        <div className="dashboard-panel overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b px-5 py-4" style={{ borderColor: "var(--color-border)" }}>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-600">{t("admin.students.studentRoster")}</p>
              <p className="mt-1 text-sm" style={{ color: "var(--color-text-secondary)" }}>
                {t("admin.students.rosterDesc")}
              </p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--color-border)" }}>
                  {[
                    t("admin.students.tableHeaderStudent"),
                    t("admin.students.tableHeaderStatus"),
                    t("admin.students.tableHeaderType"),
                    t("admin.students.tableHeaderEnrolled"),
                    t("admin.students.tableHeaderCompletion"),
                    t("admin.students.tableHeaderActions")
                  ].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-start text-xs font-bold uppercase tracking-[0.16em]"
                      style={{ color: "var(--color-text-muted)" }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {studentsQuery.isLoading
                  ? Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i} style={{ borderBottom: "1px solid var(--color-border)" }}>
                        {Array.from({ length: 6 }).map((_, j) => (
                          <td key={j} className="px-4 py-3">
                            <Skeleton className="h-5 w-full" />
                          </td>
                        ))}
                      </tr>
                    ))
                  : null}

                {students.map((student) => (
                  <tr key={student.id} className="transition-colors hover:bg-surface2" style={{ borderBottom: "1px solid var(--color-border)" }}>
                    <td className="px-4 py-3">
                      <Link className="flex items-center gap-2.5 no-underline" to={`${prefix}/admin/students/${student.id}`}>
                        <span
                          className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                          style={{ backgroundColor: "var(--color-brand)" }}
                        >
                          {student.fullName.charAt(0).toUpperCase()}
                        </span>
                        <div>
                          <p className="font-semibold" style={{ color: "var(--color-text-primary)" }}>{student.fullName}</p>
                          <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>{student.email}</p>
                        </div>
                      </Link>
                    </td>
                    <td className="px-4 py-3"><StatusBadge
                      status={student.enrollmentStatus}
                      label={getStatusLabel(student.enrollmentStatus)}
                    /></td>
                    <td className="px-4 py-3 text-xs" style={{ color: "var(--color-text-secondary)" }}>{student.enrollmentType ?? "-"}</td>
                    <td className="px-4 py-3 text-xs" style={{ color: "var(--color-text-secondary)" }}>{formatDate(student.enrolledAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="tabular-nums text-xs font-semibold" style={{ color: "var(--color-text-primary)" }}>{student.courseCompletion}%</span>
                        <div className="h-1.5 w-16 overflow-hidden rounded-full" style={{ backgroundColor: "var(--color-surface-2)" }}>
                          <div className="h-full rounded-full" style={{ width: `${student.courseCompletion}%`, background: "var(--gradient-brand)" }} />
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <Link
                          className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-xs font-semibold no-underline transition-colors hover:bg-surface2"
                          style={{ borderColor: "var(--color-border-strong)", color: "var(--color-text-primary)" }}
                          to={`${prefix}/admin/students/${student.id}`}
                        >
                          {t("admin.students.openDetail")}
                          <ArrowRight className="icon-dir h-3.5 w-3.5" />
                        </Link>
                        {renderActions(student)}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {!studentsQuery.isLoading && students.length === 0 ? (
            <div className="p-8">
              <EmptyState
                illustration={<Users className="mx-auto h-10 w-10 text-brand-600" />}
                title={t("admin.students.noStudentsYet")}
                description={t("admin.students.noStudentsYetDesc")}
                action={<div className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium" style={{ backgroundColor: "var(--color-brand-muted)", color: "var(--color-brand)" }}><UserPlus className="h-3.5 w-3.5" />{t("admin.students.createAccountsFirst")}</div>}
              />
            </div>
          ) : null}
        </div>
      </section>

      <Dialog open={Boolean(pendingAction)} onOpenChange={(open) => !open && setPendingAction(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{pendingAction?.action === "revoke" ? t("admin.students.revokeTitle") : t("admin.students.enrollTitle")}</DialogTitle>
            <DialogDescription>
              {pendingAction?.action === "revoke"
                ? `${pendingAction.student.fullName} ${t("admin.students.revokeMessage")}`
                : `${pendingAction?.student.fullName ?? "This student"} ${t("admin.students.enrollMessage")}`}
            </DialogDescription>
          </DialogHeader>

          {actionError ? (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-400">
              {actionError}
            </p>
          ) : null}

          <DialogFooter>
            <button
              className="rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors hover:bg-surface2"
              style={{ borderColor: "var(--color-border-strong)", color: "var(--color-text-primary)" }}
              disabled={isMutating}
              onClick={() => setPendingAction(null)}
              type="button"
            >
              {t("actions.cancel")}
            </button>
            <button
              className={cn(
                "rounded-xl px-4 py-2.5 text-sm font-bold text-white transition-all disabled:opacity-60",
                pendingAction?.action === "revoke" ? "bg-red-600 hover:bg-red-700" : "hover:opacity-95"
              )}
              style={pendingAction?.action === "revoke" ? undefined : { background: "var(--gradient-brand)" }}
              disabled={isMutating}
              onClick={() => void confirmAction()}
              type="button"
            >
              {isMutating ? t("admin.students.working") : pendingAction?.action === "revoke" ? t("actions.revokeAccess") : t("actions.enroll")}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminShell>
  );
};
