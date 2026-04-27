/**
 * SQL Injection Prevention Guide
 *
 * This codebase uses Prisma ORM which provides built-in protection against SQL injection.
 * Follow these guidelines to maintain security:
 */

/**
 * ✅ SAFE: Use Prisma's parameterized queries (default)
 * All where, select, create, update operations use parameterized queries
 */
export const safeExample = `
  // Safe - uses Prisma's parameterized syntax
  await prisma.user.findUnique({
    where: { id: userId }
  });

  // Safe - nested where clauses
  await prisma.lesson.findMany({
    where: {
      title: { contains: searchTerm },
      isPublished: true
    }
  });
`;

/**
 * ✅ SAFE: Use Prisma's raw query with template literals
 * Template literals in Prisma.$queryRaw are properly escaped
 */
export const rawQuerySafeExample = `
  // Safe - uses template literals with proper escaping
  const coupon = await prisma.$queryRaw\`
    SELECT * FROM "Coupon"
    WHERE "code" = \${code}
    AND "deletedAt" IS NULL
  \`;
`;

/**
 * ❌ DANGEROUS: String concatenation in queries
 * Never concatenate user input into SQL strings
 */
export const dangerousExample = `
  // DANGEROUS - never do this!
  const query = "SELECT * FROM users WHERE id = " + userId;
  const result = await prisma.$queryRaw(query);

  // DANGEROUS - string interpolation
  const query2 = \`SELECT * FROM users WHERE name = '\${userName}'\`;
`;

/**
 * Input validation checklist
 */
export const sqlInjectionPreventionChecklist = {
  alwaysUse: [
    "Prisma ORM for queries",
    "Parameterized queries (where, select, etc.)",
    "Template literals with $queryRaw",
    "Zod/validators for input validation"
  ],
  neverUse: [
    "String concatenation in SQL",
    "String interpolation with user input",
    "Direct SQL string construction",
    "eval() or similar dynamic code execution"
  ],
  validate: [
    "Validate input types before database queries",
    "Use Zod schemas for request bodies",
    "Whitelist allowed characters for search queries",
    "Limit query depth to prevent DoS"
  ]
};

/**
 * Type-safe where clause construction
 * Use Prisma types for compile-time safety
 */
export interface SafeWhereExample {
  // Correct: where clause type is enforced by Prisma
  example: `const where: Prisma.UserWhereInput = {
    email: { contains: searchTerm },
    role: "STUDENT"
  };`;
}
