import "./app-runtime.js";

// HS lookup is an optional Customer Portal enhancement.  Load it after the core
// ERP has started so a missing static asset can never prevent login or buttons.
import("./hs-code-customer-portal.js").catch((error) => {
  console.warn("Customer HS-code lookup is unavailable.", error);
});
