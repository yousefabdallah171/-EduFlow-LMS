export const buildAuthProtectionHeaders = (fingerprintHash: string | null | undefined): Record<string, string> => {
  if (!fingerprintHash) {
    return {};
  }
  return { "X-Device-Fingerprint": fingerprintHash };
};
