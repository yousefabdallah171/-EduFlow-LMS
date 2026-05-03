import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { AdminShell } from "@/components/layout/AdminShell";
import { EmptyState } from "@/components/shared/EmptyState";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { getAdminUiCopy } from "@/lib/admin-ui-copy";
import { api } from "@/lib/api";
import { formatDate, resolveLocale } from "@/lib/locale";

type Message = { id: string; body: string; createdAt: string; sender: { fullName: string; role: string } };
type Ticket = { id: string; subject: string; status: string; createdAt: string; user: { fullName: string; email: string }; messages: Message[] };

export const AdminTickets = () => {
  const { t, i18n } = useTranslation();
  const locale = resolveLocale(i18n.language);
  const copy = getAdminUiCopy(locale);
  const isAr = locale === "ar";
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<Ticket | null>(null);
  const [reply, setReply] = useState("");
  const [filter, setFilter] = useState<"all" | "open" | "resolved">("all");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-tickets", filter],
    queryFn: () =>
      api
        .get<{ tickets: Ticket[] }>(`/admin/tickets${filter !== "all" ? `?status=${filter.toUpperCase()}` : ""}`)
        .then((response) => response.data)
  });

  const replyMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: string }) => api.post(`/admin/tickets/${id}/reply`, { message: body }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-tickets"] });
      setReply("");
      toast.success(copy.common.sendReply);
    }
  });

  const resolveMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/admin/tickets/${id}/status`, { status: "RESOLVED" }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-tickets"] });
      toast.success(copy.tickets.resolveTicket);
      setSelected(null);
    }
  });

  const tickets = useMemo(() => data?.tickets ?? [], [data?.tickets]);
  const openCount = tickets.filter((ticket) => ticket.status === "OPEN").length;
  const resolvedCount = tickets.filter((ticket) => ticket.status === "RESOLVED").length;
  const unansweredCount = tickets.filter((ticket) => {
    const lastMessage = ticket.messages[ticket.messages.length - 1];
    return lastMessage && lastMessage.sender.role !== "ADMIN";
  }).length;

  const sortedTickets = useMemo(
    () =>
      [...tickets].sort((left, right) => {
        if (left.status !== right.status) {
          if (left.status === "OPEN") return -1;
          if (right.status === "OPEN") return 1;
        }
        return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
      }),
    [tickets]
  );

  return (
    <AdminShell title={t("admin.tickets.title")} description={t("admin.tickets.desc")}>
      <section className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            { label: copy.tickets.openTickets, value: openCount, note: copy.tickets.openTicketsNote },
            { label: copy.common.resolved, value: resolvedCount, note: copy.tickets.resolvedNote },
            { label: copy.common.awaitingAdmin, value: unansweredCount, note: copy.tickets.awaitingAdminNote },
            {
              label: copy.tickets.currentView,
              value: filter === "all" ? copy.common.all : isAr ? (filter === "open" ? "مفتوح" : "تم الحل") : filter.toUpperCase(),
              note: copy.tickets.currentViewNote
            }
          ].map((item) => (
            <div key={item.label} className="dashboard-panel p-5">
              <p className="text-xs font-bold uppercase tracking-[0.16em]" style={{ color: "var(--color-text-muted)" }}>
                {item.label}
              </p>
              <p className="mt-3 text-3xl font-black tracking-tight" style={{ color: "var(--color-text-primary)" }}>
                {item.value}
              </p>
              <p className="mt-2 text-sm leading-6" style={{ color: "var(--color-text-secondary)" }}>
                {item.note}
              </p>
            </div>
          ))}
        </div>

        <div className="dashboard-panel p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-[0.16em]" style={{ color: "var(--color-text-muted)" }}>
                {copy.tickets.supportQueue}
              </p>
              <h2 className="text-2xl font-black tracking-tight" style={{ color: "var(--color-text-primary)" }}>
                {copy.tickets.title}
              </h2>
            </div>

            <div className="flex flex-wrap gap-2">
              {(["all", "open", "resolved"] as const).map((value) => (
                <button
                  key={value}
                  className="rounded-lg border px-3 py-2 text-sm font-semibold transition-colors hover:bg-surface2"
                  style={{
                    borderColor: filter === value ? "var(--color-brand)" : "var(--color-border-strong)",
                    color: filter === value ? "var(--color-brand-700)" : "var(--color-text-primary)",
                    backgroundColor: filter === value ? "var(--color-brand-muted)" : "transparent"
                  }}
                  onClick={() => setFilter(value)}
                  type="button"
                >
                  {value === "all" ? copy.tickets.allTickets : isAr ? (value === "open" ? "مفتوح" : "تم الحل") : value}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-3">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, index) => <Skeleton key={index} className="h-28 rounded-[28px]" />)
            ) : sortedTickets.length === 0 ? (
              <EmptyState
                description={copy.tickets.emptyDesc}
                eyebrow={isAr ? "الدعم" : "Support"}
                icon="TK"
                title={copy.tickets.emptyTitle}
              />
            ) : (
              sortedTickets.map((ticket) => {
                const lastMessage = ticket.messages[ticket.messages.length - 1];
                const awaitingAdmin = lastMessage && lastMessage.sender.role !== "ADMIN";

                return (
                  <button
                    key={ticket.id}
                    className="dashboard-panel w-full p-5 text-start transition-all hover:-translate-y-0.5"
                    style={{
                      borderColor: selected?.id === ticket.id ? "color-mix(in oklab, var(--color-brand) 55%, white)" : undefined,
                      boxShadow: selected?.id === ticket.id ? "0 24px 70px color-mix(in oklab, var(--color-danger) 14%, transparent)" : undefined
                    }}
                    onClick={() => setSelected(ticket)}
                    type="button"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="space-y-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant={ticket.status === "OPEN" ? "default" : "outline"}>
                            {ticket.status === "OPEN" ? (isAr ? "مفتوح" : "OPEN") : isAr ? "تم الحل" : "RESOLVED"}
                          </Badge>
                          {awaitingAdmin ? (
                            <span
                              className="rounded-full px-2.5 py-1 text-[11px] font-semibold"
                              style={{ backgroundColor: "var(--color-warning-bg)", color: "var(--color-warning)" }}
                            >
                              {copy.common.awaitingAdmin}
                            </span>
                          ) : null}
                        </div>
                        <div>
                          <h3 className="text-lg font-bold" style={{ color: "var(--color-text-primary)" }}>
                            {ticket.subject}
                          </h3>
                          <p className="mt-1 text-sm" style={{ color: "var(--color-text-secondary)" }}>
                            {ticket.user.fullName} · {ticket.user.email}
                          </p>
                        </div>
                        <p className="line-clamp-2 text-sm leading-6" style={{ color: "var(--color-text-secondary)" }}>
                          {lastMessage?.body ?? copy.tickets.noMessages}
                        </p>
                      </div>

                      <div className={isAr ? "text-start lg:text-left" : "text-start lg:text-right"}>
                        <p className="text-xs font-bold uppercase tracking-[0.16em]" style={{ color: "var(--color-text-muted)" }}>
                          {copy.tickets.updated}
                        </p>
                        <p className="mt-2 text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>
                          {formatDate(ticket.createdAt, locale)}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          <div className="dashboard-panel p-5">
            <p className="text-xs font-bold uppercase tracking-[0.16em]" style={{ color: "var(--color-text-muted)" }}>
              {copy.tickets.triageNotes}
            </p>
            <div className="mt-4 space-y-3 text-sm leading-6" style={{ color: "var(--color-text-secondary)" }}>
              {copy.tickets.triage.map((item) => (
                <p key={item}>{item}</p>
              ))}
            </div>
          </div>
        </div>
      </section>

      <Sheet open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
          <SheetHeader>
            <SheetTitle>{selected?.subject ?? copy.tickets.details}</SheetTitle>
          </SheetHeader>

          {selected ? (
            <div className="mt-6 space-y-5">
              <div
                className="rounded-2xl border p-4"
                style={{ borderColor: "var(--color-border-strong)", backgroundColor: "var(--color-surface-2)" }}
              >
                <p className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>
                  {selected.user.fullName}
                </p>
                <p className="mt-1 text-sm" style={{ color: "var(--color-text-secondary)" }}>
                  {selected.user.email}
                </p>
              </div>

              <div className="space-y-3">
                {selected.messages.map((message) => {
                  const isAdmin = message.sender.role === "ADMIN";

                  return (
                    <div
                      key={message.id}
                      className="rounded-2xl border p-4"
                      style={{
                        borderColor: "var(--color-border-strong)",
                        backgroundColor: isAdmin ? "var(--color-brand-muted)" : "var(--color-surface-2)"
                      }}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>
                          {message.sender.fullName}
                        </p>
                        <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                          {formatDate(message.createdAt, locale, { dateStyle: "medium", timeStyle: "short" })}
                        </p>
                      </div>
                      <p className="mt-3 whitespace-pre-wrap text-sm leading-7" style={{ color: "var(--color-text-secondary)" }}>
                        {message.body}
                      </p>
                    </div>
                  );
                })}
              </div>

              <div className="space-y-3">
                <label className="block text-xs font-bold uppercase tracking-[0.16em]" style={{ color: "var(--color-text-muted)" }}>
                  {copy.tickets.reply}
                </label>
                <textarea
                  rows={5}
                  className="w-full rounded-xl border px-4 py-3 text-sm outline-none focus:border-brand-600"
                  placeholder={copy.tickets.replyPlaceholder}
                  style={{
                    backgroundColor: "var(--color-page)",
                    borderColor: "var(--color-border-strong)",
                    color: "var(--color-text-primary)",
                    resize: "vertical"
                  }}
                  value={reply}
                  onChange={(event) => setReply(event.target.value)}
                />
                <div className="flex flex-wrap gap-2">
                  <button
                    className="rounded-xl px-5 py-2.5 text-sm font-bold text-white transition-all hover:opacity-95 disabled:opacity-60"
                    style={{ background: "var(--gradient-brand)" }}
                    disabled={!reply.trim() || replyMutation.isPending}
                    onClick={() => void replyMutation.mutateAsync({ id: selected.id, body: reply })}
                    type="button"
                  >
                    {copy.common.sendReply}
                  </button>
                  {selected.status !== "RESOLVED" ? (
                    <button
                      className="rounded-xl border px-5 py-2.5 text-sm font-medium"
                      style={{ borderColor: "var(--color-border-strong)", color: "var(--color-text-primary)" }}
                      onClick={() => void resolveMutation.mutateAsync(selected.id)}
                      type="button"
                    >
                      {copy.tickets.resolveTicket}
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>
    </AdminShell>
  );
};
