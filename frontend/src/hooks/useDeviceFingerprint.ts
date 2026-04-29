import FingerprintJS from "@fingerprintjs/fingerprintjs";
import { useEffect, useState } from "react";

const STORAGE_KEY = "eduflow_device_fingerprint_v1";

const sha256Hex = async (input: string): Promise<string> => {
  const encoded = new TextEncoder().encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-256", encoded);
  const bytes = Array.from(new Uint8Array(hashBuffer));
  return bytes.map((b) => b.toString(16).padStart(2, "0")).join("");
};

export const useDeviceFingerprint = () => {
  const [fingerprintHash, setFingerprintHash] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        const cached = sessionStorage.getItem(STORAGE_KEY);
        if (cached) {
          if (mounted) {
            setFingerprintHash(cached);
            setIsLoading(false);
          }
          return;
        }

        const fp = await FingerprintJS.load();
        const result = await fp.get();
        const hash = await sha256Hex(`${result.visitorId}:${navigator.userAgent}`);
        sessionStorage.setItem(STORAGE_KEY, hash);

        if (mounted) {
          setFingerprintHash(hash);
        }
      } catch {
        if (mounted) {
          setFingerprintHash(null);
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    void init();

    return () => {
      mounted = false;
    };
  }, []);

  return { fingerprintHash, isLoading };
};
