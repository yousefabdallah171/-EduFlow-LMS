/**
 * Payment debugging tools - development only
 * Available as window.__debugPayment in dev mode
 */

interface PaymentLog {
  timestamp: Date;
  type: "api" | "state" | "event" | "error";
  message: string;
  data?: any;
}

interface DebugPaymentState {
  currentPayment: any | null;
  logs: PaymentLog[];
  networkRequests: Map<string, any>;
}

class PaymentDebugger {
  private state: DebugPaymentState = {
    currentPayment: null,
    logs: [],
    networkRequests: new Map()
  };

  private maxLogs = 100;
  private isEnabled = process.env.NODE_ENV === "development";

  constructor() {
    if (this.isEnabled) {
      this.setupNetworkInterception();
      this.log("state", "Payment debugger initialized");
    }
  }

  /**
   * Log a message
   */
  log(type: "api" | "state" | "event" | "error", message: string, data?: any): void {
    if (!this.isEnabled) return;

    const logEntry: PaymentLog = {
      timestamp: new Date(),
      type,
      message,
      data
    };

    this.state.logs.push(logEntry);

    // Keep only last N logs
    if (this.state.logs.length > this.maxLogs) {
      this.state.logs.shift();
    }

    // Log to console
    const prefix = `[${type.toUpperCase()}]`;
    const time = logEntry.timestamp.toLocaleTimeString();

    if (type === "error") {
      console.error(`${prefix} ${time}: ${message}`, data);
    } else {
      console.log(`${prefix} ${time}: ${message}`, data || "");
    }
  }

  /**
   * Intercept fetch requests
   */
  private setupNetworkInterception(): void {
    const originalFetch = window.fetch;
    const self = this;

    const newFetch = async (resource: any, config?: any) => {
      const url = typeof resource === "string" ? resource : resource.url;

      // Only monitor API calls
      if (url.includes("/api/v1/")) {
        const startTime = performance.now();

        try {
          const response = await originalFetch(resource, config);
          const elapsed = performance.now() - startTime;

          // Log payment-related API calls
          if (url.includes("payment") || url.includes("checkout")) {
            self.log("api", `${config?.method || "GET"} ${url}`, {
              status: response.status,
              duration: `${elapsed.toFixed(2)}ms`
            });

            // Store request info
            self.state.networkRequests.set(url, {
              method: config?.method || "GET",
              status: response.status,
              duration: elapsed,
              timestamp: new Date()
            });
          }

          return response;
        } catch (error) {
          const elapsed = performance.now() - startTime;
          self.log("error", `${config?.method || "GET"} ${url} failed`, {
            error: error instanceof Error ? error.message : String(error),
            duration: `${elapsed.toFixed(2)}ms`
          });

          throw error;
        }
      }

      return originalFetch(resource, config);
    };

    (window.fetch as any) = newFetch;
  }

  /**
   * Get all logs
   */
  getLogs(): PaymentLog[] {
    return [...this.state.logs];
  }

  /**
   * Clear logs
   */
  clearLogs(): void {
    this.state.logs = [];
    this.log("event", "Logs cleared");
  }

  /**
   * Get current payment info
   */
  getCurrentPayment(): any {
    return this.state.currentPayment;
  }

  /**
   * Set current payment (for debugging)
   */
  setCurrentPayment(payment: any): void {
    this.state.currentPayment = payment;
    this.log("state", "Current payment updated", payment);
  }

  /**
   * Simulate payment success
   */
  simulateSuccess(orderId = "test-order-123"): void {
    if (!this.isEnabled) return;

    this.log("event", "Simulating payment success", { orderId });
    window.location.href = `/payment-success?orderId=${orderId}`;
  }

  /**
   * Simulate payment failure
   */
  simulateFailure(orderId = "test-order-123", error = "CARD_DECLINED"): void {
    if (!this.isEnabled) return;

    this.log("event", "Simulating payment failure", { orderId, error });
    window.location.href = `/payment-failure?orderId=${orderId}&error=${error}`;
  }

  /**
   * Simulate pending payment
   */
  simulatePending(orderId = "test-order-123"): void {
    if (!this.isEnabled) return;

    this.log("event", "Simulating pending payment", { orderId });
    window.location.href = `/payment-pending?orderId=${orderId}`;
  }

