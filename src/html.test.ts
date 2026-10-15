import { describe, it, expect } from "vitest";
import { escapeHtml, quotaWindowRow } from "./html";

describe("escapeHtml", () => {
  it("escapes the five HTML-significant characters", () => {
    expect(escapeHtml(`<>&"'`)).toBe("&lt;&gt;&amp;&quot;&#39;");
  });

  it("leaves ordinary text untouched", () => {
    expect(escapeHtml("gpt-4o mini")).toBe("gpt-4o mini");
  });
});

describe("quotaWindowRow", () => {
  const base = {
    budget_rp: 1000,
    used_rp: 500,
    used_frac: 0.5,
    remaining_rp: 500,
    resets_at: "2026-10-20T00:00:00Z",
  };

  it("escapes a malicious resets_at value instead of injecting markup", () => {
    const html = quotaWindowRow(
      "Mingguan",
      { ...base, resets_at: "<img src=x onerror=alert(1)>" },
      80,
    );
    expect(html).not.toContain("<img");
    expect(html).toContain("&lt;img");
  });

  it("flags a window over the alert threshold", () => {
    const html = quotaWindowRow("Mingguan", { ...base, used_frac: 0.9 }, 80);
    expect(html).toContain("warn");
  });
});
