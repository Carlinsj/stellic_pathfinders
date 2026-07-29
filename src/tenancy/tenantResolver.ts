import type { UniversitySlug } from "../domain/types";
import type { TenantIdentity } from "./types";
import { getTenantConfig } from "./tenantConfigs";

export interface TenantResolutionInput {
  urlSlug?: string;
  user?: TenantIdentity | null;
  demoSlug?: UniversitySlug;
  domainSlug?: UniversitySlug;
}

export type TenantResolution =
  | { status: "resolved"; slug: UniversitySlug; source: "url" | "profile" | "demo" | "domain" }
  | { status: "public"; slug: null; source: "none" }
  | { status: "blocked"; slug: UniversitySlug; source: "conflict"; message: string }
  | { status: "not_found"; slug: null; source: "url"; message: string };

export function resolveTenant({
  urlSlug,
  user,
  demoSlug,
  domainSlug,
}: TenantResolutionInput): TenantResolution {
  const urlTenant = urlSlug ? getTenantConfig(urlSlug) : undefined;
  if (urlSlug && !urlTenant) {
    return {
      status: "not_found",
      slug: null,
      source: "url",
      message: "That university workspace is not available.",
    };
  }

  if (
    urlTenant &&
    user?.universitySlug &&
    user.role !== "platform_admin" &&
    user.universitySlug !== urlTenant.slug
  ) {
    return {
      status: "blocked",
      slug: urlTenant.slug,
      source: "conflict",
      message: "Your account belongs to a different university workspace.",
    };
  }

  if (urlTenant) return { status: "resolved", slug: urlTenant.slug, source: "url" };
  if (user?.universitySlug) {
    return { status: "resolved", slug: user.universitySlug, source: "profile" };
  }
  if (demoSlug) return { status: "resolved", slug: demoSlug, source: "demo" };
  if (domainSlug) return { status: "resolved", slug: domainSlug, source: "domain" };
  return { status: "public", slug: null, source: "none" };
}

export interface TenantDiscoveryAdapter {
  resolveByEmailDomain(email: string): Promise<UniversitySlug | null>;
}

export class StaticDomainTenantAdapter implements TenantDiscoveryAdapter {
  async resolveByEmailDomain(email: string) {
    const domain = email.split("@")[1]?.toLowerCase();
    if (domain === "example.nyu.edu") return "nyu";
    if (domain === "example.illinois.edu") return "uiuc";
    return null;
  }
}
