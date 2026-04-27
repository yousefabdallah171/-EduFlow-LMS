import React, { ReactNode } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorCount: number;
}

export class PaymentErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorCount: 0
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorCount: 0
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error details for debugging
    console.error("Payment Error Boundary caught error:", error);
    console.error("Error Info:", errorInfo);

    // Log to backend error tracking (Sentry, etc.)
    if (typeof window !== "undefined" && window.location.hostname !== "localhost") {
      try {
        fetch("/api/v1/logs/error", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "PAYMENT_PAGE_ERROR",
            message: error.message,
            stack: error.stack,
            componentStack: errorInfo.componentStack,
            timestamp: new Date().toISOString()
          })
        }).catch(() => {}); // Silently fail if logging endpoint unavailable
      } catch {}
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorCount: this.state.errorCount + 1
    });
  };

  render() {
    if (this.state.hasError) {
      // If custom fallback provided, use it
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className="min-h-screen flex items-center justify-center px-4 py-12" style={{ backgroundColor: "var(--color-page)" }}>
          <div className="w-full max-w-md">
            <div className="dashboard-panel p-8 text-center">
              {/* Error Icon */}
              <div className="mb-6 flex justify-center">
                <div className="rounded-full p-4" style={{ backgroundColor: "rgb(239, 68, 68, 0.1)" }}>
                  <AlertCircle className="h-12 w-12 text-red-600" />
                </div>
              </div>

              {/* Error Message */}
              <h1 className="text-2xl font-bold mb-3" style={{ color: "var(--color-text-primary)" }}>
                Something Went Wrong
              </h1>
              <p className="mb-6" style={{ color: "var(--color-text-secondary)" }}>
                We encountered an unexpected error. Please try refreshing the page or contact support if the problem persists.
              </p>

              {/* Error Details (Dev Only) */}
              {process.env.NODE_ENV === "development" && this.state.error && (
                <div className="mb-6 p-4 rounded-lg text-left" style={{ backgroundColor: "var(--color-surface-2)" }}>
                  <p className="text-xs font-mono mb-2" style={{ color: "var(--color-text-muted)" }}>
                    <strong>Error:</strong> {this.state.error.message}
                  </p>
                  <details className="text-xs">
                    <summary style={{ color: "var(--color-text-secondary)", cursor: "pointer" }}>Stack Trace</summary>
                    <pre className="mt-2 overflow-auto text-xs" style={{ color: "var(--color-text-muted)" }}>
                      {this.state.error.stack}
                    </pre>
                  </details>
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-col gap-3">
                <button
                  onClick={this.handleReset}
                  className="w-full px-4 py-3 rounded-lg font-medium text-white transition-all flex items-center justify-center gap-2"
                  style={{ backgroundColor: "var(--color-brand)" }}
                >
                  <RefreshCw className="h-4 w-4" />
                  Try Again
                </button>
                <a
                  href="/dashboard"
                  className="w-full px-4 py-3 rounded-lg font-medium border text-center transition-all"
                  style={{
                    borderColor: "var(--color-border)",
                    color: "var(--color-text-primary)"
                  }}
                >
                  Go to Dashboard
                </a>
              </div>

              {/* Support */}
              <p className="mt-6 text-sm" style={{ color: "var(--color-text-secondary)" }}>
                Need help?{" "}
                <a
                  href="mailto:support@eduflow.com"
                  className="font-medium hover:underline"
                  style={{ color: "var(--color-brand)" }}
                >
                  Contact Support
                </a>
              </p>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
