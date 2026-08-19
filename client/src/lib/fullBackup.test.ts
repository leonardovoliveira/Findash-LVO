import { describe, expect, it } from "vitest";
import { createFullBackup, parseFullBackup } from "./fullBackup";

describe("full backup", () => {
  it("serializes and recognizes a complete Findash backup", () => {
    const backup = createFullBackup({ transactions: [], investments: [], creditCards: [], categories: [], budgets: [] });
    expect(parseFullBackup(JSON.stringify(backup))).toMatchObject({ format: "findash-lvo-full-backup", version: 1, budgets: [] });
  });

  it("rejects incomplete or legacy transaction-only JSON as a full backup", () => {
    expect(() => parseFullBackup(JSON.stringify({ format: "findash-lvo-full-backup", version: 1, transactions: [] }))).toThrow("backup completo");
    expect(parseFullBackup(JSON.stringify([{ id: 1 }]))).toBeNull();
  });
});
