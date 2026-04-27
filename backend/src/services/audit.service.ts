import { prisma } from "../config/database.js";

export type AuditLogAction =
  | "ENROLL_STUDENT"
  | "REVOKE_STUDENT"
  | "UPDATE_COURSE_SETTINGS"
  | "EXPORT_STUDENT_DATA"
  | "UPDATE_ENROLLMENT_STATUS"
  | "DELETE_STUDENT";

export const auditService = {
  async log(
    adminId: string,
    action: AuditLogAction,
    targetType: string,
    targetId: string,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    try {
      await prisma.auditLog.create({
        data: {
          adminId,
          action,
          targetType,
          targetId,
          metadata: metadata || {}
        }
      });
    } catch (error) {
      // Fail silently - audit logging should not break main operations
      console.error("Audit log failed:", error);
    }
  },

  async logEnrollmentChange(
    adminId: string,
    studentId: string,
    action: "ENROLL_STUDENT" | "REVOKE_STUDENT" | "UPDATE_ENROLLMENT_STATUS",
    previousStatus: string | null,
    newStatus: string,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    await this.log(adminId, action, "Enrollment", studentId, {
      previousStatus,
      newStatus,
      ...metadata
    });
  },

  async logSettingsUpdate(
    adminId: string,
    changes: Record<string, { oldValue: unknown; newValue: unknown }>
  ): Promise<void> {
    await this.log(adminId, "UPDATE_COURSE_SETTINGS", "CourseSettings", "default", {
      changes
    });
  },

  async logDataExport(adminId: string, exportType: string, recordCount: number): Promise<void> {
    await this.log(adminId, "EXPORT_STUDENT_DATA", "Export", "default", {
      exportType,
      recordCount,
      timestamp: new Date().toISOString()
    });
  }
};
