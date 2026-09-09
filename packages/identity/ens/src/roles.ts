/**
 * Enhanced Access Control role bit constants, copied verbatim (values, not just
 * intent) from ensdomains/contracts-v2 `PermissionedResolverLib.sol` and
 * `RegistryRolesLib.sol` (fetched 2026-09-09, `main` branch). Each role occupies one
 * nybble (4 bits); the paired admin role is the same bit shifted 128 bits higher.
 *
 * Only the subset DVoD actually uses is included — see those two files for the full
 * role set (interface implementer, pubkey, ABI, alias, clear, etc.) if more is needed
 * later.
 */
export const ResolverRoles = {
  SET_ADDR: 1n << 0n,
  SET_ADDR_ADMIN: (1n << 0n) << 128n,
  SET_TEXT: 1n << 4n,
  SET_TEXT_ADMIN: (1n << 4n) << 128n,
  SET_DATA: 1n << 36n,
  SET_DATA_ADMIN: (1n << 36n) << 128n,
} as const;

export const RegistryRoles = {
  SET_SUBREGISTRY: 1n << 20n,
  SET_SUBREGISTRY_ADMIN: (1n << 20n) << 128n,
  SET_RESOLVER: 1n << 24n,
  SET_RESOLVER_ADMIN: (1n << 24n) << 128n,
} as const;
