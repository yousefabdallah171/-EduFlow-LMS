import { PrismaClient, MediaFile, MediaFolder, MediaStatus, MediaType } from '@prisma/client';
import fs from 'node:fs/promises';
import path from 'node:path';

export class MediaService {
  constructor(private db: PrismaClient) {}

  // MediaFolder operations
  async createFolder(name: string, parentId: string | null, createdById: string): Promise<MediaFolder> {
    return this.db.mediaFolder.create({
      data: {
        name,
        parentId,
        createdById,
      },
    });
  }

  async getFolders(): Promise<MediaFolder[]> {
    return this.db.mediaFolder.findMany({
      include: {
        children: true,
        _count: { select: { files: true } },
      },
    });
  }

  async getFolderById(id: string): Promise<MediaFolder | null> {
    return this.db.mediaFolder.findUnique({
      where: { id },
      include: {
        children: true,
        files: true,
      },
    });
  }

  async updateFolder(id: string, name: string): Promise<MediaFolder> {
    return this.db.mediaFolder.update({
      where: { id },
      data: { name },
    });
  }

  async deleteFolder(id: string): Promise<MediaFolder> {
    return this.db.mediaFolder.delete({
      where: { id },
    });
  }

  // MediaFile operations
  async createMediaFile(data: {
    title: string;
    type: MediaType;
    originalFilename: string;
    mimeType?: string;
    sizeBytes: bigint;
    folderId?: string;
    uploadedById: string;
    tusUploadId?: string;
  }): Promise<MediaFile> {
    return this.db.mediaFile.create({
      data: {
        ...data,
        status: 'UPLOADING' as MediaStatus,
      },
    });
  }

  async getMediaFiles(filters?: {
    folderId?: string;
    type?: MediaType;
    status?: MediaStatus;
    search?: string;
    skip?: number;
    take?: number;
  }): Promise<{ files: MediaFile[]; total: number }> {
    const where: any = {};

    if (filters?.folderId) {
      where.folderId = filters.folderId;
    }
    if (filters?.type) {
      where.type = filters.type;
    }
    if (filters?.status) {
      where.status = filters.status;
    }
    if (filters?.search) {
      where.OR = [
        { title: { contains: filters.search, mode: 'insensitive' } },
        { originalFilename: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const [files, total] = await Promise.all([
      this.db.mediaFile.findMany({
        where,
        include: { uploadedBy: { select: { id: true, fullName: true } } },
        orderBy: { createdAt: 'desc' },
        skip: filters?.skip,
        take: filters?.take,
      }),
      this.db.mediaFile.count({ where }),
    ]);

    return { files, total };
  }

  async getMediaFileById(id: string): Promise<(MediaFile & { uploadedBy: any }) | null> {
    return this.db.mediaFile.findUnique({
      where: { id },
      include: { uploadedBy: { select: { id: true, fullName: true, email: true } } },
    });
  }

  async updateMediaFile(id: string, data: Partial<{
    title: string;
    status: MediaStatus;
    storagePath: string;
    hlsPath: string;
    durationSeconds: number;
    folderId: string | null;
    errorMessage: string | null;
  }>): Promise<MediaFile> {
    return this.db.mediaFile.update({
      where: { id },
      data,
    });
  }

  async deleteMediaFile(id: string): Promise<MediaFile> {
    const file = await this.db.mediaFile.findUnique({ where: { id } });
    if (!file) throw new Error('MediaFile not found');

    // Delete physical files from storage
    if (file.storagePath) {
      try {
        await fs.unlink(file.storagePath);
      } catch (err) {
        console.warn(`Failed to delete storage file: ${file.storagePath}`, err);
      }
    }

    if (file.hlsPath) {
      try {
        const hlsDir = path.dirname(file.hlsPath);
        await fs.rm(hlsDir, { recursive: true, force: true });
      } catch (err) {
        console.warn(`Failed to delete HLS directory: ${file.hlsPath}`, err);
      }
    }

    return this.db.mediaFile.delete({ where: { id } });
  }

  async moveMediaFilesToFolder(fileIds: string[], folderId: string | null): Promise<void> {
    await this.db.mediaFile.updateMany({
      where: { id: { in: fileIds } },
      data: { folderId },
    });
  }

  async linkMediaToLesson(mediaFileId: string, lessonId: string): Promise<any> {
    const lesson = await this.db.lesson.update({
      where: { id: lessonId },
      data: { mediaFileId },
      include: { mediaFile: true },
    });
    return lesson;
  }

  async unlinkMediaFromLesson(lessonId: string): Promise<any> {
    return this.db.lesson.update({
      where: { id: lessonId },
      data: { mediaFileId: null },
    });
  }

  async updateMediaFileStatus(id: string, status: MediaStatus, errorMessage?: string): Promise<MediaFile> {
    return this.db.mediaFile.update({
      where: { id },
      data: {
        status,
        errorMessage: errorMessage || null,
      },
    });
  }
}
