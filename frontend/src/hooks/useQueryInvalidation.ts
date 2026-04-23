import { useQueryClient } from "@tanstack/react-query";

/**
 * Hook to manage React Query cache invalidation across the app
 * Provides typed methods to invalidate specific query keys after mutations
 */
export const useQueryInvalidation = () => {
  const queryClient = useQueryClient();

  return {
    // Auth-related invalidations
    invalidateAuthUser: () => {
      queryClient.invalidateQueries({ queryKey: ["auth-user"] });
    },

    // Enrollment-related invalidations
    invalidateEnrollmentStatus: () => {
      queryClient.invalidateQueries({ queryKey: ["enrollment-status"] });
    },

    // Dashboard-related invalidations
    invalidateStudentDashboard: () => {
      queryClient.invalidateQueries({ queryKey: ["student-dashboard"] });
    },

    // Lesson-related invalidations
    invalidateLesson: (lessonId?: string) => {
      if (lessonId) {
        queryClient.invalidateQueries({ queryKey: ["lesson", lessonId] });
      } else {
        queryClient.invalidateQueries({ queryKey: ["lesson"] });
      }
    },

    invalidateLessons: () => {
      queryClient.invalidateQueries({ queryKey: ["lessons"] });
    },

    invalidateAdminLessons: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-lessons"] });
    },

    // Progress-related invalidations
    invalidateProgress: (lessonId?: string) => {
      if (lessonId) {
        queryClient.invalidateQueries({ queryKey: ["progress", lessonId] });
      } else {
        queryClient.invalidateQueries({ queryKey: ["progress"] });
      }
    },

    invalidateCourseProgress: () => {
      queryClient.invalidateQueries({ queryKey: ["course-progress"] });
    },

    // Notes-related invalidations
    invalidateNotes: (lessonId?: string) => {
      if (lessonId) {
        queryClient.invalidateQueries({ queryKey: ["notes", lessonId] });
      } else {
        queryClient.invalidateQueries({ queryKey: ["notes"] });
      }
    },

    // Video-related invalidations
    invalidateVideoToken: (lessonId: string) => {
      queryClient.invalidateQueries({ queryKey: ["video-token", lessonId] });
    },

    invalidateVideoPreview: () => {
      queryClient.invalidateQueries({ queryKey: ["video-preview"] });
    },

    // Student admin-related invalidations
    invalidateStudentList: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-students"] });
    },

    invalidateStudentDetail: (studentId: string) => {
      queryClient.invalidateQueries({ queryKey: ["student-detail", studentId] });
    },

    invalidateStudentSearch: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-students-search"] });
    },

    // Order/Payment-related invalidations
    invalidateOrders: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },

    invalidatePaymentStatus: (orderId: string) => {
      queryClient.invalidateQueries({ queryKey: ["payment-status", orderId] });
    },

    // Analytics-related invalidations
    invalidateAnalytics: () => {
      queryClient.invalidateQueries({ queryKey: ["analytics"] });
    },

    // Bulk invalidations for common scenarios
    invalidateAfterEnrollment: () => {
      queryClient.invalidateQueries({ queryKey: ["enrollment-status"] });
      queryClient.invalidateQueries({ queryKey: ["student-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["lessons"] });
    },

    invalidateAfterProgressUpdate: () => {
      queryClient.invalidateQueries({ queryKey: ["progress"] });
      queryClient.invalidateQueries({ queryKey: ["student-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["course-progress"] });
    },

    invalidateAfterLessonUpdate: () => {
      queryClient.invalidateQueries({ queryKey: ["lesson"] });
      queryClient.invalidateQueries({ queryKey: ["lessons"] });
      queryClient.invalidateQueries({ queryKey: ["admin-lessons"] });
    },

    invalidateAfterStudentUpdate: (studentId: string) => {
      queryClient.invalidateQueries({ queryKey: ["student-detail", studentId] });
      queryClient.invalidateQueries({ queryKey: ["admin-students"] });
    },

    // Clear all cache
    clearAll: () => {
      queryClient.clear();
    }
  };
};
