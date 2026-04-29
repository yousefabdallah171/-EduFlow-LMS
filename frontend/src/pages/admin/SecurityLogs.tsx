import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { AdminShell } from "@/components/layout/AdminShell";
import { EmptyState } from "@/components/shared/EmptyState";
import { api } from "@/lib/api";

type SecurityLogEntry = {
  id: string;
  type: "LOGIN" | "REGISTER" | "PASSWORD_RESET" | "RESEND_VERIFICATION";
  result: string;
  ipAddress: string;
  emailAttempted: string | null;
  fingerprintId: string | null;
  fingerprint: { hash: string } | null;
  attemptNumber: number;
  createdAt: string;
  banApplied: boolean;
  lockoutApplied: boolean;
  captchaRequired: boolean;
};

export const AdminSecurityLogs = () => {
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");
  const [type, setType] = useState("");
  const [result, setResult] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-security-logs", page, query, type, result, from, to],
    queryFn: () =>
      api
        .get<{ data: SecurityLogEntry[]; pagination: { page: number; pages: number; total: number } }>(
          "/admin/security/logs",
          {
            params: {
              page,
              limit: 50,
              email: query || undefined,
              type: type || undefined,
              result: result || undefined,
              from: from || undefined,
              to: to || undefined
            }
          }
        )
        .then((res) => res.data)
  });

  const rows = useMemo(() => data?.data ?? [], [data?.data]);

  const clearFilters = () => {
    setQuery("");
    setType("");
    setResult("");
    setFrom("");
    setTo("");
    setPage(1);
  };

  return (
    <AdminShell title="Security Logs" description="Auth attempt events and protection actions.">
      <div className="dashboard-panel p-4 flex flex-wrap gap-3 items-end">
        <input
          className="rounded border px-3 py-2 text-sm"
          placeholder="Search email"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setPage(1); }}
        />
        <select
          className="rounded border px-3 py-2 text-sm"
          value={type}
          onChange={(e) => { setType(e.target.value); setPage(1); }}
        >
          <option value="">All types</option>
          <option value="LOGIN">LOGIN</option>
          <option value="REGISTER">REGISTER</option>
          <option value="PASSWORD_RESET">PASSWORD_RESET</option>
          <option value="RESEND_VERIFICATION">RESEND_VERIFICATION</option>
        </select>
        <select
          className="rounded border px-3 py-2 text-sm"
          value={result}
          onChange={(e) => { setResult(e.target.value); setPage(1); }}
        >
          <option value="">All results</option>
          <option value="SUCCESS">SUCCESS</option>
          <option value="FAIL_CREDENTIALS">FAIL</option>
          <option value="BLOCKED_BAN">BLOCKED</option>
          <option value="LOCKED_OUT">LOCKED</option>
          <option value="CAPTCHA_FAIL">CAPTCHA</option>
          <option value="FLOOD_LIMIT">FLOOD</option>
          <option value="RATE_LIMITED">RATE LIMITED</option>
        </select>
        <div className="flex items-center gap-2">
          <label className="text-xs">From</label>
          <input
            type="date"
            className="rounded border px-3 py-2 text-sm"
            value={from}
            onChange={(e) => { setFrom(e.target.value); setPage(1); }}
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs">To</label>
          <input
            type="date"
            className="rounded border px-3 py-2 text-sm"
            value={to}
            onChange={(e) => { setTo(e.target.value); setPage(1); }}
          />
        </div>
        {(query || type || result || from || to) && (
          <button className="rounded border px-3 py-2 text-xs" onClick={clearFilters}>
            Clear
          </button>
        )}
      </div>

      <div className="dashboard-panel overflow-x-auto mt-5">
        {isLoading ? (
          <div className="p-5 text-sm">Loading...</div>
        ) : rows.length === 0 ? (
          <EmptyState title="No security events found" description="Try changing filters." icon="SL" />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="px-3 py-2 text-left">Timestamp</th>
                <th className="px-3 py-2 text-left">Type</th>
                <th className="px-3 py-2 text-left">Result</th>
                <th className="px-3 py-2 text-left">IP</th>
                <th className="px-3 py-2 text-left">Email</th>
                <th className="px-3 py-2 text-left">Fingerprint</th>
                <th className="px-3 py-2 text-left">Attempt</th>
                <th className="px-3 py-2 text-left">Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b">
                  <td className="px-3 py-2 whitespace-nowrap">{new Date(row.createdAt).toLocaleString()}</td>
                  <td className="px-3 py-2">{row.type}</td>
                  <td className="px-3 py-2">
                    <span
                      className={
                        row.result === "SUCCESS"
                          ? "text-green-600 font-medium"
                          : row.result === "BLOCKED_BAN"
                          ? "text-red-600 font-medium"
                          : row.result === "LOCKED_OUT" || row.result === "FLOOD_LIMIT"
                          ? "text-orange-600 font-medium"
                          : "text-yellow-600"
                      }
                    >
                      {row.result}
                    </span>
                  </td>
                  <td className="px-3 py-2 font-mono text-xs">{row.ipAddress}</td>
                  <td className="px-3 py-2">{row.emailAttempted ?? "-"}</td>
                  <td className="px-3 py-2 font-mono text-xs">
                    {row.fingerprint?.hash ? `${row.fingerprint.hash.slice(0, 12)}…` : "-"}
                  </td>
                  <td className="px-3 py-2">{row.attemptNumber}</td>
                  <td className="px-3 py-2">
                    {row.banApplied ? "Ban" : row.lockoutApplied ? "Lockout" : row.captchaRequired ? "CAPTCHA" : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between">
        <button
          className="rounded border px-3 py-2 text-sm"
          disabled={page <= 1}
          onClick={() => setPage((p) => Math.max(1, p - 1))}
        >
          Prev
        </button>
        <p className="text-sm">
          Page {data?.pagination.page ?? page} / {data?.pagination.pages ?? 1}
          {data ? ` · ${data.pagination.total} total` : ""}
        </p>
        <button
          className="rounded border px-3 py-2 text-sm"
          disabled={(data?.pagination.pages ?? 1) <= page}
          onClick={() => setPage((p) => p + 1)}
        >
          Next
        </button>
      </div>
    </AdminShell>
  );
};
