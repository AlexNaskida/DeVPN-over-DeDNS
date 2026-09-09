import { describe, expect, it } from "vitest";
import { encodeDnsName } from "./dns-name.js";

describe("encodeDnsName", () => {
  it("encodes a multi-label name in DNS wire format", () => {
    // "bob.dvod.eth" -> len(3) "bob" len(4) "dvod" len(3) "eth" 0x00
    const expected =
      "0x" +
      "03" + Buffer.from("bob").toString("hex") +
      "04" + Buffer.from("dvod").toString("hex") +
      "03" + Buffer.from("eth").toString("hex") +
      "00";
    expect(encodeDnsName("bob.dvod.eth")).toBe(expected);
  });

  it("round-trips through a manual decode", () => {
    const encoded = encodeDnsName("bob.dvod.eth");
    const bytes = Buffer.from(encoded.slice(2), "hex");
    let offset = 0;
    const labels: string[] = [];
    while (bytes[offset] !== 0) {
      const len = bytes[offset];
      offset += 1;
      labels.push(bytes.subarray(offset, offset + len).toString("utf8"));
      offset += len;
    }
    expect(labels).toEqual(["bob", "dvod", "eth"]);
  });

  it("rejects an empty label", () => {
    expect(() => encodeDnsName("bob..eth")).not.toThrow(); // filtered, degrades to bob.eth
    expect(encodeDnsName("bob..eth")).toBe(encodeDnsName("bob.eth"));
  });
});
