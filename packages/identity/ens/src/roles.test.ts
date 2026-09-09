import { describe, expect, it } from "vitest";
import { RegistryRoles, ResolverRoles } from "./roles.js";

describe("role constants", () => {
  it("match the nybble-packed values from PermissionedResolverLib.sol", () => {
    expect(ResolverRoles.SET_ADDR).toBe(1n << 0n);
    expect(ResolverRoles.SET_TEXT).toBe(1n << 4n);
    expect(ResolverRoles.SET_DATA).toBe(1n << 36n);
  });

  it("pairs each role with its admin role shifted 128 bits higher", () => {
    expect(ResolverRoles.SET_TEXT_ADMIN).toBe(ResolverRoles.SET_TEXT << 128n);
    expect(ResolverRoles.SET_DATA_ADMIN).toBe(ResolverRoles.SET_DATA << 128n);
    expect(ResolverRoles.SET_ADDR_ADMIN).toBe(ResolverRoles.SET_ADDR << 128n);
  });

  it("match the nybble-packed values from RegistryRolesLib.sol", () => {
    expect(RegistryRoles.SET_SUBREGISTRY).toBe(1n << 20n);
    expect(RegistryRoles.SET_RESOLVER).toBe(1n << 24n);
    expect(RegistryRoles.SET_RESOLVER_ADMIN).toBe(RegistryRoles.SET_RESOLVER << 128n);
  });
});
