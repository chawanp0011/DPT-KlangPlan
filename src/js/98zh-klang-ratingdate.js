// Fisko-KlangFinance, procurement round P5 (12 Nov 2569): supplier rating is in force from 10 July 2569 (2026-07-10), as the user's flow says.
// From that date a case cannot be closed without rating the supplier (1 to 5); before it, closing without a rating is allowed ("not rated").
// The date is S.pcfg.vendorRateFrom (an ISO date; none set = this default). There is no settings screen for it yet: change it in the saved data.
// It is judged on the day the case is closed. Today (the sample clock) is after the date, so a rating is required now.
const VENDOR_RATE_FROM = "2026-07-10";
const vendorRateFrom = () => (S.pcfg && S.pcfg.vendorRateFrom) || VENDOR_RATE_FROM;
const vendorRateOn = d => (d || TODAY) >= vendorRateFrom();
