import { describe, expect, it } from "vitest";
import { getPageTokens } from "@/lib/blog/pagination";

const PAGE_SIZE = 6;

describe("getPageTokens", () => {
  it("lists every page when total ≤ 7", () => {
    expect(getPageTokens(1, 1)).toEqual([1]);
    expect(getPageTokens(3, 5)).toEqual([1, 2, 3, 4, 5]);
    expect(getPageTokens(7, 7)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it("collapses the tail when on the first pages", () => {
    expect(getPageTokens(1, 12)).toEqual([1, 2, "ellipsis", 12]);
    expect(getPageTokens(2, 12)).toEqual([1, 2, 3, "ellipsis", 12]);
  });

  it("collapses both sides in the middle", () => {
    expect(getPageTokens(6, 12)).toEqual([1, "ellipsis", 5, 6, 7, "ellipsis", 12]);
  });

  it("collapses the head near the end", () => {
    expect(getPageTokens(11, 12)).toEqual([1, "ellipsis", 10, 11, 12]);
    expect(getPageTokens(12, 12)).toEqual([1, "ellipsis", 11, 12]);
  });

  it("always includes first, last and the current page", () => {
    for (let total = 1; total <= 30; total++) {
      for (let current = 1; current <= total; current++) {
        const tokens = getPageTokens(current, total);
        expect(tokens[0]).toBe(1);
        expect(tokens[tokens.length - 1]).toBe(total);
        expect(tokens).toContain(current);
        // Numeric tokens must be strictly increasing (no duplicates / disorder).
        const nums = tokens.filter((t): t is number => typeof t === "number");
        expect([...nums].sort((a, b) => a - b)).toEqual(nums);
        expect(new Set(nums).size).toBe(nums.length);
      }
    }
  });
});

describe("blog page math (6 per page)", () => {
  const pageMath = (totalItems: number, requestedPage: number) => {
    const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
    const currentPage = Math.min(Math.max(1, requestedPage), totalPages);
    const pageStart = (currentPage - 1) * PAGE_SIZE;
    const shownCount = Math.min(PAGE_SIZE, Math.max(0, totalItems - pageStart));
    return { totalPages, currentPage, pageStart, shownCount };
  };

  it("shows 6 posts per full page", () => {
    expect(pageMath(20, 1)).toEqual({ totalPages: 4, currentPage: 1, pageStart: 0, shownCount: 6 });
    expect(pageMath(20, 3)).toEqual({ totalPages: 4, currentPage: 3, pageStart: 12, shownCount: 6 });
  });

  it("shows the remainder on the last page", () => {
    expect(pageMath(20, 4).shownCount).toBe(2);
    expect(pageMath(13, 3).shownCount).toBe(1);
  });

  it("clamps out-of-range pages instead of rendering an empty grid", () => {
    expect(pageMath(20, 99).currentPage).toBe(4);
    expect(pageMath(20, 0).currentPage).toBe(1);
    expect(pageMath(0, 5)).toEqual({ totalPages: 1, currentPage: 1, pageStart: 0, shownCount: 0 });
  });
});
