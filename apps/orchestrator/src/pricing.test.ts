import { describe, expect, it } from "vitest";
import { priceDisplay, priceWei } from "./pricing.js";

describe("priceWei", () => {
  it("matches SessionEscrow.sol's rates exactly, in wei", () => {
    expect(priceWei("lite", 1)).toBe(100_000_000_000_000_000n); // 0.1 ether
    expect(priceWei("standard", 1)).toBe(350_000_000_000_000_000n); // 0.35 ether
    expect(priceWei("turbo", 1)).toBe(1_000_000_000_000_000_000n); // 1 ether
  });

  it("scales linearly with hours, with no floating-point drift", () => {
    expect(priceWei("standard", 3)).toBe(1_050_000_000_000_000_000n);
    expect(priceWei("lite", 24)).toBe(2_400_000_000_000_000_000n);
  });
});

describe("priceDisplay", () => {
  it("renders exact USDC amounts", () => {
    expect(priceDisplay("standard", 1)).toBe("0.35");
    expect(priceDisplay("standard", 3)).toBe("1.05");
    expect(priceDisplay("turbo", 1)).toBe("1.00");
  });
});
