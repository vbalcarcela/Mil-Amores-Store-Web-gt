import { loadStripe } from "@stripe/stripe-js";

export const stripePromise = loadStripe(
  "pk_test_51TXYtBGH7zV91093Qg7CgGiPSKBUseAQ0gdZZbfy8CbVsWMe5MkMR7eWr5geecZPwsC82VtY4yqWifV3JDacRuG000jDAAB9xZ"
);