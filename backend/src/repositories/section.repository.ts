import type { Prisma, Section } from "@prisma/client";
import { prisma } from "../config/database.js";

export const sectionRepository = {
  async getAllSections(): Promise<
    Array<
      Section & {
        lessons: Array<{
          id: string;
          titleEn: string;
          titleAr: string;
          sortOrder: number;
          isPublished: boolean;
        }>;
      }
    >
  > {
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

  async getSectionById(
    id: string
  ): Promise<
    (Section & {
      lessons: Array<{
        id: string;
        titleEn: string;
        titleAr: string;
        sortOrder: number;
        isPublished: boolean;
      }>;
    }) | null
  > {
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

  async createSection(data: Prisma.SectionCreateInput): Promise<Section> {
    const maxSortOrder = await prisma.section.findFirst({
      orderBy: { sortOrder: "desc" },
      select: { sortOrder: true }
    });

    return prisma.section.create({
      data: {
        ...data,
        sortOrder: (maxSortOrder?.sortOrder ?? 0) + 1
      }
    });
  },

  async updateSection(id: string, data: Prisma.SectionUpdateInput): Promise<Section> {
    return prisma.section.update({
      where: { id },
      data
    });
  },

  async deleteSection(id: string): Promise<Section> {
    return prisma.section.delete({
      where: { id }
    });
  },

  async reorderSections(
    sections: Array<{ id: string; sortOrder: number }>
  ): Promise<Section[]> {
    return prisma.$transaction(
      sections.map((section) =>
        prisma.section.update({
          where: { id: section.id },
          data: { sortOrder: section.sortOrder }
        })
      )
    );
  }
};
