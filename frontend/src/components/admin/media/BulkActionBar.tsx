import { useState } from "react";

type BulkActionBarProps = {
  selectedIds: string[];
  onMoveToFolder: (folderId: string | null) => Promise<void>;
  onApplyTitlePrefix: (prefix: string) => Promise<void>;
  onClearSelection: () => void;
};

export function BulkActionBar({ selectedIds, onMoveToFolder, onApplyTitlePrefix, onClearSelection }: BulkActionBarProps) {
  const [folderId, setFolderId] = useState("");
  const [prefix, setPrefix] = useState("");

  if (selectedIds.length === 0) {
    return null;
  }

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">{selectedIds.length} selected</span>
        <input
          value={folderId}
          onChange={(event) => setFolderId(event.target.value)}
          placeholder="Folder ID"
          className="rounded-md border border-gray-300 px-2 py-1 text-xs dark:border-gray-600 dark:bg-gray-800"
        />
        <button
          type="button"
          className="rounded-md border border-gray-300 px-2 py-1 text-xs font-medium dark:border-gray-600"
          onClick={() => void onMoveToFolder(folderId.trim() || null)}
        >
          Move
        </button>
        <input
          value={prefix}
          onChange={(event) => setPrefix(event.target.value)}
          placeholder="Title prefix"
          className="rounded-md border border-gray-300 px-2 py-1 text-xs dark:border-gray-600 dark:bg-gray-800"
        />
        <button
          type="button"
          className="rounded-md border border-gray-300 px-2 py-1 text-xs font-medium dark:border-gray-600"
          onClick={() => void onApplyTitlePrefix(prefix.trim())}
        >
          Apply Prefix
        </button>
        <button
          type="button"
          className="rounded-md border border-gray-300 px-2 py-1 text-xs font-medium dark:border-gray-600"
          onClick={onClearSelection}
        >
          Clear
        </button>
      </div>
    </section>
  );
}
