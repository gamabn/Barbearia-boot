// src/exemplo.test.ts
import { describe, it, expect } from "@jest/globals";

describe("Ambiente de testes", () => {
  it("deve rodar corretamente", () => {
    expect(1 + 1).toBe(2);
  });
});