  /**
   * Get network requests
   */
  getNetworkRequests(): Record<string, any> {
    const result: Record<string, any> = {};
    this.state.networkRequests.forEach((value, key) => {
      result[key] = value;
    });
    return result;
  }

  /**
   * Export logs as JSON
   */
  exportLogs(): string {
    return JSON.stringify(
      {
        exported: new Date().toISOString(),
        logs: this.state.logs,
        networkRequests: this.getNetworkRequests(),
        currentPayment: this.state.currentPayment
      },
      null,
      2
    );
  }

  /**
   * Download logs as file
   */
  downloadLogs(): void {
    if (!this.isEnabled) {
      console.warn("Debug logging disabled in production");
      return;
    }

    const data = this.exportLogs();
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `payment-debug-${new Date().toISOString()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * Get performance metrics
   */
  getMetrics(): {
    totalLogs: number;
    totalNetworkRequests: number;
    averageRequestTime: number;
    slowestRequest: { url: string; duration: number } | null;
  } {
    const requests = Array.from(this.state.networkRequests.values());
    const durations = requests.map((r) => r.duration);

    return {
      totalLogs: this.state.logs.length,
      totalNetworkRequests: requests.length,
      averageRequestTime: durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0,
      slowestRequest: requests.length > 0
        ? {
            url: Array.from(this.state.networkRequests.entries()).sort(
              (a, b) => b[1].duration - a[1].duration
            )[0]?.[0] || "",
            duration: Math.max(...durations)
          }
        : null
    };
  }

  /**
   * Print summary to console
   */
  printSummary(): void {
    if (!this.isEnabled) return;

    const metrics = this.getMetrics();
    console.group("📊 Payment Debug Summary");
    console.log(`Total Logs: ${metrics.totalLogs}`);
    console.log(`Network Requests: ${metrics.totalNetworkRequests}`);
    console.log(`Average Request Time: ${metrics.averageRequestTime.toFixed(2)}ms`);
    if (metrics.slowestRequest) {
      console.log(`Slowest Request: ${metrics.slowestRequest.url} (${metrics.slowestRequest.duration.toFixed(2)}ms)`);
    }
    console.log("Recent Logs:", this.state.logs.slice(-5));
    console.groupEnd();
  }
}

// Create global instance
const paymentDebugger = new PaymentDebugger();

// Export to window in development
if (process.env.NODE_ENV === "development" && typeof window !== "undefined") {
  (window as any).__debugPayment = {
    // State
    get currentPayment() {
      return paymentDebugger.getCurrentPayment();
    },
    setCurrentPayment: (payment: any) => paymentDebugger.setCurrentPayment(payment),

    // Logging
    getLogs: () => paymentDebugger.getLogs(),
    clearLogs: () => paymentDebugger.clearLogs(),
    exportLogs: () => paymentDebugger.exportLogs(),
    downloadLogs: () => paymentDebugger.downloadLogs(),

    // Simulation
    simulateSuccess: (orderId?: string) => paymentDebugger.simulateSuccess(orderId),
    simulateFailure: (orderId?: string, error?: string) => paymentDebugger.simulateFailure(orderId, error),
    simulatePending: (orderId?: string) => paymentDebugger.simulatePending(orderId),

    // Network
    getNetworkRequests: () => paymentDebugger.getNetworkRequests(),

    // Metrics
    getMetrics: () => paymentDebugger.getMetrics(),
    printSummary: () => paymentDebugger.printSummary(),

    // Help
    help: () => {
      console.log(`
🔧 Payment Debug Tools

Usage:
  window.__debugPayment.getLogs()           - Get all logs
  window.__debugPayment.clearLogs()         - Clear logs
  window.__debugPayment.downloadLogs()      - Download logs as JSON

  window.__debugPayment.simulateSuccess()   - Go to success page
  window.__debugPayment.simulateFailure()   - Go to failure page
  window.__debugPayment.simulatePending()   - Go to pending page

  window.__debugPayment.getNetworkRequests()- Get API calls
  window.__debugPayment.getMetrics()        - Get performance metrics
  window.__debugPayment.printSummary()      - Print summary to console
      `);
    }
  };

  console.log("💡 Payment debugging tools available. Type window.__debugPayment.help() for usage.");
}

export { PaymentDebugger, paymentDebugger };
