import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BrowserRouter } from "react-router-dom";
import Checkout from "@/pages/Checkout";

// Mock dependencies
vi.mock("@/lib/api", () => ({
  api: {
    post: vi.fn(),
    get: vi.fn()
  }
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: vi.fn()
}));

vi.mock("@/lib/locale", () => ({
  useLocale: vi.fn(() => ({ locale: "en", setLocale: vi.fn() }))
}));

describe("Checkout Page", () => {
  const mockPackages = [
    {
      id: "pkg-basic",
      titleEn: "Basic Course",
      titleAr: "الدورة الأساسية",
      pricePiasters: 50000,
      currency: "EGP"
    },
    {
      id: "pkg-pro",
      titleEn: "Pro Course",
      titleAr: "دورة احترافية",
      pricePiasters: 100000,
      currency: "EGP"
    }
  ];

  const mockUser = {
    id: "user-123",
    email: "student@test.com",
    fullName: "John Doe"
  };

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  const renderCheckout = (auth = { user: mockUser, isAuthReady: true }) => {
    const { useAuth } = require("@/hooks/useAuth");
    useAuth.mockReturnValue(auth);

    return render(
      <BrowserRouter>
        <Checkout />
      </BrowserRouter>
    );
  };

  describe("Authentication", () => {
    it("should redirect to login when user is not authenticated", async () => {
      const { useAuth } = require("@/hooks/useAuth");
      const mockNavigate = vi.fn();

      useAuth.mockReturnValue({
        user: null,
        isAuthReady: true
      });

      vi.mock("react-router-dom", async () => {
        const actual = await vi.importActual("react-router-dom");
        return {
          ...actual,
          useNavigate: () => mockNavigate
        };
      });

      renderCheckout({ user: null, isAuthReady: true });

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalled();
      });
    });

    it("should show loading state while checking authentication", () => {
      renderCheckout({ user: null, isAuthReady: false });

      expect(screen.queryByText(/checkout|pay/i)).not.toBeInTheDocument();
    });

    it("should render checkout for authenticated user", () => {
      renderCheckout();

      expect(screen.getByText(/checkout|course|enroll/i)).toBeInTheDocument();
    });
  });

  describe("Package Selection", () => {
    it("should load packages from API", async () => {
      const { api } = require("@/lib/api");
      api.get.mockResolvedValueOnce({ packages: mockPackages });

      renderCheckout();

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith("/packages");
      });
    });

    it("should select package from URL parameters", async () => {
      const { api } = require("@/lib/api");
      api.get.mockResolvedValueOnce({ packages: mockPackages });

      window.location.search = "?package=pkg-pro";

      renderCheckout();

      await waitFor(() => {
        const selected = localStorage.getItem("selectedPackage");
        expect(selected).toBe("pkg-pro");
      });
    });

    it("should fallback to localStorage package selection", async () => {
      const { api } = require("@/lib/api");
      api.get.mockResolvedValueOnce({ packages: mockPackages });

      localStorage.setItem("selectedPackage", "pkg-pro");

      renderCheckout();

      await waitFor(() => {
        const selected = localStorage.getItem("selectedPackage");
        expect(selected).toBe("pkg-pro");
      });
    });

    it("should select first package as default", async () => {
      const { api } = require("@/lib/api");
      api.get.mockResolvedValueOnce({ packages: mockPackages });

      renderCheckout();

      await waitFor(() => {
        const selected = localStorage.getItem("selectedPackage");
        expect(selected).toBe("pkg-basic");
      });
    });

    it("should allow changing package selection", async () => {
      const { api } = require("@/lib/api");
      api.get.mockResolvedValueOnce({ packages: mockPackages });

      renderCheckout();

      const proButton = await screen.findByText("Pro Course");
      await userEvent.click(proButton);

      expect(localStorage.getItem("selectedPackage")).toBe("pkg-pro");
    });

    it("should persist selected package to localStorage", async () => {
      const { api } = require("@/lib/api");
      api.get.mockResolvedValueOnce({ packages: mockPackages });

      renderCheckout();

      const basicButton = await screen.findByText("Basic Course");
      await userEvent.click(basicButton);

      expect(localStorage.getItem("selectedPackage")).toBe("pkg-basic");
    });
  });

  describe("Coupon Validation", () => {
    it("should validate coupon on blur", async () => {
      const { api } = require("@/lib/api");
      api.get.mockResolvedValueOnce({ packages: mockPackages });
      api.post.mockResolvedValueOnce({
        valid: true,
        discountAmount: 5000,
        discountPercentage: 10
      });

      renderCheckout();

      const couponInput = await screen.findByPlaceholderText(/coupon/i);
      await userEvent.type(couponInput, "SAVE10");
      fireEvent.blur(couponInput);

      await waitFor(() => {
        expect(api.post).toHaveBeenCalledWith("/validate-coupon", {
          couponCode: "SAVE10"
        });
      });
    });

    it("should display discount when coupon is valid", async () => {
      const { api } = require("@/lib/api");
      api.get.mockResolvedValueOnce({ packages: mockPackages });
      api.post.mockResolvedValueOnce({
        valid: true,
        discountAmount: 5000,
        discountPercentage: 10
      });

      renderCheckout();

      const couponInput = await screen.findByPlaceholderText(/coupon/i);
      await userEvent.type(couponInput, "SAVE10");
      fireEvent.blur(couponInput);

      await waitFor(() => {
        expect(screen.getByText(/discount|save/i)).toBeInTheDocument();
      });
    });

    it("should show error for invalid coupon", async () => {
      const { api } = require("@/lib/api");
      api.get.mockResolvedValueOnce({ packages: mockPackages });
      api.post.mockResolvedValueOnce({
        valid: false,
        reason: "EXPIRED"
      });

      renderCheckout();

      const couponInput = await screen.findByPlaceholderText(/coupon/i);
      await userEvent.type(couponInput, "EXPIRED");
      fireEvent.blur(couponInput);

      await waitFor(() => {
        expect(screen.getByText(/invalid|expired/i)).toBeInTheDocument();
      });
    });

    it("should clear coupon discount when code is removed", async () => {
      const { api } = require("@/lib/api");
      api.get.mockResolvedValueOnce({ packages: mockPackages });

      renderCheckout();

      const couponInput = await screen.findByPlaceholderText(/coupon/i);
      await userEvent.clear(couponInput);
      fireEvent.blur(couponInput);

      const discountElement = screen.queryByText(/discount/i);
      expect(discountElement).not.toBeInTheDocument();
    });
  });

  describe("Price Calculation", () => {
    it("should display correct base price", async () => {
      const { api } = require("@/lib/api");
      api.get.mockResolvedValueOnce({ packages: mockPackages });

      renderCheckout();

      await waitFor(() => {
        expect(screen.getByText(/500/)).toBeInTheDocument();
      });
    });

    it("should calculate discounted price correctly", async () => {
      const { api } = require("@/lib/api");
      api.get.mockResolvedValueOnce({ packages: mockPackages });
      api.post.mockResolvedValueOnce({
        valid: true,
        discountAmount: 5000,
        discountPercentage: 10
      });

      renderCheckout();

      const couponInput = await screen.findByPlaceholderText(/coupon/i);
      await userEvent.type(couponInput, "SAVE10");
      fireEvent.blur(couponInput);

      await waitFor(() => {
        expect(screen.getByText(/450/)).toBeInTheDocument();
      });
    });

    it("should update price when package changes", async () => {
      const { api } = require("@/lib/api");
      api.get.mockResolvedValueOnce({ packages: mockPackages });

      renderCheckout();

      const basicButton = await screen.findByText("Basic Course");
      await userEvent.click(basicButton);

      await waitFor(() => {
        expect(screen.getByText(/500 EGP/)).toBeInTheDocument();
      });

      const proButton = await screen.findByText("Pro Course");
      await userEvent.click(proButton);

      await waitFor(() => {
        expect(screen.getByText(/1000 EGP/)).toBeInTheDocument();
      });
    });
  });

  describe("Form Submission", () => {
    it("should submit checkout with selected package and coupon", async () => {
      const { api } = require("@/lib/api");
      api.get.mockResolvedValueOnce({ packages: mockPackages });
      api.post.mockResolvedValueOnce({
        valid: true,
        discountAmount: 5000
      });
      api.post.mockResolvedValueOnce({
        paymentKey: "key-123",
        iframeId: "iframe-123"
      });

      renderCheckout();

      const couponInput = await screen.findByPlaceholderText(/coupon/i);
      await userEvent.type(couponInput, "SAVE10");
      fireEvent.blur(couponInput);

      const payButton = await screen.findByRole("button", { name: /pay/i });
      await userEvent.click(payButton);

      await waitFor(() => {
        expect(api.post).toHaveBeenCalledWith("/checkout", {
          couponCode: "SAVE10",
          packageId: "pkg-basic"
        });
      });
    });

    it("should show loading state during submission", async () => {
      const { api } = require("@/lib/api");
      api.get.mockResolvedValueOnce({ packages: mockPackages });
      api.post.mockImplementationOnce(
        () =>
          new Promise(resolve =>
            setTimeout(() => resolve({ paymentKey: "key" }), 100)
          )
      );

      renderCheckout();

      const payButton = await screen.findByRole("button", { name: /pay/i });
      await userEvent.click(payButton);

      expect(payButton).toBeDisabled();
    });

    it("should handle checkout error", async () => {
      const { api } = require("@/lib/api");
      api.get.mockResolvedValueOnce({ packages: mockPackages });
      api.post.mockRejectedValueOnce(new Error("Checkout failed"));

      renderCheckout();

      const payButton = await screen.findByRole("button", { name: /pay/i });
      await userEvent.click(payButton);

      await waitFor(() => {
        expect(screen.getByText(/error|failed/i)).toBeInTheDocument();
      });
    });

    it("should handle ALREADY_ENROLLED error", async () => {
      const { api } = require("@/lib/api");
      api.get.mockResolvedValueOnce({ packages: mockPackages });
      api.post.mockRejectedValueOnce({
        code: "ALREADY_ENROLLED",
        message: "You are already enrolled"
      });

      renderCheckout();

      const payButton = await screen.findByRole("button", { name: /pay/i });
      await userEvent.click(payButton);

      await waitFor(() => {
        expect(screen.getByText(/already enrolled/i)).toBeInTheDocument();
      });
    });

    it("should handle CHECKOUT_IN_PROGRESS error", async () => {
      const { api } = require("@/lib/api");
      api.get.mockResolvedValueOnce({ packages: mockPackages });
      api.post.mockRejectedValueOnce({
        code: "CHECKOUT_IN_PROGRESS",
        message: "You have a checkout in progress"
      });

      renderCheckout();

      const payButton = await screen.findByRole("button", { name: /pay/i });
      await userEvent.click(payButton);

      await waitFor(() => {
        expect(
          screen.getByText(/checkout in progress|wait|minutes/i)
        ).toBeInTheDocument();
      });
    });
  });

  describe("Error Handling", () => {
    it("should display user-friendly error messages", async () => {
      const { api } = require("@/lib/api");
      api.get.mockResolvedValueOnce({ packages: mockPackages });
      api.post.mockRejectedValueOnce(new Error("Network error"));

      renderCheckout();

      const payButton = await screen.findByRole("button", { name: /pay/i });
      await userEvent.click(payButton);

      await waitFor(() => {
        expect(
          screen.getByText(/something went wrong|try again/i)
        ).toBeInTheDocument();
      });
    });

    it("should not show stack traces in error messages", async () => {
      const { api } = require("@/lib/api");
      api.get.mockResolvedValueOnce({ packages: mockPackages });
      const errorWithStack = new Error("Database connection failed");
      errorWithStack.stack =
        "Error: at Function...(file.js:123)...";
      api.post.mockRejectedValueOnce(errorWithStack);

      renderCheckout();

      const payButton = await screen.findByRole("button", { name: /pay/i });
      await userEvent.click(payButton);

      await waitFor(() => {
        expect(screen.queryByText(/at Function/)).not.toBeInTheDocument();
        expect(screen.queryByText(/file.js:123/)).not.toBeInTheDocument();
      });
    });
  });

  describe("Loading States", () => {
    it("should show loading spinner while fetching packages", () => {
      const { api } = require("@/lib/api");
      api.get.mockImplementationOnce(
        () =>
          new Promise(resolve =>
            setTimeout(() => resolve({ packages: mockPackages }), 100)
          )
      );

      renderCheckout();

      expect(screen.getByRole("progressbar")).toBeInTheDocument();
    });

    it("should disable form during submission", async () => {
      const { api } = require("@/lib/api");
      api.get.mockResolvedValueOnce({ packages: mockPackages });
      api.post.mockImplementationOnce(
        () =>
          new Promise(resolve =>
            setTimeout(() => resolve({ paymentKey: "key" }), 100)
          )
      );

      renderCheckout();

      const payButton = await screen.findByRole("button", { name: /pay/i });
      await userEvent.click(payButton);

      expect(payButton).toBeDisabled();
    });
  });

  describe("Responsive Design", () => {
    it("should render correctly on mobile", async () => {
      Object.defineProperty(window, "innerWidth", {
        writable: true,
        configurable: true,
        value: 375
      });

      const { api } = require("@/lib/api");
      api.get.mockResolvedValueOnce({ packages: mockPackages });

      renderCheckout();

      await waitFor(() => {
        const couponInput = screen.getByPlaceholderText(/coupon/i);
        expect(couponInput).toBeInTheDocument();
      });
    });

    it("should render correctly on tablet", async () => {
      Object.defineProperty(window, "innerWidth", {
        writable: true,
        configurable: true,
        value: 768
      });

      const { api } = require("@/lib/api");
      api.get.mockResolvedValueOnce({ packages: mockPackages });

      renderCheckout();

      await waitFor(() => {
        const couponInput = screen.getByPlaceholderText(/coupon/i);
        expect(couponInput).toBeInTheDocument();
      });
    });
  });
});
