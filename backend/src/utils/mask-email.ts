export const maskEmail = (email: string): string => {
  const [localPart, domain] = email.split("@");

  if (!localPart || !domain) {
    return email;
  }

  return `${localPart[0]}***@${domain}`;
};
