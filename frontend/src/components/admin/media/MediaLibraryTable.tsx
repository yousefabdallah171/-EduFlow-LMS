import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api";
import { BulkActionBar } from "@/components/admin/media/BulkActionBar";
import { MediaStatusBadge } from "@/components/admin/media/MediaStatusBadge";

type MediaItem = {
  id: string;
  title: string;
  originalFilename: string;
  status: "UPLOADING" | "PROCESSING" | "READY" | "ERROR";
  sizeBytes: number;
  createdAt: string;
  folderId: string | null;
};

type MediaLibraryResponse = {
  items: MediaItem[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
  };
};

const formatBytes = (value: number) => {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  if (value < 1024 * 1024 * 1024) return `${(value / (1024 * 1024)).toFixed(1)} MB`;
  return `${(value / (1024 * 1024 * 1024)).toFixed(1)} GB`;
};

export function MediaLibraryTable() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const query = useQuery({
    queryKey: ["admin-media-library", search, status],
    queryFn: async () => {
      const response = await api.get<MediaLibraryResponse>("/admin/media-library", {
        params: {
          page: 1,
          pageSize: 30,
          search: search || undefined,
          status: status || undefined
        }
      });
      return response.data;
    }
  });

  const items = useMemo(() => query.data?.items ?? [], [query.data]);
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  const toggleSelection = (id: string) => {
    setSelectedIds((previous) => (previous.includes(id) ? previous.filter((entry) => entry !== id) : [...previous, id]));
  };

  const selectAllVisible = () => {
    setSelectedIds(items.map((item) => item.id));
  };

  const clearSelection = () => {
    setSelectedIds([]);
  };

  const handleMoveToFolder = async (folderId: string | null) => {
    if (selectedIds.length === 0) return;
    await api.post("/admin/media/move", { fileIds: selectedIds, folderId });
    await query.refetch();
  };

  const handleApplyPrefix = async (prefix: string) => {
    if (!prefix || selectedIds.length === 0) return;
    await Promise.all(
      selectedIds.map((id) => {
        const item = items.find((entry) => entry.id === id);
        if (!item) return Promise.resolve();
        return api.patch(`/admin/media/${id}`, {
          title: `${prefix}${item.title}`
        });
      })
    );
    await query.refetch();
  };

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search media"
          className="rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800"
        />
        <select
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800"
        >
          <option value="">All statuses</option>
          <option value="UPLOADING">Uploading</option>
          <option value="PROCESSING">Processing</option>
          <option value="READY">Ready</option>
          <option value="ERROR">Error</option>
        </select>
        <button
          type="button"
          className="rounded-md border border-gray-300 px-3 py-2 text-xs font-medium dark:border-gray-600"
          onClick={selectAllVisible}
        >
          Select Visible
        </button>
      </div>

      <BulkActionBar
        selectedIds={selectedIds}
        onMoveToFolder={handleMoveToFolder}
        onApplyTitlePrefix={handleApplyPrefix}
        onClearSelection={clearSelection}
      />

      <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
        <table className="min-w-full divide-y divide-gray-200 text-sm dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th className="px-3 py-2 text-left">Select</th>
              <th className="px-3 py-2 text-left">Title</th>
              <th className="px-3 py-2 text-left">Original file</th>
              <th className="px-3 py-2 text-left">Status</th>
              <th className="px-3 py-2 text-left">Size</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white dark:divide-gray-800 dark:bg-gray-900">
            {items.map((item) => (
              <tr key={item.id}>
                <td className="px-3 py-2">
                  <input
                    type="checkbox"
                    checked={selectedSet.has(item.id)}
                    onChange={() => toggleSelection(item.id)}
                  />
                </td>
                <td className="px-3 py-2 font-medium">{item.title}</td>
                <td className="px-3 py-2">{item.originalFilename}</td>
                <td className="px-3 py-2">
                  <MediaStatusBadge status={item.status} />
                </td>
                <td className="px-3 py-2">{formatBytes(item.sizeBytes)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {query.isLoading && <p className="text-xs text-gray-500">Loading media…</p>}
      {items.length === 0 && !query.isLoading && <p className="text-xs text-gray-500">No media found.</p>}
    </section>
  );
}
