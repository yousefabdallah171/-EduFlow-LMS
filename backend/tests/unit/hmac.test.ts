import crypto from "node:crypto";
import { describe, expect, it } from "vitest";

import { computePaymobHmac, isValidPaymobHmac } from "../../src/utils/hmac.js";

describe("US2 Paymob HMAC validation", () => {
  it("accepts a valid webhook payload", () => {
    const payload = {
      obj: {
        amount_cents: "49900",
        created_at: "2026-04-12T18:00:00Z",
        currency: "EGP",
        error_occured: false,
        has_parent_transaction: false,
        id: 123456,
        integration_id: 999,
        is_3d_secure: true,
        is_auth: false,
        is_capture: false,
        is_refunded: false,
        is_standalone_payment: true,
        is_voided: false,
        order: { id: 98765, merchant_order_id: "payment-1" },
        owner: 777,
        pending: false,
        source_data: {
          pan: "4242",
          sub_type: "MasterCard",
          type: "card"
        },
        success: true
      }
    };

    const secret = "unit-test-secret";
    const hmac = computePaymobHmac(payload, secret);

    expect(isValidPaymobHmac(payload, hmac, secret)).toBe(true);
  });

  it("rejects a tampered webhook payload", () => {
    const payload = {
      obj: {
        amount_cents: "49900",
        created_at: "2026-04-12T18:00:00Z",
        currency: "EGP",
        error_occured: false,
        has_parent_transaction: false,
        id: 123456,
        integration_id: 999,
        is_3d_secure: true,
        is_auth: false,
        is_capture: false,
        is_refunded: false,
        is_standalone_payment: true,
        is_voided: false,
        order: { id: 98765, merchant_order_id: "payment-1" },
        owner: 777,
        pending: false,
        source_data: {
          pan: "4242",
          sub_type: "MasterCard",
          type: "card"
        },
        success: true
      }
    };

    const secret = "unit-test-secret";
    const hmac = computePaymobHmac(payload, secret);
    payload.obj.success = false;

    expect(isValidPaymobHmac(payload, hmac, secret)).toBe(false);
    expect(
      crypto.timingSafeEqual(Buffer.from("abc"), Buffer.from("abc"))
    ).toBe(true);
  });
});
