import { describe, expect, it } from "vitest";
import { addLocalCategory, deleteLocalCategory, isDefaultCategory, normalizeLocalCategories, updateLocalCategory } from "./localCategories";

describe("local categories", () => {
  it("normalizes and deduplicates custom categories", () => {
    const normalized = normalizeLocalCategories([{ label: "  Estudos ", icon: "✦" }, { label: "estudos", icon: "◆" }, { label: "", icon: "x" }]);
    expect(normalized).toEqual([{ label: "Estudos", icon: "✦" }]);
  });

  it("adds a custom category only once", () => {
    const first = addLocalCategory([], { label: "Pets", icon: "✦" });
    const second = addLocalCategory(first, { label: " pets ", icon: "◆" });
    expect(second).toEqual([{ label: "Pets", icon: "✦" }]);
  });

  it("updates and deletes custom categories", () => {
    const updated = updateLocalCategory([{ label: "Pets", icon: "✦" }], "Pets", { label: "Animais", icon: "◆" });
    expect(updated).toEqual([{ label: "Animais", icon: "◆" }]);
    expect(deleteLocalCategory(updated, "animais")).toEqual([]);
  });

  it("identifies default categories so they remain protected", () => {
    expect(isDefaultCategory("Moradia")).toBe(true);
    expect(isDefaultCategory("Pets")).toBe(false);
  });
});
