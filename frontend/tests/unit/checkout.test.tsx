import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";

import { Checkout } from "@/pages/Checkout";
import { api } from "@/lib/api";
import i18n from "@/lib/i18n";

vi.mock("@/components/shared/SEO", () => ({
  SEO: () => null
}));

vi.mock("@/lib/api", () => ({
  api: {
    get: vi.fn()
  }
}));

const validateCoupon = {
  data: null,
  isPending: false,
  mutateAsync: vi.fn(),
  reset: vi.fn()
};

const checkout = {
  isPending: false,
  mutateAsync: vi.fn()
};

vi.mock("@/hooks/useEnrollment", () => ({
  useEnrollment: () => ({
    statusQuery: {
      data: { enrolled: false, status: "NONE" },
      isLoading: false
    },
    validateCoupon,
    checkout
  })
}));

const coursePayload = {
  priceEgp: 1000,
  currency: "EGP",
  packages: [
    {
      id: "starter",
      titleEn: "AI Workflow Course",
      titleAr: "كورس AI Workflow",
      descriptionEn: "Full 7-phase workflow.",
      descriptionAr: "الـ workflow الكامل في 7 مراحل.",
      priceEgp: 1000,
      currency: "EGP"
    },
    {
      id: "recommended",
      titleEn: "Course + review session",
      titleAr: "الكورس + جلسة مراجعة",
      descriptionEn: "Includes one personal review session.",
      descriptionAr: "يشمل جلسة مراجعة شخصية.",
      priceEgp: 2500,
      currency: "EGP"
    }
  ]
};

const renderCheckout = (initialEntry = "/en/checkout") => {
  void i18n.changeLanguage(initialEntry.startsWith("/ar") ? "ar" : "en");
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route element={<Checkout />} path="/:locale/checkout" />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
};

describe("Checkout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.get).mockResolvedValue({ data: coursePayload });
    validateCoupon.data = null;
    validateCoupon.isPending = false;
    checkout.isPending = false;
    validateCoupon.mutateAsync.mockResolvedValue({ valid: true, discountedAmountEgp: 900 });
    checkout.mutateAsync.mockImplementation(() => new Promise(() => undefined));
  });

  it("loads course packages from the current course endpoint", async () => {
    renderCheckout();

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith("/course");
    });

    expect((await screen.findAllByText("AI Workflow Course")).length).toBeGreaterThan(0);
    expect(screen.getAllByText("Course + review session").length).toBeGreaterThan(0);
  });

  it("submits checkout with the selected package and coupon", async () => {
    renderCheckout();

    await userEvent.click(await screen.findByText("Course + review session"));
    await userEvent.click(screen.getByText(/coupon/i));
    await userEvent.type(screen.getByPlaceholderText(/save/i), "SAVE10");
    await userEvent.click(screen.getByRole("button", { name: /apply/i }));
    await userEvent.click(screen.getByRole("button", { name: /pay/i }));

    expect(checkout.mutateAsync).toHaveBeenCalledWith({
      couponCode: "SAVE10",
      packageId: "recommended"
    });
  });

  it("renders Arabic package content on Arabic routes", async () => {
    renderCheckout("/ar/checkout");

    expect((await screen.findAllByText("كورس AI Workflow")).length).toBeGreaterThan(0);
    expect(screen.getAllByText("الكورس + جلسة مراجعة").length).toBeGreaterThan(0);
  });
});
