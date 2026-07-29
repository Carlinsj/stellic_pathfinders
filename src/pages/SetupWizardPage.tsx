import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Building2,
  Check,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Palette,
  Plus,
  ShieldAlert,
  Upload,
} from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { parseRoomCsv, roomCsvTemplate } from "../imports/roomCsv";
import { useDemo } from "../state/DemoContext";
import { can } from "../tenancy/permissions";
import { useTenant } from "../tenancy/TenantContext";
import { validateThemeColours } from "../tenancy/theme";
import type { WorkflowDefinition } from "../tenancy/types";
import { reorderWorkflowStep } from "../workflows/workflowEngine";

const steps = [
  "University identity",
  "Office information",
  "Feature catalogue",
  "Import buildings & rooms",
  "Resolution workflow",
  "Preview",
  "Publish",
];

export function SetupWizardPage() {
  const { tenant, customization, updateCustomization } = useDemo();
  const { persona } = useTenant();
  const [step, setStep] = useState(0);
  const [identity, setIdentity] = useState({
    name: tenant.name,
    shortName: tenant.shortName,
    slug: tenant.slug,
    primaryColour: customization.primaryColour ?? tenant.theme.primaryColour,
    secondaryColour: customization.secondaryColour ?? tenant.theme.secondaryColour,
    timezone: tenant.timezone,
    domain: tenant.domain,
    logo: "",
  });
  const [offices, setOffices] = useState({
    accessibility: tenant.terminology.accessibilityOffice,
    facilities: tenant.terminology.facilitiesOffice,
    scheduling: tenant.terminology.schedulingOffice,
    supportEmail: tenant.supportEmail,
    escalation: tenant.escalationContact,
  });
  const [featureLabels, setFeatureLabels] = useState<Record<string, string>>(
    Object.fromEntries(tenant.featureCatalogue.map((feature) => [feature.key, feature.displayName])),
  );
  const [enabledFeatures, setEnabledFeatures] = useState(
    new Set(tenant.featureCatalogue.filter((feature) => feature.active).map((feature) => feature.key)),
  );
  const [customFeature, setCustomFeature] = useState("");
  const [customFeatures, setCustomFeatures] = useState<string[]>([]);
  const [csv, setCsv] = useState(roomCsvTemplate);
  const csvResult = useMemo(() => parseRoomCsv(csv), [csv]);
  const [workflow, setWorkflow] = useState<WorkflowDefinition>(
    customization.workflow ?? tenant.workflow,
  );
  const [sourceMode, setSourceMode] = useState<"csv" | "manual" | "demo" | "adapter">("csv");
  const [publishedMessage, setPublishedMessage] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const contrast = validateThemeColours(identity.primaryColour, identity.secondaryColour);
  const authorised = persona?.role
    ? can(persona.role, "manage_tenant_configuration")
    : false;

  if (!authorised) {
    return (
      <div className="page access-blocked">
        <ShieldAlert />
        <h1>Administrator permission required</h1>
        <p>This route requires the explicit manage_tenant_configuration permission.</p>
      </div>
    );
  }

  const persistDraft = () => {
    updateCustomization({
      featureLabels,
      workflow,
      primaryColour: identity.primaryColour,
      secondaryColour: identity.secondaryColour,
      importedRoomRows: csvResult.validRows.length,
    });
  };

  const go = (direction: 1 | -1) => {
    persistDraft();
    setStep((current) => Math.max(0, Math.min(steps.length - 1, current + direction)));
  };

  const reorder = (stepId: string, direction: "up" | "down") => {
    setWorkflow((current) => reorderWorkflowStep(current, stepId, direction));
  };

  const downloadTemplate = () => {
    const blob = new Blob([roomCsvTemplate], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "roomready-room-import-template.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const publish = () => {
    if (!contrast.valid) return;
    persistDraft();
    updateCustomization({ published: true });
    setPublishedMessage(`${identity.shortName} configuration published in demo mode.`);
  };

  return (
    <div className="page setup-page">
      <header className="page-heading">
        <div><p className="eyebrow">{tenant.shortName.toUpperCase()} UNIVERSITY ONBOARDING</p><h1>Configure RoomReady without forking the application</h1><p>Step {step + 1} of 7 · Changes remain inside this synthetic demo tenant.</p></div>
        <span className="draft-status">{customization.published ? "Published demo configuration" : "Draft configuration"}</span>
      </header>

      <div className="setup-layout">
        <nav className="wizard-rail" aria-label="University setup steps">
          <ol>
            {steps.map((label, index) => (
              <li key={label}>
                <button type="button" className={index === step ? "active" : index < step ? "complete" : ""} onClick={() => { persistDraft(); setStep(index); }} aria-current={index === step ? "step" : undefined}>
                  <span>{index < step ? <Check size={15} /> : index + 1}</span><strong>{label}</strong>
                </button>
              </li>
            ))}
          </ol>
        </nav>

        <section className="wizard-panel">
          {step === 0 && (
            <div className="wizard-step">
              <div className="wizard-title"><Palette /><div><p className="eyebrow">STEP 1</p><h2>University identity</h2><p>Brand tokens are exposed through CSS variables, never scattered through page components.</p></div></div>
              <div className="form-grid">
                <label><span>University name</span><input value={identity.name} onChange={(event) => setIdentity({ ...identity, name: event.target.value })} /></label>
                <label><span>Short name</span><input value={identity.shortName} onChange={(event) => setIdentity({ ...identity, shortName: event.target.value })} /></label>
                <label><span>Slug</span><input value={identity.slug} disabled /></label>
                <label><span>Logo URL</span><input value={identity.logo} placeholder="Optional HTTPS logo" onChange={(event) => setIdentity({ ...identity, logo: event.target.value })} /></label>
                <label><span>Primary colour</span><div className="colour-input"><input type="color" value={identity.primaryColour} onChange={(event) => setIdentity({ ...identity, primaryColour: event.target.value })} /><input value={identity.primaryColour} onChange={(event) => setIdentity({ ...identity, primaryColour: event.target.value })} /></div></label>
                <label><span>Secondary colour</span><div className="colour-input"><input type="color" value={identity.secondaryColour} onChange={(event) => setIdentity({ ...identity, secondaryColour: event.target.value })} /><input value={identity.secondaryColour} onChange={(event) => setIdentity({ ...identity, secondaryColour: event.target.value })} /></div></label>
                <label><span>Timezone</span><select value={identity.timezone} onChange={(event) => setIdentity({ ...identity, timezone: event.target.value })}><option>America/New_York</option><option>America/Chicago</option><option>America/Denver</option><option>America/Los_Angeles</option></select></label>
                <label><span>Email domain</span><input value={identity.domain} onChange={(event) => setIdentity({ ...identity, domain: event.target.value })} /></label>
              </div>
              {!contrast.valid && <div className="contrast-warning" role="alert"><ShieldAlert /><div><strong>Colours do not meet 4.5:1 contrast on white.</strong><p>Try {contrast.recommendation}. Publishing is blocked until both brand colours pass.</p></div></div>}
            </div>
          )}

          {step === 1 && (
            <div className="wizard-step">
              <div className="wizard-title"><Building2 /><div><p className="eyebrow">STEP 2</p><h2>Office information</h2><p>These names drive workflow ownership and notification wording.</p></div></div>
              <div className="form-grid">
                <label><span>Accessibility-office name</span><input value={offices.accessibility} onChange={(event) => setOffices({ ...offices, accessibility: event.target.value })} /></label>
                <label><span>Facilities-office name</span><input value={offices.facilities} onChange={(event) => setOffices({ ...offices, facilities: event.target.value })} /></label>
                <label><span>Scheduling-office name</span><input value={offices.scheduling} onChange={(event) => setOffices({ ...offices, scheduling: event.target.value })} /></label>
                <label><span>Support email</span><input type="email" value={offices.supportEmail} onChange={(event) => setOffices({ ...offices, supportEmail: event.target.value })} /></label>
                <label className="span-two"><span>Escalation contact</span><input value={offices.escalation} onChange={(event) => setOffices({ ...offices, escalation: event.target.value })} /></label>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="wizard-step">
              <div className="wizard-title"><CheckCircle2 /><div><p className="eyebrow">STEP 3</p><h2>Feature catalogue</h2><p>Display names can change; stable engine concepts remain unchanged.</p></div></div>
              <div className="catalogue-editor">
                {tenant.featureCatalogue.map((feature) => (
                  <article key={feature.id}>
                    <label className="feature-toggle"><input type="checkbox" checked={enabledFeatures.has(feature.key)} onChange={(event) => setEnabledFeatures((current) => { const next = new Set(current); if (event.target.checked) next.add(feature.key); else next.delete(feature.key); return next; })} /><span>Enabled</span></label>
                    <div><small>{feature.category} · stable concept: {feature.key}</small><input aria-label={`Display name for ${feature.key}`} value={featureLabels[feature.key]} onChange={(event) => setFeatureLabels({ ...featureLabels, [feature.key]: event.target.value })} /><p>{feature.description}</p></div>
                    <label><span>Verify every</span><select defaultValue={feature.requiredVerificationFrequencyDays}><option value="90">90 days</option><option value="180">180 days</option><option value="365">365 days</option></select></label>
                  </article>
                ))}
                {customFeatures.map((feature) => <article key={feature}><span className="feature-toggle">Custom</span><div><small>Custom tenant feature</small><strong>{feature}</strong></div></article>)}
              </div>
              <div className="inline-add"><input aria-label="Custom feature name" value={customFeature} onChange={(event) => setCustomFeature(event.target.value)} placeholder="Custom feature name" /><button className="button button-secondary" type="button" onClick={() => { if (customFeature.trim()) { setCustomFeatures([...customFeatures, customFeature.trim()]); setCustomFeature(""); } }}><Plus size={15} /> Add feature</button></div>
            </div>
          )}

          {step === 3 && (
            <div className="wizard-step">
              <div className="wizard-title"><FileSpreadsheet /><div><p className="eyebrow">STEP 4</p><h2>Import buildings and rooms</h2><p>Valid rows are accepted even when other rows need correction.</p></div></div>
              <div className="source-tabs" role="tablist" aria-label="Room data source">
                {(["csv", "manual", "demo", "adapter"] as const).map((mode) => <button type="button" role="tab" aria-selected={sourceMode === mode} className={sourceMode === mode ? "active" : ""} onClick={() => setSourceMode(mode)} key={mode}>{mode === "csv" ? "CSV upload" : mode === "manual" ? "Manual creation" : mode === "demo" ? "Demo data" : "Future adapter"}</button>)}
              </div>
              {sourceMode === "csv" && <>
                <div className="csv-actions"><button className="button button-secondary" type="button" onClick={downloadTemplate}><Download size={16} /> Download CSV template</button><button className="button button-secondary" type="button" onClick={() => fileRef.current?.click()}><Upload size={16} /> Choose CSV</button><input ref={fileRef} className="sr-only" type="file" accept=".csv,text/csv" onChange={async (event) => { const file = event.target.files?.[0]; if (file) setCsv(await file.text()); }} /></div>
                <label><span>CSV preview</span><textarea rows={9} value={csv} onChange={(event) => setCsv(event.target.value)} /></label>
                <div className="import-summary"><span className="valid"><CheckCircle2 /> {csvResult.validRows.length} valid row{csvResult.validRows.length === 1 ? "" : "s"} ready</span><span className={csvResult.errors.length ? "invalid" : "valid"}><ShieldAlert /> {csvResult.errors.length} row error{csvResult.errors.length === 1 ? "" : "s"}</span></div>
                {csvResult.errors.map((error) => <p className="row-error" key={`${error.row}-${error.message}`}>Row {error.row}: {error.message}</p>)}
              </>}
              {sourceMode === "manual" && <div className="form-grid"><label><span>Building name</span><input placeholder="Demo Hall" /></label><label><span>Building code</span><input placeholder="DH" /></label><label><span>Room number</span><input placeholder="101" /></label><label><span>Capacity</span><input type="number" min="1" defaultValue="40" /></label></div>}
              {sourceMode === "demo" && <div className="setup-option-card"><Building2 /><div><strong>Load {tenant.scenario.rooms.length} synthetic {tenant.shortName} rooms</strong><p>Includes {tenant.scenario.buildings.length} buildings and one open verification request.</p></div><button type="button" className="button button-primary">Import demo inventory</button></div>}
              {sourceMode === "adapter" && <div className="setup-option-card"><ArrowRight /><div><strong>Scheduling-system adapter</strong><p>Production adapters implement a tenant discovery and inventory ingestion interface. No external connection is made in competition mode.</p></div><span className="draft-status">Future integration</span></div>}
            </div>
          )}

          {step === 4 && (
            <div className="wizard-step">
              <div className="wizard-title"><ArrowDown /><div><p className="eyebrow">STEP 5</p><h2>Resolution workflow</h2><p>Use Move up and Move down for complete keyboard access. Saving creates version {workflow.version}.</p></div></div>
              <ol className="workflow-editor">
                {workflow.steps.map((workflowStep, index) => (
                  <li key={workflowStep.id}>
                    <span className="step-order">{index + 1}</span>
                    <div><strong>{workflowStep.label}</strong><small>{workflowStep.type.replaceAll("_", " ")} · {workflowStep.ownerRole.replaceAll("_", " ")}</small></div>
                    <div className="reorder-actions"><button type="button" aria-label={`Move ${workflowStep.label} up`} disabled={index === 0} onClick={() => reorder(workflowStep.id, "up")}><ArrowUp /></button><button type="button" aria-label={`Move ${workflowStep.label} down`} disabled={index === workflow.steps.length - 1} onClick={() => reorder(workflowStep.id, "down")}><ArrowDown /></button></div>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {step === 5 && (
            <div className="wizard-step">
              <div className="wizard-title"><Palette /><div><p className="eyebrow">STEP 6</p><h2>Preview</h2><p>One shared component tree rendered with this draft configuration.</p></div></div>
              <div className="setup-preview" style={{ "--preview-primary": identity.primaryColour, "--preview-accent": identity.secondaryColour } as React.CSSProperties}>
                <header><span>{tenant.logoText}</span><div><strong>{identity.shortName} RoomReady</strong><small>{offices.accessibility}</small></div></header>
                <div className="preview-alert"><BellPreview /><div><small>ROOM CHANGE ALERT</small><strong>{tenant.scenario.course.courseCode} needs review</strong><p>{featureLabels[tenant.scenario.requirements[0]!.featureType]} and {tenant.scenario.requirements.length - 1} other checks use your catalogue wording.</p></div></div>
                <ol>{workflow.steps.map((item, index) => <li key={item.id}><span>{index + 1}</span>{item.label}</li>)}</ol>
              </div>
            </div>
          )}

          {step === 6 && (
            <div className="wizard-step publish-step">
              <div className="publish-icon"><CheckCircle2 /></div>
              <p className="eyebrow">STEP 7</p><h2>Publish {identity.shortName} configuration</h2>
              <p>Publishing activates this configuration in the current browser demo. It does not contact a scheduling system or send external notifications.</p>
              <ul className="publish-checks">
                <li><CheckCircle2 /> {enabledFeatures.size} enabled feature concepts</li>
                <li><CheckCircle2 /> Workflow snapshot version {workflow.version}</li>
                <li><CheckCircle2 /> {csvResult.validRows.length} valid imported room row{csvResult.validRows.length === 1 ? "" : "s"}</li>
                <li className={contrast.valid ? "" : "failed"}>{contrast.valid ? <CheckCircle2 /> : <ShieldAlert />} Brand contrast {contrast.valid ? "passes" : "must be fixed"}</li>
              </ul>
              <button className="button button-primary button-large" type="button" disabled={!contrast.valid} onClick={publish}>Publish in demo mode <Check size={17} /></button>
              {publishedMessage && <div className="save-confirmation" role="status"><CheckCircle2 /> {publishedMessage}</div>}
            </div>
          )}

          <footer className="wizard-footer">
            <button className="button button-secondary" type="button" disabled={step === 0} onClick={() => go(-1)}><ArrowLeft size={16} /> Back</button>
            {step < steps.length - 1 && <button className="button button-primary" type="button" onClick={() => go(1)}>Save &amp; continue <ArrowRight size={16} /></button>}
          </footer>
        </section>
      </div>
    </div>
  );
}

function BellPreview() {
  return <span aria-hidden="true"><FileSpreadsheet /></span>;
}
