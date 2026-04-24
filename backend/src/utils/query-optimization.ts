/**
 * Database Query Optimization Guide
 * Prevents N+1 query problems and excessive database hits
 */

/**
 * ❌ PROBLEM: N+1 Query Pattern
 * Fetching parent then looping to fetch children = N+1 queries
 */
export const n1QueryExample = `
  // SLOW: N+1 queries (1 for lessons + N for each lesson's sections)
  const lessons = await prisma.lesson.findMany();
  const withSections = await Promise.all(
    lessons.map(lesson =>
      prisma.section.findMany({ where: { lessonId: lesson.id } })
    )
  );
`;

/**
 * ✅ SOLUTION: Use include/select to fetch related data
 * Fetches parent and children in 1 query using JOINs
 */
export const optimizedQueryExample = `
  // FAST: Single query with JOIN
  const lessonsWithSections = await prisma.lesson.findMany({
    include: {
      sections: true
    }
  });
`;

/**
 * ✅ SOLUTION: Use select for nested data
 * Only fetch fields you need
 */
export const selectExample = `
  // OPTIMAL: Single query, only needed fields
  const lessons = await prisma.lesson.findMany({
    select: {
      id: true,
      title: true,
      sections: {
        select: {
          id: true,
          title: true
        }
      }
    }
  });
`;

/**
 * Common N+1 Query Patterns in This Codebase
 *
 * AREA: Enrollment + User
 * BEFORE: Fetch enrollments, then loop to get users
 * AFTER: Use include: { user: true }
 *
 * AREA: Lessons + Sections
 * BEFORE: Fetch lessons, then fetch sections for each
 * AFTER: Use include: { sections: { include: { lessons: true } } }
 *
 * AREA: Users + Orders
 * BEFORE: Fetch users, loop to get orders for each
 * AFTER: Use include: { payments: true }
 */

export interface QueryOptimizationChecklist {
  alwaysCheck: [
    "Are you fetching parent then looping for children?",
    "Can you use include/select to fetch related data?",
    "Are you fetching fields you don't need?",
    "Is the query hitting the database in a loop?"
  ];
  neverDo: [
    "Fetch data in a loop inside a loop",
    "Use separate queries when one JOIN would work",
    "Fetch entire records when you only need some fields",
    "Make database queries in business logic (move to repository)"
  ];
}
