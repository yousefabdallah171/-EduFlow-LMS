import type { Request, Response } from "express";
import type { Prisma } from "@prisma/client";
import { sectionRepository } from "../../repositories/section.repository.js";
import { lessonService } from "../../services/lesson.service.js";

const getFirstValue = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

export const getAllSections = async (req: Request, res: Response): Promise<void> => {
  try {
    const sections = await sectionRepository.getAllSections();
    res.json({ sections });
  } catch (error) {
    console.error("Error fetching sections:", error);
    res.status(500).json({ message: "Failed to fetch sections" });
  }
};

export const getSectionById = async (req: Request, res: Response): Promise<void> => {
  try {
    const sectionId = getFirstValue(req.params.sectionId);
    const section = await sectionRepository.getSectionById(sectionId as string);
    if (!section) {
      res.status(404).json({ message: "Section not found" });
      return;
    }
    res.json({ section });
  } catch (error) {
    console.error("Error fetching section:", error);
    res.status(500).json({ message: "Failed to fetch section" });
  }
};

export const createSection = async (req: Request, res: Response): Promise<void> => {
  try {
    const { titleEn, titleAr, descriptionEn, descriptionAr } = req.body as Prisma.SectionCreateInput;

    if (!titleEn || !titleAr) {
      res.status(400).json({ message: "titleEn and titleAr are required" });
      return;
    }

    const section = await sectionRepository.createSection({
      titleEn,
      titleAr,
      descriptionEn,
      descriptionAr
    });
    await lessonService.invalidatePublishedLessonsCache();
    res.status(201).json({ section });
  } catch (error) {
    console.error("Error creating section:", error);
    res.status(500).json({ message: "Failed to create section" });
  }
};

export const updateSection = async (req: Request, res: Response): Promise<void> => {
  try {
    const sectionId = getFirstValue(req.params.sectionId);
    const { titleEn, titleAr, descriptionEn, descriptionAr, sortOrder } = req.body as Prisma.SectionUpdateInput;

    const section = await sectionRepository.updateSection(sectionId as string, {
      titleEn,
      titleAr,
      descriptionEn,
      descriptionAr,
      sortOrder
    });
    await lessonService.invalidatePublishedLessonsCache();
    res.json({ section });
  } catch (error) {
    console.error("Error updating section:", error);
    res.status(500).json({ message: "Failed to update section" });
  }
};

export const deleteSection = async (req: Request, res: Response): Promise<void> => {
  try {
    const sectionId = getFirstValue(req.params.sectionId);
    await sectionRepository.deleteSection(sectionId as string);
    await lessonService.invalidatePublishedLessonsCache();
    res.json({ message: "Section deleted successfully" });
  } catch (error) {
    console.error("Error deleting section:", error);
    res.status(500).json({ message: "Failed to delete section" });
  }
};

export const reorderSections = async (req: Request, res: Response): Promise<void> => {
  try {
    const { sections } = req.body as { sections: Array<{ id: string; sortOrder: number }> };

    if (!Array.isArray(sections)) {
      res.status(400).json({ message: "sections must be an array" });
      return;
    }

    await sectionRepository.reorderSections(sections);
    await lessonService.invalidatePublishedLessonsCache();
    res.json({ message: "Sections reordered successfully" });
  } catch (error) {
    console.error("Error reordering sections:", error);
    res.status(500).json({ message: "Failed to reorder sections" });
  }
};
