import crypto from "node:crypto";

export type PaymobWebhookPayload = {
  obj?: {
    amount_cents?: string | number;
    created_at?: string;
    currency?: string;
    error_occured?: boolean;
    has_parent_transaction?: boolean;
    id?: string | number;
    integration_id?: string | number;
    is_3d_secure?: boolean;
    is_auth?: boolean;
    is_capture?: boolean;
    is_refunded?: boolean;
    is_standalone_payment?: boolean;
    is_voided?: boolean;
    order?: {
      id?: string | number;
      merchant_order_id?: string;
    };
    owner?: string | number;
    pending?: boolean;
    source_data?: {
      pan?: string;
      sub_type?: string;
      type?: string;
    };
    success?: boolean;
  };
};

const paymobHmacFields = (payload: PaymobWebhookPayload) => {
  const transaction = payload.obj ?? {};
  const source = transaction.source_data ?? {};
  const order = transaction.order ?? {};

  return [
    transaction.amount_cents ?? "",
    transaction.created_at ?? "",
    transaction.currency ?? "",
    transaction.error_occured ?? "",
    transaction.has_parent_transaction ?? "",
    transaction.id ?? "",
    transaction.integration_id ?? "",
    transaction.is_3d_secure ?? "",
    transaction.is_auth ?? "",
    transaction.is_capture ?? "",
    transaction.is_refunded ?? "",
    transaction.is_standalone_payment ?? "",
    transaction.is_voided ?? "",
    order.id ?? "",
    order.merchant_order_id ?? "",
    transaction.owner ?? "",
    transaction.pending ?? "",
    source.pan ?? "",
    source.sub_type ?? "",
    source.type ?? "",
    transaction.success ?? ""
  ].join("");
};

export const computePaymobHmac = (payload: PaymobWebhookPayload, secret: string) =>
  crypto.createHmac("sha512", secret).update(paymobHmacFields(payload)).digest("hex");

export const isValidPaymobHmac = (payload: PaymobWebhookPayload, providedHmac: string, secret: string) => {
  const expected = computePaymobHmac(payload, secret);
  const normalizedProvided = providedHmac.toLowerCase().padEnd(expected.length, "\0");
  const expectedPadded = expected.padEnd(normalizedProvided.length, "\0");

  // Always call timingSafeEqual — no early return — to prevent timing side-channels.
  const valid = crypto.timingSafeEqual(Buffer.from(expectedPadded), Buffer.from(normalizedProvided));
  return valid && expected.length === providedHmac.toLowerCase().length;
};
