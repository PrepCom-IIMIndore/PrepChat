// Standardized 7 Target Domains requested by PrepCom
export const ALL_NORMALIZED_DOMAINS = [
  "Consulting",
  "Finance",
  "Marketing",
  "GenMan",
  "Prodman",
  "Operations",
  "Others"
];

// Helper to normalize raw domain strings into the 7 target domain categories
export function normalizeDomain(rawDomain: string): string {
  if (!rawDomain) return "Others";
  const lower = rawDomain.toLowerCase().trim();

  // 1. Prodman check first
  if (lower.includes("prodman") || lower.includes("prod man") || lower.includes("product")) {
    return "Prodman";
  }

  // 2. Consulting & Strategy check
  if (lower.includes("consulting") || lower.includes("strategy")) {
    return "Consulting";
  }

  // 3. Finance check
  if (lower.includes("finance") || lower.includes("financial") || lower.includes("banking") || lower.includes("insurance")) {
    return "Finance";
  }

  // 4. Marketing & Sales check
  if (lower.includes("marketing") || lower.includes("sales") || lower.includes("s&m") || lower.includes("b2b")) {
    return "Marketing";
  }

  // 5. GenMan check
  if (lower.includes("genman") || lower.includes("gen man") || lower.includes("rotational") || lower.includes("management trainee") || lower === "mt") {
    return "GenMan";
  }

  // 6. Operations check
  if (lower.includes("operation") || lower.includes("operations") || lower.includes("supply chain") || lower.includes("logistics")) {
    return "Operations";
  }

  // 7. All remaining (Analytics, IT, IT/ITes, HR, Other) map to Others
  return "Others";
}
