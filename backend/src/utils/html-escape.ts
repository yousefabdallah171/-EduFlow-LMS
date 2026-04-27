export const escapeHtml = (text: string): string => {
  const map: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
    "/": "&#x2F;"
  };
  return text.replace(/[&<>"'\/]/g, (char) => map[char] ?? char);
};

export const escapeHtmlInObject = <T extends Record<string, any>>(obj: T, keys: (keyof T)[]): T => {
  const result = { ...obj };
  keys.forEach((key) => {
    if (typeof result[key] === "string") {
      result[key] = escapeHtml(result[key] as string) as any;
    }
  });
  return result;
};
