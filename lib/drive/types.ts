export type DriveFolderItem = {
  id: string;
  parentId: string | null;
  name: string;
  createdAt: string;
  updatedAt: string;
  fileCount: number;
  childFolderCount: number;
};

export type DriveFolderTreeNode = DriveFolderItem & {
  children: DriveFolderTreeNode[];
};

export type DriveFileItem = {
  id: string;
  folderId: string | null;
  name: string;
  mimeType: string;
  sizeBytes: number;
  uploadedByClerkUserId: string;
  createdAt: string;
  updatedAt: string;
  shareCount: number;
};

export type DriveShareItem = {
  id: string;
  fileId: string | null;
  folderId: string | null;
  clientId: string;
  clientName: string;
  permission: "read";
  sharedByClerkUserId: string;
  createdAt: string;
};

export type DriveFolderContents = {
  folder: DriveFolderItem | null;
  folders: DriveFolderItem[];
  files: DriveFileItem[];
  page: number;
  limit: number;
  totalFiles: number;
};

export type ClientDriveFileItem = DriveFileItem & {
  sharedVia: "file" | "folder";
  folderPath: string[];
};

export type DriveStorageQuota = {
  usedBytes: number;
  limitBytes: number;
  usedPercent: number;
};
