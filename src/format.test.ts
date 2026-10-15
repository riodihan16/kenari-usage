import { describe, it, expect } from "vitest";
import { pageCount } from "./format";

describe("pageCount", () => {
  it("returns at least one page when there is no data", () => {
    expect(pageCount(0, 50)).toBe(1);
  });

  it("rounds up the number of pages", () => {
    expect(pageCount(120, 50)).toBe(3);
    expect(pageCount(50, 50)).toBe(1);
  });

  it("never divides by zero when the server reports limit 0", () => {
    const pages = pageCount(120, 0);
    expect(Number.isFinite(pages)).toBe(true);
    expect(pages).toBeGreaterThanOrEqual(1);
  });
});
