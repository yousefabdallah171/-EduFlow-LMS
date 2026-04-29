import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import { api } from "@/lib/api";

type AckState = "loading" | "was-me" | "was-not-me" | "error";

export const SecurityAcknowledge = () => {
  const [searchParams] = useSearchParams();
  const [state, setState] = useState<AckState>("loading");

  useEffect(() => {
    const token = searchParams.get("token");
    if (!token) {
      setState("error");
      return;
    }

    void api
      .post<{ type: "was-me" | "was-not-me" }>("/auth/security/acknowledge", { token })
      .then((res) => setState(res.data.type))
      .catch(() => setState("error"));
  }, [searchParams]);

  return (
    <main className="min-h-dvh flex items-center justify-center px-4" style={{ backgroundColor: "var(--color-page)" }}>
      <section className="w-full max-w-xl rounded-2xl border p-6" style={{ borderColor: "var(--color-border-strong)", backgroundColor: "var(--color-surface)" }}>
        {state === "loading" ? <p>Verifying your response...</p> : null}
        {state === "was-me" ? (
          <div className="space-y-3">
            <h1 className="text-xl font-bold">Thanks! We've verified it was you.</h1>
            <p>Your account is safe. No action needed.</p>
            <Link className="underline" to="/login">Back to login</Link>
          </div>
        ) : null}
        {state === "was-not-me" ? (
          <div className="space-y-3">
            <h1 className="text-xl font-bold">Your account security report has been received.</h1>
            <p>We recommend changing your password immediately.</p>
            <div className="flex gap-4">
              <Link className="underline" to="/forgot-password">Change My Password</Link>
              <Link className="underline" to="/login">I'll do it later</Link>
            </div>
          </div>
        ) : null}
        {state === "error" ? (
          <div className="space-y-3">
            <h1 className="text-xl font-bold">This security link has expired or is invalid.</h1>
            <p>If you received a suspicious activity email, please log in and change your password.</p>
            <Link className="underline" to="/login">Go to login</Link>
          </div>
        ) : null}
      </section>
    </main>
  );
};
