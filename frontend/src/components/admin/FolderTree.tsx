import { useState } from "react";
import { ChevronDown, ChevronRight, Folder, FolderPlus, Trash2 } from "lucide-react";

interface MediaFolder {
  id: string;
  name: string;
  parentId: string | null;
  createdById: string;
  createdAt: Date;
}

interface FolderTreeProps {
  folders: MediaFolder[];
  selectedFolderId: string | null;
  onSelectFolder: (folderId: string | null) => void;
  onCreateFolder: (name: string, parentId?: string) => void;
  onDeleteFolder: (id: string) => void;
}

interface FolderWithChildren extends MediaFolder {
  children?: FolderWithChildren[];
}

function buildTree(folders: MediaFolder[]): FolderWithChildren[] {
  const folderMap = new Map<string, FolderWithChildren>();

  folders.forEach((folder) => {
    folderMap.set(folder.id, { ...folder, children: [] });
  });

  const roots: FolderWithChildren[] = [];
  folderMap.forEach((folder) => {
    if (folder.parentId && folderMap.has(folder.parentId)) {
      const parent = folderMap.get(folder.parentId)!;
      if (!parent.children) parent.children = [];
      parent.children.push(folder);
    } else {
      roots.push(folder);
    }
  });

  return roots;
}

function FolderNode({
  folder,
  selectedFolderId,
  onSelectFolder,
  onDeleteFolder,
  onCreateFolder,
  level = 0
}: {
  folder: FolderWithChildren;
  selectedFolderId: string | null;
  onSelectFolder: (id: string | null) => void;
  onDeleteFolder: (id: string) => void;
  onCreateFolder: (name: string, parentId?: string) => void;
  level?: number;
}) {
  const [isExpanded, setIsExpanded] = useState(level === 0);
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");

  const handleCreateFolder = () => {
    if (newFolderName.trim()) {
      onCreateFolder(newFolderName.trim(), folder.id);
      setNewFolderName("");
      setShowNewFolder(false);
      setIsExpanded(true);
    }
  };

  return (
    <div>
      <div
        className={`flex items-center gap-2 px-3 py-2 rounded cursor-pointer transition-colors ${
          selectedFolderId === folder.id
            ? "bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-100"
            : "hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
        }`}
        style={{ paddingLeft: `${12 + level * 16}px` }}
      >
        {folder.children && folder.children.length > 0 && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
            className="p-0"
          >
            {isExpanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </button>
        )}
        {(!folder.children || folder.children.length === 0) && (
          <div className="w-4" />
        )}

        <Folder className="w-4 h-4 flex-shrink-0" />
        <span
          onClick={() => onSelectFolder(folder.id)}
          className="flex-1 truncate text-sm"
        >
          {folder.name}
        </span>

        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowNewFolder(!showNewFolder);
          }}
          className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
          title="New folder"
        >
          <FolderPlus className="w-4 h-4" />
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onDeleteFolder(folder.id);
          }}
          className="p-1 hover:bg-red-100 dark:hover:bg-red-900 rounded"
          title="Delete folder"
        >
          <Trash2 className="w-4 h-4 text-red-500" />
        </button>
      </div>

      {showNewFolder && (
        <div
          className="flex gap-2 px-3 py-2"
          style={{ paddingLeft: `${12 + (level + 1) * 16}px` }}
        >
          <input
            autoFocus
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onBlur={handleCreateFolder}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreateFolder();
              if (e.key === "Escape") setShowNewFolder(false);
            }}
            placeholder="New folder name"
            className="flex-1 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          />
        </div>
      )}

      {isExpanded && folder.children && folder.children.length > 0 && (
        <div>
          {folder.children.map((child) => (
            <FolderNode
              key={child.id}
              folder={child}
              selectedFolderId={selectedFolderId}
              onSelectFolder={onSelectFolder}
              onDeleteFolder={onDeleteFolder}
              onCreateFolder={onCreateFolder}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function FolderTree({
  folders,
  selectedFolderId,
  onSelectFolder,
  onCreateFolder,
  onDeleteFolder
}: FolderTreeProps) {
  const [showRootNewFolder, setShowRootNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");

  const handleCreateRootFolder = () => {
    if (newFolderName.trim()) {
      onCreateFolder(newFolderName.trim());
      setNewFolderName("");
      setShowRootNewFolder(false);
    }
  };

  const tree = buildTree(folders);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900 dark:text-white">Folders</h3>
        <button
          onClick={() => setShowRootNewFolder(!showRootNewFolder)}
          className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
          title="New folder"
        >
          <FolderPlus className="w-4 h-4" />
        </button>
      </div>

      {/* Root folder (all files) */}
      <div
        className={`flex items-center gap-2 px-3 py-2 rounded cursor-pointer transition-colors mb-2 ${
          selectedFolderId === null
            ? "bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-100"
            : "hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
        }`}
        onClick={() => onSelectFolder(null)}
      >
        <Folder className="w-4 h-4" />
        <span className="flex-1 text-sm">All Files</span>
      </div>

      {showRootNewFolder && (
        <div className="flex gap-2 px-3 py-2 mb-2">
          <input
            autoFocus
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onBlur={handleCreateRootFolder}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreateRootFolder();
              if (e.key === "Escape") setShowRootNewFolder(false);
            }}
            placeholder="New folder name"
            className="flex-1 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          />
        </div>
      )}

      {/* Folder tree */}
      <div className="space-y-0 overflow-y-auto max-h-96">
        {tree.map((folder) => (
          <FolderNode
            key={folder.id}
            folder={folder}
            selectedFolderId={selectedFolderId}
            onSelectFolder={onSelectFolder}
            onDeleteFolder={onDeleteFolder}
            onCreateFolder={onCreateFolder}
            level={0}
          />
        ))}
      </div>
    </div>
  );
}
