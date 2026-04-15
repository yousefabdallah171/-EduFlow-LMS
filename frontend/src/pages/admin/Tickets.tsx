import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { AdminShell } from "@/components/layout/AdminShell";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { api } from "@/lib/api";

type Message = { id: string; body: string; createdAt: string; sender: { fullName: string; role: string } };
type Ticket = { id: string; subject: string; status: string; createdAt: string; user: { fullName: string; email: string }; messages: Message[] };

export const AdminTickets = () => {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [selected, setSelected] = useState<Ticket | null>(null);
  const [reply, setReply] = useState("");
  const [filter, setFilter] = useState<"all" | "open" | "resolved">("all");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-tickets", filter],
    queryFn: () =>
      api.get<{ tickets: Ticket[] }>(
        `/admin/tickets${filter !== "all" ? `?status=${filter.toUpperCase()}` : ""}`
      ).then((r) => r.data)
  });

  const replyMut = useMutation({
    mutationFn: ({ id, body }: { id: string; body: string }) => api.post(`/admin/tickets/${id}/reply`, { message: body }),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ["admin-tickets"] }); setReply(""); toast.success("Reply sent"); }
  });

  const resolveMut = useMutation({
    mutationFn: (id: string) => api.patch(`/admin/tickets/${id}/status`, { status: "RESOLVED" }),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ["admin-tickets"] }); setSelected(null); toast.success("Ticket resolved"); }
  });

  const openCount = data?.tickets?.filter(t => t.status === "OPEN").length ?? 0;
  const resolvedCount = data?.tickets?.filter(t => t.status === "RESOLVED").length ?? 0;

  return (
    <AdminShell title={t("admin.tickets.title")} description={t("admin.tickets.desc")}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');

        .tickets-container { font-family: 'Plus Jakarta Sans', sans-serif; }
        .ticket-item {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          border-left: 3px solid transparent;
          position: relative;
          animation: slideIn 0.4s ease-out forwards;
          animation-fill-mode: both;
        }
        .ticket-item:nth-child(1) { animation-delay: 0.05s; }
        .ticket-item:nth-child(2) { animation-delay: 0.1s; }
        .ticket-item:nth-child(3) { animation-delay: 0.15s; }
        .ticket-item:nth-child(n+4) { animation-delay: 0.2s; }
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(-8px); }
          to { opacity: 1; transform: translateX(0); }
        }
        .ticket-item:hover {
          border-left-color: #eb2027;
          transform: translateX(2px);
        }
        .ticket-item.active { background: rgba(235, 32, 39, 0.04); border-left-color: #eb2027; }
        .filter-btn {
          position: relative;
          font-size: 13px;
          font-weight: 500;
          letter-spacing: 0.3px;
          transition: all 0.2s ease;
        }
        .filter-btn::after {
          content: '';
          position: absolute;
          bottom: -4px;
          left: 0;
          width: 0;
          height: 2px;
          background: #eb2027;
          transition: width 0.3s ease;
        }
        .filter-btn.active::after { width: 100%; }
        .message-bubble {
          animation: fadeInUp 0.3s ease-out;
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .admin-bubble { background: linear-gradient(135deg, #eb2027 0%, rgba(235, 32, 39, 0.1) 100%); }
        .customer-bubble { background: rgba(0, 0, 0, 0.03); }
        .reply-input {
          transition: all 0.2s ease;
          border: 1.5px solid rgba(0,0,0,0.06);
        }
        .reply-input:focus {
          border-color: #eb2027;
          box-shadow: 0 0 0 3px rgba(235, 32, 39, 0.1);
        }
        .reply-btn {
          background: linear-gradient(135deg, #eb2027 0%, #c4191f 100%);
          transition: all 0.2s ease;
          font-weight: 600;
          letter-spacing: 0.3px;
        }
        .reply-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 16px rgba(235, 32, 39, 0.3);
        }
        .reply-btn:disabled { opacity: 0.4; }
        .stat-card {
          background: linear-gradient(135deg, rgba(235, 32, 39, 0.05) 0%, rgba(235, 32, 39, 0.02) 100%);
          border: 1px solid rgba(235, 32, 39, 0.1);
          border-radius: 12px;
          padding: 16px;
        }
        .stat-number { font-size: 28px; font-weight: 700; color: #eb2027; }
        .stat-label { font-size: 12px; font-weight: 500; color: var(--color-text-muted); letter-spacing: 0.5px; }
      `}</style>

      <div className="tickets-container space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-4">
          <div className="stat-card">
            <div className="stat-number">{openCount}</div>
            <div className="stat-label">OPEN TICKETS</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{resolvedCount}</div>
            <div className="stat-label">RESOLVED</div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-6 border-b" style={{ borderColor: "var(--color-border)" }}>
          {(["all", "open", "resolved"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`filter-btn pb-3 uppercase transition-colors ${
                filter === f ? "active" : ""
              }`}
              style={{ color: filter === f ? "#eb2027" : "var(--color-text-muted)" }}
            >
              {f === "all" ? "All Tickets" : f === "open" ? "Open" : "Resolved"}
            </button>
          ))}
        </div>

        {/* Tickets List */}
        <div className="rounded-2xl border overflow-hidden" style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-surface)" }}>
          {isLoading ? (
            <div className="p-6 space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-16 rounded-lg" />
              ))}
            </div>
          ) : (data?.tickets ?? []).length === 0 ? (
            <div className="p-12 text-center">
              <p style={{ color: "var(--color-text-muted)", fontSize: "14px" }}>
                {filter === "all" && "No support tickets yet."}
                {filter === "open" && "All tickets resolved! Great work."}
                {filter === "resolved" && "No resolved tickets."}
              </p>
            </div>
          ) : (
            <div className="divide-y" style={{ borderColor: "var(--color-border)" }}>
              {(data?.tickets ?? []).map((ticket) => (
                <div
                  key={ticket.id}
                  onClick={() => setSelected(ticket)}
                  className={`ticket-item flex items-center justify-between gap-4 px-6 py-4 cursor-pointer ${
                    selected?.id === ticket.id ? "active" : ""
                  }`}
                  style={{ backgroundColor: selected?.id === ticket.id ? "rgba(235, 32, 39, 0.04)" : "transparent" }}
                >
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-sm font-600 mb-1 truncate"
                      style={{ color: "var(--color-text-primary)" }}
                    >
                      {ticket.subject}
                    </p>
                    <div className="flex items-center gap-3 text-xs" style={{ color: "var(--color-text-muted)" }}>
                      <span>{ticket.user.fullName}</span>
                      <span>·</span>
                      <span>{new Date(ticket.createdAt).toLocaleDateString()}</span>
                      <span>·</span>
                      <span>{ticket.messages.length} message{ticket.messages.length !== 1 ? "s" : ""}</span>
                    </div>
                  </div>
                  <Badge variant={ticket.status === "RESOLVED" ? "default" : "outline"}>
                    {ticket.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Ticket Detail Sheet */}
      <Sheet open={!!selected} onOpenChange={(o) => { if (!o) setSelected(null); }}>
        <SheetContent className="w-full sm:max-w-2xl flex flex-col" style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}>
          <SheetHeader className="border-b pb-4" style={{ borderColor: "var(--color-border)" }}>
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <SheetTitle style={{ color: "var(--color-text-primary)", fontSize: "20px", fontWeight: 700 }}>
                  {selected?.subject}
                </SheetTitle>
                <p className="text-sm mt-2" style={{ color: "var(--color-text-muted)" }}>
                  {selected?.user.fullName} · {selected?.user.email}
                </p>
              </div>
              <Badge variant={selected?.status === "RESOLVED" ? "default" : "outline"}>
                {selected?.status}
              </Badge>
            </div>
          </SheetHeader>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto py-6 px-4 space-y-4">
            {selected?.messages.map((msg, idx) => (
              <div
                key={msg.id}
                className={`message-bubble flex ${msg.sender.role === "ADMIN" ? "justify-end" : "justify-start"}`}
                style={{ animationDelay: `${idx * 0.1}s` }}
              >
                <div
                  className={`rounded-2xl px-5 py-3 max-w-xs ${
                    msg.sender.role === "ADMIN"
                      ? "admin-bubble text-white rounded-br-none"
                      : "customer-bubble text-left rounded-bl-none"
                  }`}
                  style={{
                    color: msg.sender.role === "ADMIN" ? "white" : "var(--color-text-primary)"
                  }}
                >
                  <p className="text-xs font-600 mb-1 opacity-90">{msg.sender.fullName}</p>
                  <p className="text-sm leading-relaxed">{msg.body}</p>
                  <p className={`text-xs mt-2 ${msg.sender.role === "ADMIN" ? "opacity-75" : "opacity-60"}`}>
                    {new Date(msg.createdAt).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Reply Section */}
          {selected?.status !== "RESOLVED" && (
            <div className="border-t pt-4 space-y-3" style={{ borderColor: "var(--color-border)" }}>
              <textarea
                rows={3}
                className="reply-input w-full rounded-xl border px-4 py-3 text-sm outline-none"
                style={{ backgroundColor: "var(--color-page)", borderColor: "var(--color-border-strong)", color: "var(--color-text-primary)", resize: "none" }}
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                placeholder="Type your response here..."
              />
              <div className="flex gap-2">
                <button
                  onClick={() => selected && void replyMut.mutateAsync({ id: selected.id, body: reply })}
                  disabled={!reply || replyMut.isPending}
                  className="reply-btn flex-1 rounded-lg py-3 text-sm text-white disabled:opacity-50"
                  type="button"
                >
                  {replyMut.isPending ? "Sending..." : "Send Reply"}
                </button>
                <button
                  onClick={() => selected && void resolveMut.mutateAsync(selected.id)}
                  disabled={selected?.status === "RESOLVED"}
                  className="flex-1 rounded-lg border px-4 py-3 text-sm font-600 transition-all hover:bg-surface2 disabled:opacity-40"
                  style={{ borderColor: "var(--color-border-strong)", color: "var(--color-text-secondary)" }}
                  type="button"
                >
                  Mark Resolved
                </button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </AdminShell>
  );
};
