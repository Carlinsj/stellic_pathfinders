/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { useLocation } from "react-router-dom";
import type { DemoPersona, TenantConfig } from "./types";
import { allTenantConfigs, getTenantConfig } from "./tenantConfigs";
import { resolveTenant, type TenantResolution } from "./tenantResolver";

interface TenantContextValue {
  tenant?: TenantConfig;
  resolution: TenantResolution;
  persona?: DemoPersona;
  setPersona: (personaId: string) => void;
  isSwitching: boolean;
  allPersonas: DemoPersona[];
}

const TenantContext = createContext<TenantContextValue | null>(null);

function slugFromPath(pathname: string) {
  const segment = pathname.split("/").filter(Boolean)[0];
  return segment;
}

export function TenantProvider({ children }: { children: ReactNode }) {
  const location = useLocation();
  const urlSlug = slugFromPath(location.pathname);
  const resolution = useMemo(
    () => resolveTenant({ urlSlug: urlSlug || undefined }),
    [urlSlug],
  );
  const tenant =
    resolution.status === "resolved" ? getTenantConfig(resolution.slug) : undefined;
  const allPersonas = useMemo(
    () => allTenantConfigs.flatMap((config) => config.personas),
    [],
  );
  const routeRole = location.pathname.includes("/student")
    ? "student"
    : "university_admin";
  const defaultPersona = tenant?.personas.find((item) => item.role === routeRole);
  const [personaId, setPersonaId] = useState(defaultPersona?.id);
  const [isSwitching, setIsSwitching] = useState(false);

  useEffect(() => {
    setIsSwitching(true);
    setPersonaId(defaultPersona?.id);
    const timeout = window.setTimeout(() => setIsSwitching(false), 220);
    return () => window.clearTimeout(timeout);
  }, [defaultPersona?.id, tenant?.id]);

  const setPersona = (nextPersonaId: string) => {
    setIsSwitching(true);
    setPersonaId(nextPersonaId);
    window.setTimeout(() => setIsSwitching(false), 220);
  };

  const persona = allPersonas.find((item) => item.id === personaId) ?? defaultPersona;
  const style = tenant
    ? ({
        "--tenant-primary": tenant.theme.primaryColour,
        "--tenant-secondary": tenant.theme.secondaryColour,
        "--tenant-accent": tenant.theme.accentColour,
        "--tenant-surface": tenant.theme.surfaceTint,
      } as CSSProperties)
    : undefined;

  const value = useMemo(
    () => ({ tenant, resolution, persona, setPersona, isSwitching, allPersonas }),
    [allPersonas, isSwitching, persona, resolution, tenant],
  );

  return (
    <TenantContext.Provider value={value}>
      <div className={tenant ? `tenant-theme tenant-${tenant.slug}` : undefined} style={style}>
        {isSwitching && (
          <div className="tenant-transition" role="status" aria-live="polite">
            Loading university workspace…
          </div>
        )}
        {children}
      </div>
    </TenantContext.Provider>
  );
}

export function useTenant() {
  const context = useContext(TenantContext);
  if (!context) throw new Error("useTenant must be used inside TenantProvider");
  return context;
}
