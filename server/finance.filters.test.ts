import { describe, expect, it } from "vitest";
import { getRange } from "./routers";

describe("finance period filters", () => {
  it("creates an inclusive start and exclusive next-month boundary", () => {
    const range = getRange(2, 2026);
    expect(range.from?.toISOString()).toBe("2026-02-01T00:00:00.000Z");
    expect(range.to?.toISOString()).toBe("2026-03-01T00:00:00.000Z");
  });

  it("returns no bounds when period is not selected", () => {
    expect(getRange()).toEqual({});
  });
});
