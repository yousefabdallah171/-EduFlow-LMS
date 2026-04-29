import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { AdminShell } from "@/components/layout/AdminShell";
import { api } from "@/lib/api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";

type Ban = {
  id: string;
  banType: string;
  reason: string;
  ipAddress: string | null;
  email: string | null;
  isPermanent: boolean;
  createdAt: string;
  expiresAt: string | null;
};

type Whitelist = { id: string; ipAddress: string; reason: string | null; createdAt: string };

const invalidateSecurity = async (qc: ReturnType<typeof useQueryClient>) => {
  await Promise.all([
    qc.invalidateQueries({ queryKey: ["admin-security-bans"] }),
    qc.invalidateQueries({ queryKey: ["admin-security-stats"] })
  ]);
};

export const AdminSecurity = () => {
  const qc = useQueryClient();
  const [whitelistIp, setWhitelistIp] = useState("");
  const [banIp, setBanIp] = useState("");
  const [banIsPermanent, setBanIsPermanent] = useState(false);
  const [banHours, setBanHours] = useState("1");

  // Unban confirmation dialog
  const [unbanTarget, setUnbanTarget] = useState<Ban | null>(null);
  const [unbanReason, setUnbanReason] = useState("Manual unban by admin");
  const [isUnbanning, setIsUnbanning] = useState(false);

  // Extend ban dialog
  const [extendTarget, setExtendTarget] = useState<Ban | null>(null);
  const [extendHours, setExtendHours] = useState("24");
  const [isExtending, setIsExtending] = useState(false);

  const { data: stats } = useQuery({
    queryKey: ["admin-security-stats"],
    queryFn: () =>
      api
        .get("/admin/security/stats")
        .then((res) => res.data as { activeBans: number; bansToday: number; attemptsBlockedToday: number; whitelistedIps: number })
  });

  const { data: bans } = useQuery({
    queryKey: ["admin-security-bans"],
    queryFn: () =>
      api
        .get("/admin/security/bans", { params: { isActive: true, limit: 100 } })
        .then((res) => res.data as { data: Ban[] })
  });

  const { data: whitelist } = useQuery({
    queryKey: ["admin-security-whitelist"],
    queryFn: () => api.get("/admin/security/whitelist").then((res) => res.data as Whitelist[])
  });

  const handleUnban = async () => {
    if (!unbanTarget || !unbanReason.trim()) return;
    setIsUnbanning(true);
    try {
      await api.delete(`/admin/security/bans/${unbanTarget.id}`, { data: { reason: unbanReason } });
      toast.success("Ban lifted. Attempt counters reset.");
      setUnbanTarget(null);
      setUnbanReason("Manual unban by admin");
      await invalidateSecurity(qc);
    } catch {
      toast.error("Failed to lift ban");
    } finally {
      setIsUnbanning(false);
    }
  };

  const handleExtend = async () => {
    if (!extendTarget) return;
    const hours = Math.max(1, Number(extendHours) || 24);
    setIsExtending(true);
    try {
      await api.patch(`/admin/security/bans/${extendTarget.id}`, { durationSeconds: hours * 3600 });
      toast.success(`Ban extended by ${hours}h`);
      setExtendTarget(null);
      await invalidateSecurity(qc);
    } catch {
      toast.error("Failed to extend ban");
    } finally {
      setIsExtending(false);
    }
  };

  const handleAddBan = async () => {
    if (!banIp.trim()) return;
    try {
      await api.post("/admin/security/bans", {
        banType: "IP",
        reason: "MANUAL_ADMIN",
        ipAddress: banIp.trim(),
        isPermanent: banIsPermanent,
        durationSeconds: banIsPermanent ? undefined : Number(banHours) * 3600
      });
      setBanIp("");
      toast.success("Ban added");
      await invalidateSecurity(qc);
    } catch {
      toast.error("Failed to add ban");
    }
  };

  return (
    <AdminShell title="Security" description="Manage bans, whitelist, and security stats.">
      {/* Stats */}
      <div className="grid gap-3 md:grid-cols-4">
        <div className="dashboard-panel p-4">
          <p className="text-xs">Active bans</p>
          <p className="text-2xl font-bold">{stats?.activeBans ?? 0}</p>
        </div>
        <div className="dashboard-panel p-4">
          <p className="text-xs">Bans today</p>
          <p className="text-2xl font-bold">{stats?.bansToday ?? 0}</p>
        </div>
        <div className="dashboard-panel p-4">
          <p className="text-xs">Attempts blocked today</p>
          <p className="text-2xl font-bold">{stats?.attemptsBlockedToday ?? 0}</p>
        </div>
        <div className="dashboard-panel p-4">
          <p className="text-xs">Whitelisted IPs</p>
          <p className="text-2xl font-bold">{stats?.whitelistedIps ?? 0}</p>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2 mt-5">
        {/* Active Bans */}
        <div className="dashboard-panel p-4 space-y-4">
          <h2 className="font-semibold">Active Bans</h2>

          <div className="space-y-2">
            <input
              className="w-full rounded border px-3 py-2 text-sm"
              placeholder="IP address to ban"
              value={banIp}
              onChange={(e) => setBanIp(e.target.value)}
            />
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={banIsPermanent}
                  onChange={(e) => setBanIsPermanent(e.target.checked)}
                />
                Permanent
              </label>
              {!banIsPermanent && (
                <div className="flex items-center gap-1 text-sm">
                  <input
                    type="number"
                    min="1"
                    className="w-16 rounded border px-2 py-1 text-sm"
                    value={banHours}
                    onChange={(e) => setBanHours(e.target.value)}
                  />
                  <span>hours</span>
                </div>
              )}
              <button
                className="rounded border px-3 py-2 text-sm"
                onClick={handleAddBan}
                disabled={!banIp.trim()}
              >
                Add Ban
              </button>
            </div>
          </div>

          <div className="space-y-2">
            {(bans?.data ?? []).map((ban) => (
              <div key={ban.id} className="rounded border p-3 text-sm flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-medium truncate">
                    {ban.banType} — {ban.ipAddress ?? ban.email ?? "-"}
                    {ban.isPermanent && <span className="ms-2 text-xs text-red-600">[PERMANENT]</span>}
                  </p>
                  <p className="text-xs">
                    {ban.reason}
                    {ban.expiresAt && !ban.isPermanent
                      ? ` · Expires ${new Date(ban.expiresAt).toLocaleString()}`
                      : ""}
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  {!ban.isPermanent && (
                    <button
                      className="rounded border px-2 py-1 text-xs"
                      onClick={() => { setExtendTarget(ban); setExtendHours("24"); }}
                    >
                      Extend
                    </button>
                  )}
                  <button
                    className="rounded border px-2 py-1 text-xs text-red-600"
                    onClick={() => { setUnbanTarget(ban); setUnbanReason("Manual unban by admin"); }}
                  >
                    Unban
                  </button>
                </div>
              </div>
            ))}
            {(bans?.data ?? []).length === 0 && (
              <p className="text-xs">No active bans.</p>
            )}
          </div>
        </div>

        {/* Whitelist */}
        <div className="dashboard-panel p-4 space-y-4">
          <h2 className="font-semibold">IP Whitelist</h2>
          <div className="space-y-2">
            <input
              className="w-full rounded border px-3 py-2 text-sm"
              placeholder="IP address to whitelist"
              value={whitelistIp}
              onChange={(e) => setWhitelistIp(e.target.value)}
            />
            <button
              className="rounded border px-3 py-2 text-sm"
              disabled={!whitelistIp.trim()}
              onClick={async () => {
                try {
                  await api.post("/admin/security/whitelist", { ipAddress: whitelistIp.trim(), reason: "Manual whitelist" });
                  setWhitelistIp("");
                  toast.success("IP added to whitelist");
                  await qc.invalidateQueries({ queryKey: ["admin-security-whitelist"] });
                  await qc.invalidateQueries({ queryKey: ["admin-security-stats"] });
                } catch {
                  toast.error("Failed to whitelist IP");
                }
              }}
            >
              Add IP
            </button>
          </div>

          <div className="space-y-2">
            {(whitelist ?? []).map((entry) => (
              <div key={entry.id} className="rounded border p-3 text-sm flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium font-mono">{entry.ipAddress}</p>
                  <p className="text-xs">{entry.reason ?? "-"}</p>
                </div>
                <button
                  className="rounded border px-2 py-1 text-xs"
                  onClick={async () => {
                    try {
                      await api.delete(`/admin/security/whitelist/${entry.id}`);
                      toast.success("Removed from whitelist");
                      await qc.invalidateQueries({ queryKey: ["admin-security-whitelist"] });
                      await qc.invalidateQueries({ queryKey: ["admin-security-stats"] });
                    } catch {
                      toast.error("Failed to remove whitelist entry");
                    }
                  }}
                >
                  Remove
                </button>
              </div>
            ))}
            {(whitelist ?? []).length === 0 && (
              <p className="text-xs">No whitelisted IPs. Admin IPs are auto-added on login.</p>
            )}
          </div>
        </div>
      </div>

      {/* Unban Confirmation Dialog */}
      <Dialog open={!!unbanTarget} onOpenChange={(open) => { if (!open) setUnbanTarget(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Lift ban</DialogTitle>
            <DialogDescription>
              Remove the {unbanTarget?.banType} ban on{" "}
              <strong>{unbanTarget?.ipAddress ?? unbanTarget?.email ?? "-"}</strong>.
              This will also reset the attempt counter so the user can log in immediately.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <label className="block text-sm mb-1">Reason</label>
            <input
              className="w-full rounded border px-3 py-2 text-sm"
              value={unbanReason}
              onChange={(e) => setUnbanReason(e.target.value)}
              placeholder="Reason for lifting ban"
            />
          </div>
          <DialogFooter>
            <button
              className="rounded border px-4 py-2 text-sm"
              onClick={() => setUnbanTarget(null)}
              disabled={isUnbanning}
            >
              Cancel
            </button>
            <button
              className="rounded bg-destructive text-destructive-foreground px-4 py-2 text-sm font-medium"
              onClick={handleUnban}
              disabled={isUnbanning || !unbanReason.trim()}
            >
              {isUnbanning ? "Lifting…" : "Confirm Unban"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Extend Ban Dialog */}
      <Dialog open={!!extendTarget} onOpenChange={(open) => { if (!open) setExtendTarget(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Extend ban</DialogTitle>
            <DialogDescription>
              Extend the ban on{" "}
              <strong>{extendTarget?.ipAddress ?? extendTarget?.email ?? "-"}</strong>{" "}
              by additional hours from now.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2 flex items-center gap-3">
            <label className="text-sm">Hours to add</label>
            <input
              type="number"
              min="1"
              max="8760"
              className="w-24 rounded border px-3 py-2 text-sm"
              value={extendHours}
              onChange={(e) => setExtendHours(e.target.value)}
            />
          </div>
          <DialogFooter>
            <button
              className="rounded border px-4 py-2 text-sm"
              onClick={() => setExtendTarget(null)}
              disabled={isExtending}
            >
              Cancel
            </button>
            <button
              className="rounded border px-4 py-2 text-sm font-medium"
              onClick={handleExtend}
              disabled={isExtending}
            >
              {isExtending ? "Extending…" : `Extend by ${extendHours}h`}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminShell>
  );
};
