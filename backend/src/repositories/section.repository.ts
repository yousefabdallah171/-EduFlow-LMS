import { prisma } from "../config/database.js";

export const sectionRepository = {
  async getAllSections() {
    return prisma.section.findMany({
      include: {
        lessons: {
          select: {
            id: true,
            titleEn: true,
            titleAr: true,
            sortOrder: true,
            isPublished: true
          }
        }
      },
      orderBy: { sortOrder: "asc" }
    });
  },

  async getSectionById(id: string) {
    return prisma.section.findUnique({
      where: { id },
      include: {
        lessons: {
          select: {
            id: true,
            titleEn: true,
            titleAr: true,
            sortOrder: true,
            isPublished: true
          }
        }
      }
    });
  },

  async createSection(data: { titleEn: string; titleAr: string; descriptionEn?: string; descriptionAr?: string }) {
    return prisma.section.create({
      data: {
        ...data,
        sortOrder: (await prisma.section.count()) + 1
      }
    });
  },

  async updateSection(id: string, data: Partial<{ titleEn: string; titleAr: string; descriptionEn: string; descriptionAr: string; sortOrder: number }>) {
    return prisma.section.update({
      where: { id },
      data
    });
  },

  async deleteSection(id: string) {
    return prisma.section.delete({
      where: { id }
    });
  },

  async reorderSections(sections: Array<{ id: string; sortOrder: number }>) {
    return Promise.all(
      sections.map((section) =>
        prisma.section.update({
          where: { id: section.id },
          data: { sortOrder: section.sortOrder }
        })
      )
    );
  }
};
