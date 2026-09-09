/**
 * DNS wire-format name encoding, matching `NameCoder.encode` in ENSv2's contracts —
 * a length-prefixed label sequence terminated by a zero byte (the classic DNS packet
 * format ENSIP-based resolvers use for `bytes calldata name` parameters, e.g.
 * `PermissionedResolver.authorizeTextRoles(bytes toName, ...)`).
 *
 * "bob.dvod.eth" -> 0x03 626f62 04 64766f64 03 657468 00
 *                     "bob"       "dvod"       "eth"
 */
export function encodeDnsName(name: string): `0x${string}` {
  const labels = name.split(".").filter((label) => label.length > 0);
  const bytes: number[] = [];
  for (const label of labels) {
    const labelBytes = new TextEncoder().encode(label);
    if (labelBytes.length === 0 || labelBytes.length > 63) {
      throw new Error(`invalid DNS label length for "${label}" in "${name}"`);
    }
    bytes.push(labelBytes.length, ...labelBytes);
  }
  bytes.push(0);
  return `0x${bytes.map((b) => b.toString(16).padStart(2, "0")).join("")}`;
}
