import { Request, Response, NextFunction } from 'express';
import { MediaService } from '../../services/media.service.js';
import { prisma as db } from '../../config/database.js';
import { MediaStatus, MediaType } from '@prisma/client';

const getFirstValue = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

const mediaService = new MediaService(db);

export const mediaController = {
  // Folders
  async createFolder(req: Request, res: Response, next: NextFunction) {
    try {
      const { name, parentId } = req.body;
      const userId = (req as { user?: { id?: string } }).user?.id;

      if (!name) {
        return res.status(400).json({ error: 'Folder name is required' });
      }

      const folder = await mediaService.createFolder(name, parentId || null, userId);
      res.status(201).json(folder);
    } catch (error) {
      next(error);
    }
  },

  async getFolders(req: Request, res: Response, next: NextFunction) {
    try {
      const folders = await mediaService.getFolders();
      res.json(folders);
    } catch (error) {
      next(error);
    }
  },

  async getFolderById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = getFirstValue(req.params.id);
      const folder = await mediaService.getFolderById(id as string);

      if (!folder) {
        return res.status(404).json({ error: 'Folder not found' });
      }

      res.json(folder);
    } catch (error) {
      next(error);
    }
  },

  async updateFolder(req: Request, res: Response, next: NextFunction) {
    try {
      const id = getFirstValue(req.params.id);
      const { name } = req.body;

      if (!name) {
        return res.status(400).json({ error: 'Folder name is required' });
      }

      const folder = await mediaService.updateFolder(id as string, name);
      res.json(folder);
    } catch (error) {
      next(error);
    }
  },

  async deleteFolder(req: Request, res: Response, next: NextFunction) {
    try {
      const id = getFirstValue(req.params.id);
      await mediaService.deleteFolder(id as string);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  },

  // Media Files
  async getMediaFiles(req: Request, res: Response, next: NextFunction) {
    try {
      const { folderId, type, status, search, skip = '0', take = '20' } = req.query;

      const filters = {
        folderId: folderId as string | undefined,
        type: type as MediaType | undefined,
        status: status as MediaStatus | undefined,
        search: search as string | undefined,
        skip: parseInt(skip as string),
        take: parseInt(take as string),
      };

      const result = await mediaService.getMediaFiles(filters);
      res.json({
        data: result.files,
        total: result.total,
        skip: filters.skip,
        take: filters.take,
      });
    } catch (error) {
      next(error);
    }
  },

  async getMediaFileById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = getFirstValue(req.params.id);
      const file = await mediaService.getMediaFileById(id as string);

      if (!file) {
        return res.status(404).json({ error: 'Media file not found' });
      }

      res.json(file);
    } catch (error) {
      next(error);
    }
  },

  async updateMediaFile(req: Request, res: Response, next: NextFunction) {
    try {
      const id = getFirstValue(req.params.id);
      const { title, folderId } = req.body;

      const updateData: { title?: string; folderId?: string | null } = {};
      if (title !== undefined) updateData.title = title;
      if (folderId !== undefined) updateData.folderId = folderId || null;

      const file = await mediaService.updateMediaFile(id as string, updateData);
      res.json(file);
    } catch (error) {
      next(error);
    }
  },

  async deleteMediaFile(req: Request, res: Response, next: NextFunction) {
    try {
      const id = getFirstValue(req.params.id);
      await mediaService.deleteMediaFile(id as string);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  },

  async moveMediaFiles(req: Request, res: Response, next: NextFunction) {
    try {
      const { fileIds, folderId } = req.body;

      if (!Array.isArray(fileIds) || fileIds.length === 0) {
        return res.status(400).json({ error: 'File IDs array is required' });
      }

      await mediaService.moveMediaFilesToFolder(fileIds, folderId || null);
      res.json({ message: 'Files moved successfully' });
    } catch (error) {
      next(error);
    }
  },
};
