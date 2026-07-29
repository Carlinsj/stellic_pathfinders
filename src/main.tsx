import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import { App } from "./App";
import { DemoProvider } from "./state/DemoContext";
import { TenantProvider } from "./tenancy/TenantContext";
import "./styles.css";

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 60_000, retry: 1 } },
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <TenantProvider>
          <DemoProvider>
            <App />
          </DemoProvider>
        </TenantProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);
