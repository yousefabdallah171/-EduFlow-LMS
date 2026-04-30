import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Trash2 } from "lucide-react";

import { AdminShell } from "@/components/layout/AdminShell";
import { api } from "@/lib/api";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

interface Ban {
  id: string;
  banType: string;
  ipAddress?: string;
  email?: string;
  reason: string;
  notes?: string;
  expiresAt?: string;
  createdAt: string;
  isActive: boolean;
}

interface Stats {
  activeBans: number;
  totalBanEvents: number;
  whitelistCount: number;
}

interface WhitelistEntry {
  id: string;
  ipAddress: string;
  reason?: string;
  createdAt: string;
}

export const AdminSecurity = () => {
  const { t } = useTranslation();
  const [liftDialogOpen, setLiftDialogOpen] = useState(false);
  const [selectedBan, setSelectedBan] = useState<Ban | null>(null);
  const [liftReason, setLiftReason] = useState("");
  const [whitelistDialogOpen, setWhitelistDialogOpen] = useState(false);
  const [newIp, setNewIp] = useState("");
  const [newIpReason, setNewIpReason] = useState("");

  // Stats
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["admin-security-stats"],
    queryFn: async () => {
      const res = await api.get<Stats>("/admin/security/stats");
      return res.data;
    }
  });

  // Bans
  const { data: bansData, isLoading: bansLoading, refetch: refetchBans } = useQuery({
    queryKey: ["admin-security-bans"],
    queryFn: async () => {
      const res = await api.get<Ban[]>("/admin/security/bans?isActive=true");
      return res.data;
    }
  });

  // Whitelist
  const { data: whitelistData, isLoading: whitelistLoading, refetch: refetchWhitelist } = useQuery({
    queryKey: ["admin-security-whitelist"],
    queryFn: async () => {
      const res = await api.get<WhitelistEntry[]>("/admin/security/whitelist");
      return res.data;
    }
  });

  // Lift Ban
  const { mutate: liftBan, isPending: liftPending } = useMutation({
    mutationFn: async (banId: string) => {
      await api.delete(`/admin/security/bans/${banId}`, {
        data: { reason: liftReason }
      });
    },
    onSuccess: () => {
      refetchBans();
      setLiftDialogOpen(false);
      setSelectedBan(null);
      setLiftReason("");
    }
  });

  // Add to Whitelist
  const { mutate: addWhitelist, isPending: addWhitelistPending } = useMutation({
    mutationFn: async () => {
      await api.post("/admin/security/whitelist", {
        ipAddress: newIp,
        reason: newIpReason
      });
    },
    onSuccess: () => {
      refetchWhitelist();
      setWhitelistDialogOpen(false);
      setNewIp("");
      setNewIpReason("");
    }
  });

  // Remove from Whitelist
  const { mutate: removeWhitelist } = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/admin/security/whitelist/${id}`);
    },
    onSuccess: () => {
      refetchWhitelist();
    }
  });

  return (
    <AdminShell title="Security" description="Manage security bans, whitelists, and access controls">
      <section className="space-y-5">
        {/* Stats Row */}
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="dashboard-panel dashboard-panel--accent p-5">
            {statsLoading ? (
              <Skeleton className="h-10 w-full" />
            ) : (
              <div>
                <p className="text-sm font-medium" style={{ color: "var(--color-text-secondary)" }}>
                  Active Bans
                </p>
                <p className="mt-1 text-2xl font-bold" style={{ color: "var(--color-text-primary)" }}>
                  {stats?.activeBans ?? 0}
                </p>
              </div>
            )}
          </div>

          <div className="dashboard-panel dashboard-panel--accent p-5">
            {statsLoading ? (
              <Skeleton className="h-10 w-full" />
            ) : (
              <div>
                <p className="text-sm font-medium" style={{ color: "var(--color-text-secondary)" }}>
                  Total Ban Events
                </p>
                <p className="mt-1 text-2xl font-bold" style={{ color: "var(--color-text-primary)" }}>
                  {stats?.totalBanEvents ?? 0}
                </p>
              </div>
            )}
          </div>

          <div className="dashboard-panel dashboard-panel--accent p-5">
            {statsLoading ? (
              <Skeleton className="h-10 w-full" />
            ) : (
              <div>
                <p className="text-sm font-medium" style={{ color: "var(--color-text-secondary)" }}>
                  Whitelisted IPs
                </p>
                <p className="mt-1 text-2xl font-bold" style={{ color: "var(--color-text-primary)" }}>
                  {stats?.whitelistCount ?? 0}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="dashboard-panel overflow-hidden">
          <Tabs defaultValue="bans" className="w-full">
            <TabsList className="border-b" style={{ borderColor: "var(--color-border)" }}>
              <TabsTrigger value="bans">Active Bans</TabsTrigger>
              <TabsTrigger value="whitelist">Whitelist</TabsTrigger>
            </TabsList>

            {/* Bans Tab */}
            <TabsContent value="bans" className="p-5">
              <div className="space-y-4">
                {bansLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ) : (bansData?.length ?? 0) === 0 ? (
                  <p style={{ color: "var(--color-text-secondary)" }}>No active bans</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr style={{ borderBottom: "1px solid var(--color-border)" }}>
                          <th className="py-2 text-left font-semibold" style={{ color: "var(--color-text-secondary)" }}>
                            Type
                          </th>
                          <th className="py-2 text-left font-semibold" style={{ color: "var(--color-text-secondary)" }}>
                            Target
                          </th>
                          <th className="py-2 text-left font-semibold" style={{ color: "var(--color-text-secondary)" }}>
                            Reason
                          </th>
                          <th className="py-2 text-left font-semibold" style={{ color: "var(--color-text-secondary)" }}>
                            Expires
                          </th>
                          <th className="py-2 text-left font-semibold" style={{ color: "var(--color-text-secondary)" }}>
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {bansData?.map((ban) => (
                          <tr key={ban.id} style={{ borderBottom: "1px solid var(--color-border)" }}>
                            <td className="py-3" style={{ color: "var(--color-text-primary)" }}>
                              <span
                                className="inline-block rounded-full px-2.5 py-1 text-xs font-semibold"
                                style={{ backgroundColor: "var(--color-surface-2)" }}
                              >
                                {ban.banType}
                              </span>
                            </td>
                            <td className="py-3 font-mono text-xs" style={{ color: "var(--color-text-primary)" }}>
                              {ban.ipAddress || ban.email || "—"}
                            </td>
                            <td className="py-3" style={{ color: "var(--color-text-secondary)" }}>
                              {ban.reason}
                            </td>
                            <td className="py-3 text-xs" style={{ color: "var(--color-text-secondary)" }}>
                              {ban.expiresAt
                                ? new Date(ban.expiresAt).toLocaleDateString()
                                : "Permanent"}
                            </td>
                            <td className="py-3">
                              <Dialog open={liftDialogOpen && selectedBan?.id === ban.id} onOpenChange={setLiftDialogOpen}>
                                <DialogTrigger asChild>
                                  <button
                                    onClick={() => setSelectedBan(ban)}
                                    className="inline-flex items-center gap-1.5 rounded px-2 py-1 text-xs font-medium transition-colors hover:bg-red-50"
                                    style={{ color: "var(--color-text-primary)" }}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                    Lift
                                  </button>
                                </DialogTrigger>
                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle>Lift Ban</DialogTitle>
                                    <DialogDescription>
                                      Enter a reason for lifting this ban.
                                    </DialogDescription>
                                  </DialogHeader>
                                  <div className="space-y-4">
                                    <Input
                                      placeholder="Reason for lifting (e.g., 'User appeal approved')"
                                      value={liftReason}
                                      onChange={(e) => setLiftReason(e.target.value)}
                                    />
                                    <div className="flex gap-2">
                                      <button
                                        onClick={() => setLiftDialogOpen(false)}
                                        className="flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors"
                                        style={{ backgroundColor: "var(--color-surface-2)" }}
                                      >
                                        Cancel
                                      </button>
                                      <button
                                        onClick={() => selectedBan && liftBan(selectedBan.id)}
                                        disabled={liftPending || !liftReason.trim()}
                                        className="flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                                        style={{ background: "var(--gradient-brand)" }}
                                      >
                                        {liftPending ? "Lifting..." : "Lift Ban"}
                                      </button>
                                    </div>
                                  </div>
                                </DialogContent>
                              </Dialog>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Whitelist Tab */}
            <TabsContent value="whitelist" className="p-5">
              <div className="space-y-4">
                <Dialog open={whitelistDialogOpen} onOpenChange={setWhitelistDialogOpen}>
                  <DialogTrigger asChild>
                    <button
                      className="rounded-lg px-4 py-2.5 text-sm font-semibold text-white"
                      style={{ background: "var(--gradient-brand)" }}
                    >
                      Add IP to Whitelist
                    </button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Whitelist IP Address</DialogTitle>
                      <DialogDescription>
                        Add an IP address to the whitelist to bypass rate limiting.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <Input
                        placeholder="IP Address (e.g., 203.0.113.10)"
                        value={newIp}
                        onChange={(e) => setNewIp(e.target.value)}
                      />
                      <Input
                        placeholder="Reason (optional)"
                        value={newIpReason}
                        onChange={(e) => setNewIpReason(e.target.value)}
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => setWhitelistDialogOpen(false)}
                          className="flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors"
                          style={{ backgroundColor: "var(--color-surface-2)" }}
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => addWhitelist()}
                          disabled={addWhitelistPending || !newIp.trim()}
                          className="flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                          style={{ background: "var(--gradient-brand)" }}
                        >
                          {addWhitelistPending ? "Adding..." : "Add to Whitelist"}
                        </button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>

                {whitelistLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ) : (whitelistData?.length ?? 0) === 0 ? (
                  <p style={{ color: "var(--color-text-secondary)" }}>No whitelisted IPs</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr style={{ borderBottom: "1px solid var(--color-border)" }}>
                          <th className="py-2 text-left font-semibold" style={{ color: "var(--color-text-secondary)" }}>
                            IP Address
                          </th>
                          <th className="py-2 text-left font-semibold" style={{ color: "var(--color-text-secondary)" }}>
                            Reason
                          </th>
                          <th className="py-2 text-left font-semibold" style={{ color: "var(--color-text-secondary)" }}>
                            Added At
                          </th>
                          <th className="py-2 text-left font-semibold" style={{ color: "var(--color-text-secondary)" }}>
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {whitelistData?.map((entry) => (
                          <tr key={entry.id} style={{ borderBottom: "1px solid var(--color-border)" }}>
                            <td className="py-3 font-mono text-sm" style={{ color: "var(--color-text-primary)" }}>
                              {entry.ipAddress}
                            </td>
                            <td className="py-3 text-sm" style={{ color: "var(--color-text-secondary)" }}>
                              {entry.reason || "—"}
                            </td>
                            <td className="py-3 text-xs" style={{ color: "var(--color-text-secondary)" }}>
                              {new Date(entry.createdAt).toLocaleDateString()}
                            </td>
                            <td className="py-3">
                              <button
                                onClick={() => removeWhitelist(entry.id)}
                                className="inline-flex items-center gap-1.5 rounded px-2 py-1 text-xs font-medium transition-colors hover:bg-red-50"
                                style={{ color: "var(--color-text-primary)" }}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                Remove
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </section>
    </AdminShell>
  );
};
