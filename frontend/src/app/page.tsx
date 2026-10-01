"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ChangeEvent, CSSProperties, DragEvent, FormEvent, ReactNode } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { AnimatePresence, domAnimation, LazyMotion, m, useReducedMotion } from "motion/react";
import {
  Activity, ArrowRight, ArrowUpRight, BookOpenText, Check, CheckCheck, ChevronDown,
  CircleHelp, ClipboardCheck, CloudUpload, FileCheck2, FileText, GitCompareArrows,
  Layers3, LoaderCircle, MessageCircleQuestion, Plus, Search, Sparkles, X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

const API = (process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8080").replace(/\/$/, "");

type Project = { project_id: string; name: string; description?: string; analysis_status?: string; brd_status?: string; analysis_summary?: string; source_count?: number; sources?: Source[]; open_questions?: unknown[]; [key: string]: unknown };
type Source = { source_id: string; filename: string; mime_type: string; byte_size: number; uploaded_at: string; analyzed?: boolean };
type Evidence = { evidence_id: string; requirement_id: string; source_id: string; location: string; supporting_text: string; explanation: string };
type Requirement = { id: string; description: string; type: string; priority: string; confidence: number; classification: string; rationale?: string; evidence: { source_id: string; location: string; supporting_text: string; explanation: string }[]; acceptance_criteria?: string[]; related_conflict_ids?: string[] };
type Conflict = { id: string; title: string; severity: string; source_a_id: string; source_a_statement: string; source_b_id: string; source_b_statement: string; impact: string; why_it_matters: string; requirement_ids?: string[]; status: string; resolution?: string; selected_source_id?: string; resolution_rationale?: string };
type Decision = { decision_id: string; conflict_id: string; choice: string; selected_source_id?: string; rationale: string; status: string; decided_at: string };
type Ask = { answer: string; citations: { requirement_id?: string; evidence_id?: string; source_id?: string; explanation?: string }[] };
type View = "Overview" | "Requirements" | "Evidence" | "Conflicts" | "Decisions" | "Ask Fusion" | "BRD";
type Choice = "ACCEPT_SOURCE_A" | "ACCEPT_SOURCE_B" | "KEEP_UNRESOLVED";

const navItems: { name: View; icon: LucideIcon }[] = [
  { name: "Overview", icon: Activity },
  { name: "Requirements", icon: ClipboardCheck },
  { name: "Evidence", icon: BookOpenText },
  { name: "Conflicts", icon: GitCompareArrows },
  { name: "Decisions", icon: CheckCheck },
  { name: "Ask Fusion", icon: MessageCircleQuestion },
  { name: "BRD", icon: FileText },
];

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(API + path, init);
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.detail || "Request failed (" + response.status + ")");
  }
  return response.json() as Promise<T>;
}

export default function Home() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState("");
  const [project, setProject] = useState<Project | null>(null);
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [evidence, setEvidence] = useState<Evidence[]>([]);
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [pending, setPending] = useState<Conflict[]>([]);
  const [view, setView] = useState<View>("Overview");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [projectDialog, setProjectDialog] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [decisionRequest, setDecisionRequest] = useState<{ conflict: Conflict; choice: Choice } | null>(null);
  const [decisionRationale, setDecisionRationale] = useState("");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<Ask | null>(null);
  const [brd, setBrd] = useState("");
  const [dropActive, setDropActive] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();

  const reloadProjects = useCallback(async () => {
    const list = await api<Project[]>("/api/projects");
    setProjects(list);
    return list;
  }, []);

  const refreshProject = useCallback(async (id: string) => {
    if (!id) return;
    setLoading(true);
    try {
      const [detail, reqs, evs, cons, decisionResult] = await Promise.all([
        api<Project>("/api/projects/" + id),
        api<Requirement[]>("/api/projects/" + id + "/requirements"),
        api<Evidence[]>("/api/projects/" + id + "/evidence"),
        api<Conflict[]>("/api/projects/" + id + "/conflicts"),
        api<{ decisions: Decision[]; pending: Conflict[] }>("/api/projects/" + id + "/decisions"),
      ]);
      setProject(detail);
      setRequirements(reqs);
      setEvidence(evs);
      setConflicts(cons);
      setDecisions(decisionResult.decisions);
      setPending(decisionResult.pending);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load project data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const enter = window.setTimeout(() => document.documentElement.setAttribute("data-entered", ""), 1800);
    let active = true;
    const load = window.setTimeout(() => {
      void reloadProjects().then((list) => {
        if (!active) return;
        if (list[0]) setProjectId(list[0].project_id);
        else setLoading(false);
      }).catch((err) => {
        if (active) {
          setError(err instanceof Error ? err.message : "The Fusion API is not reachable.");
          setLoading(false);
        }
      });
    }, 0);
    return () => {
      active = false;
      window.clearTimeout(enter);
      window.clearTimeout(load);
    };
  }, [reloadProjects]);

  useEffect(() => {
    if (!projectId) return;
    const timer = window.setTimeout(() => { void refreshProject(projectId); }, 0);
    return () => window.clearTimeout(timer);
  }, [projectId, refreshProject]);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !pageRef.current) return;
    const root = pageRef.current;
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("reveal-visible");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08, rootMargin: "0px 0px -48px 0px" });
    const frame = window.requestAnimationFrame(() => {
      root.querySelectorAll<HTMLElement>("[data-reveal]").forEach((element) => {
        if (element.getBoundingClientRect().top > window.innerHeight * 0.9) {
          element.classList.add("reveal-pending");
          observer.observe(element);
        }
      });
    });
    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [view, loading, project]);

  const highConfidence = requirements.filter((item) => item.confidence >= 0.8).length;
  const openQuestions = Array.isArray(project?.open_questions) ? project.open_questions.length : 0;
  const sourceCount = project?.sources?.length || 0;
  const selectedConflictCount = conflicts.filter((item) => item.status === "NEEDS_HUMAN_DECISION").length;
  const firstConflict = pending[0] || conflicts[0];
  const steps = [
    ["Files uploaded", sourceCount > 0],
    ["Multimodal analysis", project?.analysis_status === "complete"],
    ["Requirements extracted", requirements.length > 0],
    ["Sources cross-checked", project?.analysis_status === "complete"],
    ["Conflicts reviewed", project?.analysis_status === "complete"],
    ["Evidence mapped", evidence.length > 0],
    ["BRD generated", project?.brd_status === "generated"],
  ] as [string, boolean][];

  async function runAnalysis(id = projectId) {
    setBusy("Analyzing all sources with Gemini…");
    setError("");
    setNotice("");
    try {
      await api("/api/projects/" + id + "/analyze", { method: "POST" });
      await Promise.all([refreshProject(id), reloadProjects()]);
      setNotice("Cross-source analysis complete. Evidence and conflicts are ready for review.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setBusy("");
    }
  }

  async function launchDemo() {
    setBusy("Creating the five-source checkout demo…");
    setError("");
    setNotice("");
    try {
      const result = await api<{ project: Project; sources: Source[] }>("/api/demo", { method: "POST" });
      setProjectId(result.project.project_id);
      setView("Overview");
      await reloadProjects();
      setBusy("Running Gemini across the transcript, PDFs, screenshot, and analytics…");
      await api("/api/projects/" + result.project.project_id + "/analyze", { method: "POST" });
      await refreshProject(result.project.project_id);
      await reloadProjects();
      setNotice("Demo analysis complete. Open Conflicts to review the payment-retention decision.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not launch demo");
    } finally {
      setBusy("");
    }
  }

  async function createProject(event: FormEvent) {
    event.preventDefault();
    setBusy("Creating project…");
    setError("");
    try {
      const created = await api<Project>("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: projectName, description: projectDescription }),
      });
      await reloadProjects();
      setProjectId(created.project_id);
      setProjectDialog(false);
      setProjectName("");
      setProjectDescription("");
      setView("Overview");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Project creation failed");
    } finally {
      setBusy("");
    }
  }

  async function uploadFiles(fileList: FileList | File[]) {
    if (!projectId || !fileList.length) return;
    const form = new FormData();
    Array.from(fileList).forEach((file) => form.append("files", file));
    setBusy("Uploading " + fileList.length + " source" + (fileList.length > 1 ? "s" : "") + "…");
    setError("");
    setNotice("");
    try {
      await api("/api/projects/" + projectId + "/upload", { method: "POST", body: form });
      await refreshProject(projectId);
      await reloadProjects();
      setNotice("Sources stored securely. Run analysis when your source set is ready.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy("");
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  async function submitAsk(event: FormEvent) {
    event.preventDefault();
    if (!projectId || !question.trim()) return;
    setBusy("Searching project evidence…");
    setError("");
    setAnswer(null);
    try {
      const result = await api<Ask>("/api/projects/" + projectId + "/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });
      setAnswer(result);
      setQuestion("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ask Fusion failed");
    } finally {
      setBusy("");
    }
  }

  async function recordDecision(event: FormEvent) {
    event.preventDefault();
    if (!decisionRequest || !decisionRationale.trim()) return;
    const { conflict, choice } = decisionRequest;
    setBusy("Recording human decision…");
    setError("");
    try {
      await api("/api/projects/" + projectId + "/conflicts/" + conflict.id + "/decision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ choice, rationale: decisionRationale.trim() }),
      });
      await refreshProject(projectId);
      setDecisionRequest(null);
      setDecisionRationale("");
      setNotice("Decision recorded in the project decision log.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Decision could not be saved");
    } finally {
      setBusy("");
    }
  }

  async function createBrd() {
    setBusy("Preparing a traceable BRD…");
    setError("");
    try {
      const result = await api<{ markdown: string }>("/api/projects/" + projectId + "/generate-brd", { method: "POST" });
      setBrd(result.markdown);
      await refreshProject(projectId);
      setView("BRD");
      setNotice("BRD generated with requirement traceability and unresolved decisions.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "BRD generation failed");
    } finally {
      setBusy("");
    }
  }

  async function downloadBrd() {
    try {
      const result = brd ? { markdown: brd } : await api<{ markdown: string }>("/api/projects/" + projectId + "/brd");
      const objectUrl = URL.createObjectURL(new Blob([result.markdown], { type: "text/markdown" }));
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = (project?.name || "fusion-brd").toLowerCase().replace(/[^a-z0-9]+/g, "-") + "-brd.md";
      anchor.click();
      URL.revokeObjectURL(objectUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not download BRD");
    }
  }

  async function openBrd() {
    setBusy("Loading BRD…");
    setError("");
    try {
      const result = await api<{ markdown: string }>("/api/projects/" + projectId + "/brd");
      setBrd(result.markdown);
    } catch (err) {
      setError(err instanceof Error ? err.message : "BRD is not available");
    } finally {
      setBusy("");
    }
  }

  function chooseView(next: View) {
    setView(next);
    if (next === "BRD" && project?.brd_status === "generated" && !brd) void openBrd();
  }

  function handleDrop(event: DragEvent<HTMLElement>) {
    event.preventDefault();
    setDropActive(false);
    void uploadFiles(event.dataTransfer.files);
  }

  function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    if (event.target.files) void uploadFiles(event.target.files);
  }

  const metrics = [
    { label: "Requirements", value: requirements.length, note: "Across all source material", tone: "ink", icon: ClipboardCheck },
    { label: "High confidence", value: highConfidence, note: "At least 80% evidence confidence", tone: "green", icon: CheckCheck },
    { label: "Open conflicts", value: selectedConflictCount, note: "Waiting on a human decision", tone: "red", icon: GitCompareArrows },
    { label: "Open questions", value: openQuestions, note: "Context to clarify before sign-off", tone: "amber", icon: CircleHelp },
    { label: "Source files", value: sourceCount, note: "Shared project context", tone: "ink", icon: FileCheck2 },
    { label: "Evidence links", value: evidence.length, note: "Traceable to their source", tone: "ink", icon: BookOpenText },
  ];

  return (
    <main className="app-shell">
      <Splash />
      <header className="masthead">
        <a className="brand" href="#" onClick={(event) => event.preventDefault()} aria-label="Fusion Vertex home">
          <span className="brand-mark" aria-hidden="true"><span>F</span><i /></span>
          <span className="brand-name">fusion<span>.vertex</span></span>
        </a>

        <nav className="nav-capsule" aria-label="Project sections">
          {navItems.map(({ name, icon: Icon }) => (
            <button key={name} className={"nav-link" + (view === name ? " is-active" : "")} onClick={() => chooseView(name)} aria-current={view === name ? "page" : undefined}>
              <Icon aria-hidden="true" size={17} strokeWidth={1.8} />
              <span>{name}</span>
              {name === "Conflicts" && selectedConflictCount > 0 && <span className="nav-count">{selectedConflictCount}</span>}
            </button>
          ))}
        </nav>

        <div className="masthead-actions">
          <label className="project-search">
            <Search aria-hidden="true" size={17} />
            <span className="sr-only">Select project</span>
            <select value={projectId} onChange={(event) => {
              const next = event.target.value;
              setProjectId(next);
              setBrd("");
              setAnswer(null);
              if (!next) {
                setProject(null);
                setRequirements([]);
                setEvidence([]);
                setConflicts([]);
                setDecisions([]);
                setPending([]);
                setLoading(false);
              }
            }}>
              <option value="">Select project</option>
              {projects.map((item) => <option key={item.project_id} value={item.project_id}>{item.name}</option>)}
            </select>
            <ChevronDown aria-hidden="true" size={15} />
          </label>
          <button className="new-project-button" onClick={() => setProjectDialog(true)} aria-label="Create a new project"><Plus size={18} /><span>New</span></button>
        </div>
      </header>

      <div className="content-shell" ref={pageRef} aria-busy={loading}>
        {error && <div className="notice notice-error" role="alert"><span className="notice-mark"><X size={16} /></span><div><strong>Action needed</strong><p>{error}</p></div><button className="notice-close" onClick={() => setError("")} aria-label="Dismiss error"><X size={17} /></button></div>}
        {notice && <div className="notice notice-success" role="status"><span className="notice-mark"><Check size={16} /></span><p>{notice}</p><button className="notice-close" onClick={() => setNotice("")} aria-label="Dismiss message"><X size={17} /></button></div>}
        {busy && <div className="busy-strip" role="status" aria-live="polite"><LoaderCircle className="busy-spinner" size={17} />{busy}<span className="busy-track"><i /></span></div>}

        {loading && !project ? <LoadingWorkspace /> : !project ? (
          <WelcomeState onCreate={() => setProjectDialog(true)} onDemo={() => void launchDemo()} />
        ) : (
          <LazyMotion features={domAnimation}>
            <AnimatePresence mode="wait" initial={false}>
              <m.div
                key={view}
                className="view-frame"
                initial={reduceMotion ? false : { opacity: 0, y: 34, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -12, scale: 0.99 }}
                transition={reduceMotion ? { duration: 0 } : { duration: 0.62, ease: [0.22, 0.61, 0.36, 1] }}
              >
                {view === "Overview" && <OverviewView
                  project={project}
                  metrics={metrics}
                  steps={steps}
                  sourceCount={sourceCount}
                  sources={project.sources || []}
                  firstConflict={firstConflict}
                  requirements={requirements}
                  onUpload={() => fileInput.current?.click()}
                  onDrop={handleDrop}
                  onDragOver={(event) => { event.preventDefault(); setDropActive(true); }}
                  onDragLeave={() => setDropActive(false)}
                  onDemo={() => void launchDemo()}
                  onRunAnalysis={() => void runAnalysis()}
                  busy={!!busy}
                  onView={chooseView}
                  dropActive={dropActive}
                  fileInput={<input ref={fileInput} className="visually-hidden" type="file" multiple accept=".pdf,.docx,.txt,.png,.jpg,.jpeg,.csv" onChange={onFileChange} aria-label="Choose project source files" />}
                />}
                {view === "Requirements" && <RequirementsView requirements={requirements} onEvidence={() => chooseView("Evidence")} />}
                {view === "Evidence" && <EvidenceView evidence={evidence} requirements={requirements} sources={project.sources || []} />}
                {view === "Conflicts" && <ConflictsView conflicts={conflicts} decisions={decisions} project={project} onDecision={(conflict, choice) => { setDecisionRationale(""); setDecisionRequest({ conflict, choice }); }} />}
                {view === "Decisions" && <DecisionsView decisions={decisions} pending={pending} onReview={() => chooseView("Conflicts")} />}
                {view === "Ask Fusion" && <AskView project={project} requirements={requirements} evidence={evidence} answer={answer} question={question} busy={!!busy} onQuestion={setQuestion} onSubmit={submitAsk} />}
                {view === "BRD" && <BrdView project={project} requirements={requirements} brd={brd} busy={!!busy} onGenerate={() => void createBrd()} onDownload={() => void downloadBrd()} />}
              </m.div>
            </AnimatePresence>
          </LazyMotion>
        )}
      </div>

      {project && <RiskTicker project={project} pending={pending} requirements={requirements} onConflict={() => chooseView("Conflicts")} onRequirements={() => chooseView("Requirements")} />}

      <Dialog.Root open={projectDialog} onOpenChange={setProjectDialog}>
        <Dialog.Portal>
          <Dialog.Backdrop className="dialog-backdrop" />
          <Dialog.Popup className="dialog-popup">
            <div className="dialog-orbit"><Layers3 size={20} /></div>
            <Dialog.Title className="dialog-title">Start with your business context.</Dialog.Title>
            <Dialog.Description className="dialog-description">Create a project, then bring the documents, conversations, images, and data your team needs to reconcile.</Dialog.Description>
            <form onSubmit={createProject}>
              <label className="form-label">Project name
                <input required minLength={2} maxLength={120} autoFocus placeholder="e.g. Checkout modernization" value={projectName} onChange={(event) => setProjectName(event.target.value)} />
              </label>
              <label className="form-label">Project description <span className="optional">Optional</span>
                <textarea rows={3} maxLength={2000} placeholder="What business outcome is this project trying to achieve?" value={projectDescription} onChange={(event) => setProjectDescription(event.target.value)} />
              </label>
              <div className="dialog-actions"><Dialog.Close className="button button-quiet" type="button">Cancel</Dialog.Close><button className="button button-dark" type="submit" disabled={!!busy}>Create project <ArrowRight size={16} /></button></div>
            </form>
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>

      <Dialog.Root open={!!decisionRequest} onOpenChange={(open) => { if (!open) setDecisionRequest(null); }}>
        <Dialog.Portal>
          <Dialog.Backdrop className="dialog-backdrop" />
          <Dialog.Popup className="dialog-popup dialog-popup--decision">
            <div className="dialog-orbit dialog-orbit--decision"><GitCompareArrows size={20} /></div>
            <Dialog.Title className="dialog-title">Record the team’s decision.</Dialog.Title>
            <Dialog.Description className="dialog-description">
              {decisionRequest && <>{choiceLabel(decisionRequest.choice)} for <strong>{decisionRequest.conflict.id}</strong>. Add the rationale so this call stays traceable.</>}
            </Dialog.Description>
            <form onSubmit={recordDecision}>
              <label className="form-label">Decision rationale
                <textarea autoFocus required minLength={3} maxLength={3000} rows={4} placeholder="What evidence or business context supports this choice?" value={decisionRationale} onChange={(event) => setDecisionRationale(event.target.value)} />
              </label>
              <div className="dialog-actions"><Dialog.Close className="button button-quiet" type="button">Cancel</Dialog.Close><button className="button button-dark" type="submit" disabled={!!busy || !decisionRationale.trim()}>Record decision <ArrowRight size={16} /></button></div>
            </form>
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
    </main>
  );
}

function LoadingWorkspace() {
  return <div className="loading-workspace" aria-label="Loading project workspace">
    <section className="hero-section hero-loading"><span className="loading-line loading-kicker" /><span className="loading-line loading-title" /><span className="loading-line loading-copy" /></section>
    <section className="figures-panel figures-loading"><div className="figures-grid">{Array.from({ length: 6 }, (_, i) => <div className="stat-card loading-card" key={i}><span className="loading-line" /><span className="loading-line" /><span className="loading-line" /></div>)}</div></section>
    <div className="loading-steps"><span /><span /><span /><span /><span /></div>
  </div>;
}

function WelcomeState({ onCreate, onDemo }: { onCreate: () => void; onDemo: () => void }) {
  return <div className="welcome-state">
    <section className="hero-section hero-empty">
      <HeroField />
      <div className="hero-kicker"><span className="live-indicator" /> FUSION VERTEX <span className="kicker-divider">·</span> REQUIREMENTS INTELLIGENCE</div>
      <h1>Bring the whole brief<br />into <span>focus.</span></h1>
      <p className="hero-lede">A delivery workspace for turning scattered product context into decisions your team can stand behind.</p>
      <div className="welcome-actions"><button className="button button-dark" onClick={onCreate}>Create a project <ArrowRight size={17} /></button><button className="button button-quiet" onClick={onDemo}>Explore the checkout demo <ArrowUpRight size={16} /></button></div>
      <div className="hero-index"><span>01</span><i /><span>Sources in. Decisions out.</span></div>
    </section>
    <section className="welcome-slab">
      <div><span className="overline">A CLEARER DELIVERY LOOP</span><h2>Keep the reasoning<br />attached to the work.</h2><p>Requirements, evidence, contradictions, and approvals stay in one connected record.</p></div>
      <div className="welcome-steps">{[["01", "Bring in source material"], ["02", "Cross-check every claim"], ["03", "Record the human call"]].map(([number, label]) => <div key={number}><span>{number}</span><strong>{label}</strong><ArrowUpRight size={17} /></div>)}</div>
    </section>
  </div>;
}

function OverviewView({ project, metrics, steps, sourceCount, sources, firstConflict, requirements, onUpload, onDrop, onDragOver, onDragLeave, onDemo, onRunAnalysis, busy, onView, dropActive, fileInput }: {
  project: Project; metrics: { label: string; value: number; note: string; tone: string; icon: LucideIcon }[]; steps: [string, boolean][]; sourceCount: number;
  sources: Source[]; firstConflict?: Conflict; requirements: Requirement[]; onUpload: () => void; onDrop: (event: DragEvent<HTMLElement>) => void;
  onDragOver: (event: DragEvent<HTMLElement>) => void; onDragLeave: () => void; onDemo: () => void; onRunAnalysis: () => void; busy: boolean; onView: (view: View) => void;
  dropActive: boolean; fileInput: ReactNode;
}) {
  return <>
    <section className="hero-section">
      <HeroField />
      <div className="hero-kicker"><span className="live-indicator" /> PROJECT INTELLIGENCE <span className="kicker-divider">·</span> {project.analysis_status === "complete" ? "ANALYSIS CURRENT" : "DELIVERY WORKSPACE"}</div>
      <h1>Every requirement,<br /><span>grounded in its sources.</span></h1>
      <div className="hero-summary-row">
        <p className="hero-lede">{project.description || "Bring product docs, conversations, screenshots, and data into one traceable workspace."}</p>
        <div className="hero-context"><span className="context-index">ACTIVE PROJECT</span><strong>{project.name}</strong><span className={"analysis-state " + (project.analysis_status === "complete" ? "state-ready" : "")}><i />{project.analysis_status === "complete" ? "Analysis current" : sourceCount ? "Ready to analyze" : "Waiting for sources"}</span>{sourceCount > 0 && <button className="button button-dark button-small run-analysis" onClick={onRunAnalysis} disabled={busy}><Sparkles size={14} /> Run analysis</button>}</div>
      </div>
    </section>

    <section className="figures-panel" aria-label="Project figures">
      <div className="figures-grid">{metrics.map((metric, index) => <Metric key={metric.label} {...metric} delay={index} />)}</div>
    </section>

    <section className="workflow-slab" data-reveal>
      <div className="workflow-intro"><span className="overline">THE REVIEW PATH</span><h2>From source material<br />to sign-off.</h2><p>Each handoff stays visible, so the team always knows what is ready and where a human call is still needed.</p><button className="slab-link" onClick={() => onView("Evidence")}>Follow the evidence <ArrowRight size={16} /></button></div>
      <ol className="workflow-steps">{steps.map(([label, done], index) => <li key={label} className={done ? "is-done" : ""}><span className="workflow-marker">{done ? <Check size={15} /> : String(index + 1).padStart(2, "0")}</span><span className="workflow-label">{label}</span>{index < steps.length - 1 && <span className="workflow-connector" />}</li>)}</ol>
    </section>

    <section className="overview-columns">
      <section className="surface source-surface" data-reveal onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}>
        <header className="section-heading"><div><span className="overline">SOURCE LIBRARY</span><h2>Project evidence</h2><p>Fragmented inputs, analyzed together.</p></div><button className="button button-quiet button-small" onClick={onUpload}><Plus size={16} /> Add sources</button></header>
        {fileInput}
        {sources.length > 0 ? <div className="source-list">{sources.map((source) => <SourceRow key={source.source_id} source={source} />)}</div> : <div className={"upload-target" + (dropActive ? " is-dragging" : "")}>
          <span className="upload-glyph"><CloudUpload size={22} strokeWidth={1.6} /></span><strong>Drop files here, or <button className="inline-link" onClick={onUpload}>browse</button></strong><p>PDF, DOCX, TXT, PNG, JPG, CSV <span>·</span> 10 MB per file</p><button className="text-link" onClick={onDemo}>Or load the five-source checkout demo <ArrowRight size={14} /></button>
        </div>}
        {sourceCount > 0 && <footer className="source-footer"><span><i /> Private project storage</span><button className="text-link" onClick={() => onView("Evidence")}>Open evidence map <ArrowRight size={14} /></button></footer>}
      </section>

      <section className="surface spotlight-surface" data-reveal>
        <header className="section-heading"><div><span className="overline">DECISION SPOTLIGHT</span><h2>{firstConflict ? "A call is waiting." : "Nothing to resolve yet."}</h2></div><GitCompareArrows size={20} strokeWidth={1.5} /></header>
        {firstConflict ? <div className="spotlight-content"><div className="spotlight-meta"><StatusBadge tone={firstConflict.severity === "Critical" ? "red" : "amber"}>{firstConflict.severity} conflict</StatusBadge><span>{firstConflict.id}</span></div><h3>{firstConflict.title}</h3><p>{firstConflict.why_it_matters}</p><div className="evidence-pair"><div><span>A</span><p>{firstConflict.source_a_statement}</p></div><i /><div><span>B</span><p>{firstConflict.source_b_statement}</p></div></div><button className="button button-dark button-wide" onClick={() => onView("Conflicts")}>Review decision <ArrowRight size={16} /></button></div> : <div className="spotlight-empty"><span className="quiet-orbit"><Check size={21} /></span><p>Once sources are analyzed together, contradictions and decisions will surface here with the evidence beside them.</p><button className="text-link" onClick={() => onView("Conflicts")}>Open conflict review <ArrowRight size={14} /></button></div>}
      </section>
    </section>

    <section className="surface requirements-preview" data-reveal>
      <header className="section-heading"><div><span className="overline">REQUIREMENTS REGISTER</span><h2>Priority requirements</h2><p>Each statement carries its own source trail.</p></div><button className="text-link" onClick={() => onView("Requirements")}>View all <ArrowRight size={15} /></button></header>
      <RequirementsTable requirements={requirements.slice(0, 5)} onEvidence={() => onView("Evidence")} />
    </section>
    <div className="endnote"><span>FUSION / DELIVERY INTELLIGENCE</span><i /><span>Every conclusion stays traceable.</span></div>
  </>;
}

function Metric({ label, value, note, tone, icon: IconComponent, delay }: { label: string; value: number; note: string; tone: string; icon: LucideIcon; delay: number }) {
  return <article className={"stat-card stat-" + tone} style={{ "--enter-order": delay } as CSSProperties}>
    <div className="stat-top"><span className="stat-icon"><IconComponent size={18} strokeWidth={1.7} /></span><span className="stat-label">{label}</span></div>
    <CountUp value={value} />
    <span className="stat-note">{note}</span>
  </article>;
}

function CountUp({ value }: { value: number }) {
  const [shown, setShown] = useState(value);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const node = ref.current;
    if (!node || window.matchMedia("(prefers-reduced-motion: reduce)").matches) { setShown(value); return; }
    let frame = 0;
    let start = 0;
    let running = false;
    const tick = (now: number) => {
      if (!start) start = now;
      const t = Math.min(1, (now - start) / 900);
      const eased = 1 - Math.pow(1 - t, 3);
      setShown(Math.round(value * eased));
      if (t < 1) frame = window.requestAnimationFrame(tick);
    };
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) {
        window.cancelAnimationFrame(frame);
        running = false;
        start = 0;
        return;
      }
      if (running) return;
      running = true;
      setShown(0);
      frame = window.requestAnimationFrame(tick);
    }, { threshold: 0.25 });
    observer.observe(node);
    return () => { observer.disconnect(); window.cancelAnimationFrame(frame); };
  }, [value]);
  return <><span ref={ref} className="stat-value" aria-hidden="true">{shown.toLocaleString("en-IN")}</span><span className="sr-only">{value.toLocaleString("en-IN")}</span></>;
}

function ProjectHeading({ view, label, copy, count }: { view: View; label: string; copy: string; count?: ReactNode }) {
  return <header className="subpage-heading"><div className="hero-kicker"><span className="live-indicator" /> PROJECT INTELLIGENCE <span className="kicker-divider">·</span> {label}</div><div className="subpage-title-row"><div><h1>{view}</h1><p>{copy}</p></div>{count}</div></header>;
}

function RequirementsView({ requirements, onEvidence }: { requirements: Requirement[]; onEvidence: () => void }) {
  return <section className="subpage">
    <ProjectHeading view="Requirements" label="VALIDATED WITH EVIDENCE" copy="A working register of the requirements your team can act on." count={<StatusBadge>{requirements.length} requirements</StatusBadge>} />
    <section className="surface full-surface" data-reveal><header className="section-heading"><div><span className="overline">REQUIREMENTS REGISTER</span><h2>Every claim, in context.</h2><p>Priority, confidence, conclusion, and supporting sources in the same row.</p></div></header><RequirementsTable requirements={requirements} onEvidence={onEvidence} /></section>
  </section>;
}

function RequirementsTable({ requirements, onEvidence }: { requirements: Requirement[]; onEvidence: () => void }) {
  if (!requirements.length) return <EmptyState icon={ClipboardCheck} title="No requirements extracted yet" copy="Upload a source set and run cross-source analysis to create evidence-linked requirements." />;
  return <div className="table-scroll"><table className="requirements-table"><thead><tr><th>REQUIREMENT</th><th>TYPE</th><th>PRIORITY</th><th>CONFIDENCE</th><th>CONCLUSION</th><th>TRACE</th></tr></thead><tbody>{requirements.map((req, index) => <tr key={req.id} style={{ "--row-order": index } as CSSProperties}>
    <td data-label="Requirement"><div className="requirement-cell"><span className="req-id">{req.id}</span><strong>{req.description}</strong>{req.rationale && <small>{req.rationale}</small>}</div></td>
    <td data-label="Type"><span className="type-label">{req.type.replace("-", " ")}</span></td>
    <td data-label="Priority"><StatusBadge tone={req.priority === "P0" ? "red" : req.priority === "P1" ? "amber" : "neutral"}>{req.priority}</StatusBadge></td>
    <td data-label="Confidence"><div className="confidence"><div className="confidence-track"><i style={{ width: Math.max(0, Math.min(100, req.confidence * 100)) + "%" }} /></div><span>{Math.round(req.confidence * 100)}%</span></div></td>
    <td data-label="Conclusion"><StatusBadge tone={req.classification === "SUPPORTED" ? "green" : req.classification === "NEEDS_HUMAN_DECISION" || req.classification === "CONFLICTED" ? "red" : "neutral"}>{req.classification.replaceAll("_", " ")}</StatusBadge></td>
    <td data-label="Trace"><button className="trace-link" onClick={onEvidence}>{req.evidence.length} source{req.evidence.length !== 1 ? "s" : ""}<ArrowUpRight size={13} /></button></td>
  </tr>)}</tbody></table></div>;
}

function EvidenceView({ evidence, requirements, sources }: { evidence: Evidence[]; requirements: Requirement[]; sources: Source[] }) {
  return <section className="subpage">
    <ProjectHeading view="Evidence" label="TRACEABILITY MAP" copy="Follow each requirement back to the source passage and location that supports it." count={<StatusBadge>{evidence.length} evidence links</StatusBadge>} />
    <section className="surface full-surface evidence-surface" data-reveal><header className="section-heading"><div><span className="overline">SOURCE-TO-REQUIREMENT LINKS</span><h2>Read the record behind the claim.</h2></div></header>
      {evidence.length ? <div className="evidence-list">{evidence.map((item, index) => {
        const req = requirements.find((candidate) => candidate.id === item.requirement_id);
        const source = sources.find((candidate) => candidate.source_id === item.source_id);
        return <article className="evidence-row" key={item.evidence_id} style={{ "--row-order": index } as CSSProperties}>
          <div className="evidence-index"><span>{String(index + 1).padStart(2, "0")}</span><i /><strong>{item.requirement_id}</strong></div>
          <div className="evidence-content"><div className="evidence-row-heading"><h3>{req?.description || item.requirement_id}</h3><StatusBadge>{item.evidence_id}</StatusBadge></div><div className="source-reference"><FileBadge filename={source?.filename || item.source_id} /><strong>{source?.filename || item.source_id}</strong><span>·</span>{item.location}</div>{item.supporting_text && <blockquote>“{item.supporting_text}”</blockquote>}<p>{item.explanation}</p></div>
        </article>;
      })}</div> : <EmptyState icon={BookOpenText} title="No evidence mapped yet" copy="Run cross-source analysis to extract claims and attach precise references." />}
    </section>
  </section>;
}

function ConflictsView({ conflicts, decisions, project, onDecision }: { conflicts: Conflict[]; decisions: Decision[]; project: Project; onDecision: (conflict: Conflict, choice: Choice) => void }) {
  const openCount = conflicts.filter((item) => item.status === "NEEDS_HUMAN_DECISION").length;
  return <section className="subpage">
    <ProjectHeading view="Conflicts" label="HUMAN-IN-THE-LOOP REVIEW" copy="Both source statements stay visible. Your team decides what the product should do." count={<StatusBadge tone={openCount ? "red" : "green"}>{openCount} open</StatusBadge>} />
    <div className="conflict-list">{conflicts.length ? conflicts.map((conflict, index) => <ConflictCard key={conflict.id} conflict={conflict} project={project} decisions={decisions} onDecision={onDecision} index={index} />) : <section className="surface full-surface" data-reveal><EmptyState icon={GitCompareArrows} title="No conflicts found" copy="Cross-source contradictions will appear here with their evidence and business impact." /></section>}</div>
  </section>;
}

function ConflictCard({ conflict, project, decisions, onDecision, index }: { conflict: Conflict; project: Project; decisions: Decision[]; onDecision: (conflict: Conflict, choice: Choice) => void; index: number }) {
  const sourceA = project.sources?.find((source) => source.source_id === conflict.source_a_id);
  const sourceB = project.sources?.find((source) => source.source_id === conflict.source_b_id);
  const hasFinalDecision = decisions.some((item) => item.conflict_id === conflict.id && item.status === "RECORDED");
  return <article className={"surface conflict-card" + (conflict.status === "RESOLVED" ? " conflict-resolved" : "")} data-reveal style={{ "--row-order": index } as CSSProperties}>
    <header className="conflict-header"><div><span className="overline">{conflict.id}{conflict.requirement_ids?.length ? " · " + conflict.requirement_ids.join(", ") : " · CROSS-SOURCE CONFLICT"}</span><h2>{conflict.title}</h2></div><div className="conflict-badges"><StatusBadge tone={conflict.severity === "Critical" ? "red" : "amber"}>{conflict.severity}</StatusBadge><StatusBadge tone={conflict.status === "RESOLVED" ? "green" : "red"}>{conflict.status === "RESOLVED" ? "Decision recorded" : "Needs your call"}</StatusBadge></div></header>
    <div className="conflict-evidence">
      <SourceQuote letter="A" filename={sourceA?.filename || conflict.source_a_id} sourceId={conflict.source_a_id} text={conflict.source_a_statement} />
      <span className="conflict-versus" aria-label="contradicts">≠</span>
      <SourceQuote letter="B" filename={sourceB?.filename || conflict.source_b_id} sourceId={conflict.source_b_id} text={conflict.source_b_statement} />
    </div>
    <div className="impact-grid"><div><span className="overline">BUSINESS & TECHNICAL IMPACT</span><p>{conflict.impact}</p></div><div><span className="overline">WHY THIS NEEDS YOUR CALL</span><p>{conflict.why_it_matters}</p></div></div>
    {conflict.status === "RESOLVED" && <div className="resolution-note"><Check size={16} /> Team accepted {conflict.selected_source_id} · {conflict.resolution_rationale}</div>}
    {!hasFinalDecision && conflict.status !== "RESOLVED" && <footer className="conflict-actions"><span>Fusion will not decide for your team.</span><div><button className="button button-quiet button-small" onClick={() => onDecision(conflict, "ACCEPT_SOURCE_A")}>Accept source A</button><button className="button button-quiet button-small" onClick={() => onDecision(conflict, "ACCEPT_SOURCE_B")}>Accept source B</button><button className="text-link" onClick={() => onDecision(conflict, "KEEP_UNRESOLVED")}>Keep unresolved</button></div></footer>}
  </article>;
}

function SourceQuote({ letter, filename, sourceId, text }: { letter: string; filename: string; sourceId: string; text: string }) {
  return <div className="source-quote"><div className="quote-source"><span>{letter}</span><div><small>SOURCE {letter}</small><strong>{filename}</strong><i>{sourceId}</i></div></div><blockquote>“{text}”</blockquote></div>;
}

function DecisionsView({ decisions, pending, onReview }: { decisions: Decision[]; pending: Conflict[]; onReview: () => void }) {
  return <section className="subpage">
    <ProjectHeading view="Decisions" label="HUMAN APPROVAL LOG" copy="A durable record of what the team chose, why, and what still needs review." count={<StatusBadge tone={pending.length ? "amber" : "green"}>{pending.length} pending</StatusBadge>} />
    <section className="surface full-surface" data-reveal><header className="section-heading"><div><span className="overline">PROJECT DECISION LOG</span><h2>Human calls, kept in context.</h2></div></header>
      {decisions.length || pending.length ? <div className="decision-list">
        {pending.map((item, index) => <div className="decision-row decision-pending" key={"pending-" + item.id} style={{ "--row-order": index } as CSSProperties}><span className="decision-symbol"><CircleHelp size={17} /></span><div className="decision-copy"><strong>{item.id} · {item.title}</strong><p>Needs a human decision · {item.severity} impact</p></div><button className="button button-quiet button-small" onClick={onReview}>Review conflict <ArrowRight size={15} /></button></div>)}
        {decisions.map((item, index) => <div className="decision-row" key={item.decision_id} style={{ "--row-order": index } as CSSProperties}><span className={"decision-symbol " + (item.status === "RECORDED" ? "decision-done" : "")}>{item.status === "RECORDED" ? <Check size={17} /> : <CircleHelp size={17} />}</span><div className="decision-copy"><strong>{item.conflict_id} · {choiceLabel(item.choice)}</strong><p>{item.rationale}</p><small>{new Date(item.decided_at).toLocaleString()} · {item.selected_source_id || "Unresolved by choice"}</small></div><StatusBadge tone={item.status === "RECORDED" ? "green" : item.status === "STALE" ? "neutral" : "amber"}>{item.status === "RECORDED" ? "Recorded" : item.status === "STALE" ? "Stale · review" : "Still open"}</StatusBadge></div>)}
      </div> : <EmptyState icon={CheckCheck} title="No decisions recorded" copy="Conflicts that need business approval will be listed here." />}
    </section>
  </section>;
}

function AskView({ project, requirements, evidence, answer, question, busy, onQuestion, onSubmit }: { project: Project; requirements: Requirement[]; evidence: Evidence[]; answer: Ask | null; question: string; busy: boolean; onQuestion: (question: string) => void; onSubmit: (event: FormEvent) => void }) {
  const suggestions = ["Why was the highest-priority requirement marked P0?", "Which sources support this project’s requirements?", "What decisions are still pending?", "What information is missing before sign-off?"];
  return <section className="subpage">
    <ProjectHeading view="Ask Fusion" label="PROJECT-GROUNDED ASSISTANT" copy="Answers stay grounded in this project’s requirements, source evidence, conflicts, and decisions." />
    <section className="ask-layout" data-reveal>
      <aside className="ask-notes"><div className="assistant-orbit"><Sparkles size={21} /></div><span className="overline">SUGGESTED QUESTIONS</span><h2>Start with the<br />evidence.</h2><p>Use a prompt below or ask about anything captured in this project’s source set.</p><div className="suggestions">{suggestions.map((item) => <button key={item} onClick={() => onQuestion(item)}><ArrowUpRight size={14} />{item}</button>)}</div></aside>
      <section className="ask-workspace"><header className="ask-context"><span className="live-indicator" /><strong>{project.name}</strong><i /><span>{requirements.length} requirements</span><i /><span>{evidence.length} evidence links</span></header><div className="conversation"><div className="assistant-greeting"><span className="assistant-mark"><Sparkles size={16} /></span><div><strong>Fusion is grounded in this project</strong><p>Ask about requirements, source evidence, contradictions, or open decisions.</p></div></div>{answer && <article className="answer-card"><div className="answer-heading"><span className="assistant-mark"><Sparkles size={14} /></span><strong>Fusion</strong><span>· Evidence-backed answer</span></div><p>{answer.answer}</p>{answer.citations?.length > 0 && <div className="citation-row">{answer.citations.map((citation, index) => <span className="citation-chip" key={index}>{citation.requirement_id && <b>{citation.requirement_id}</b>}{citation.source_id && <span>{citation.source_id}</span>}{citation.evidence_id && <span>{citation.evidence_id}</span>}</span>)}</div>}</article>}</div><form className="ask-form" onSubmit={onSubmit}><label className="sr-only" htmlFor="ask-fusion">Ask Fusion</label><textarea id="ask-fusion" placeholder="Ask a question about this project…" value={question} onChange={(event) => onQuestion(event.target.value)} rows={3} /><div><span>Answers use analyzed project context</span><button className="button button-dark" disabled={!question.trim() || busy}>Ask Fusion <ArrowRight size={15} /></button></div></form></section>
    </section>
  </section>;
}

function BrdView({ project, requirements, brd, busy, onGenerate, onDownload }: { project: Project; requirements: Requirement[]; brd: string; busy: boolean; onGenerate: () => void; onDownload: () => void }) {
  return <section className="subpage">
    <ProjectHeading view="BRD" label="TRACEABLE PROJECT DOCUMENT" copy="A structured business requirements document with conflicts, assumptions, and source traceability." count={<StatusBadge tone={project.brd_status === "generated" ? "green" : "neutral"}>{project.brd_status === "generated" ? "Generated" : "Not generated"}</StatusBadge>} />
    <section className="surface full-surface brd-surface" data-reveal><header className="section-heading"><div><span className="overline">BUSINESS REQUIREMENTS DOCUMENT</span><h2>{project.name}</h2><p>Project context, functional requirements, evidence, and human decisions.</p></div><div className="brd-actions">{project.brd_status === "generated" && <button className="button button-quiet" onClick={onDownload}>Download .md <ArrowUpRight size={15} /></button>}<button className="button button-dark" onClick={onGenerate} disabled={!requirements.length || busy}>{project.brd_status === "generated" ? "Regenerate BRD" : "Generate BRD"} <ArrowRight size={15} /></button></div></header>{brd ? <pre className="brd-document">{brd}</pre> : <EmptyState icon={FileText} title={requirements.length ? "Your BRD is ready to generate" : "Analyze sources first"} copy={requirements.length ? "Use the action above to render a traceable document." : "Run source analysis to build structured requirements before rendering the document."} />}</section>
  </section>;
}

function EmptyState({ icon: IconComponent, title, copy, action }: { icon: LucideIcon; title: string; copy: string; action?: ReactNode }) {
  return <div className="empty-state"><span className="empty-icon"><IconComponent size={20} strokeWidth={1.6} /></span><strong>{title}</strong><p>{copy}</p>{action}</div>;
}

function SourceRow({ source }: { source: Source }) {
  return <div className="source-row"><FileBadge filename={source.filename} /><div className="source-name"><strong>{source.filename}</strong><small>{source.source_id} · {formatBytes(source.byte_size)}</small></div><StatusBadge tone={source.analyzed ? "green" : "neutral"}>{source.analyzed ? "Analyzed" : "Ready"}</StatusBadge></div>;
}

function FileBadge({ filename }: { filename: string }) {
  const ext = filename.split(".").pop()?.toLowerCase() || "file";
  const kind = ext === "pdf" ? "pdf" : ext === "docx" ? "doc" : ["png", "jpg", "jpeg"].includes(ext) ? "image" : ext === "csv" ? "data" : "text";
  return <span className={"file-badge file-" + kind}><FileText size={16} strokeWidth={1.7} /><span>{ext === "docx" ? "DOC" : ext.toUpperCase()}</span></span>;
}

function StatusBadge({ children, tone = "neutral" }: { children: ReactNode; tone?: string }) {
  return <span className={"status-badge badge-" + tone}>{children}</span>;
}

function RiskTicker({ project, pending, requirements, onConflict, onRequirements }: { project: Project; pending: Conflict[]; requirements: Requirement[]; onConflict: () => void; onRequirements: () => void }) {
  const tickerItems = pending.length
    ? pending.slice(0, 8).map((item) => ({ id: item.id, label: item.title, meta: item.requirement_ids?.join(", ") || project.name, score: "!" }))
    : requirements.slice(0, 8).map((item) => ({ id: item.id, label: item.description, meta: item.priority + " · " + item.classification.replaceAll("_", " "), score: item.priority }))
      .concat(!requirements.length ? [{ id: "workspace-ready", label: "The source set is ready when you are.", meta: project.name, score: "→" }] : []);
  const activate = pending.length ? onConflict : onRequirements;
  return <div className="ticker" aria-label={pending.length ? "Open project conflicts" : "Project requirements"}><div className="ticker-viewport"><div className="ticker-track"><TickerSet items={tickerItems} onActivate={activate} /><TickerSet items={tickerItems} onActivate={activate} hidden /></div></div></div>;
}

function TickerSet({ items, onActivate, hidden = false }: { items: { id: string; label: string; meta: string; score: string }[]; onActivate: () => void; hidden?: boolean }) {
  return <div className="ticker-set" aria-hidden={hidden || undefined}>{items.map((item) => <button key={item.id} className="ticker-item" onClick={onActivate} tabIndex={hidden ? -1 : undefined}><span className={"ticker-score" + (item.score === "!" ? " ticker-score-alert" : "")}>{item.score}</span><span className="ticker-name">{item.label}</span><span className="ticker-meta">{item.meta}</span></button>)}</div>;
}

function HeroField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d", { alpha: true });
    if (!canvas || !context) return;
    const points = Array.from({ length: 56 }, () => ({ x: Math.random(), y: Math.random(), depth: Math.random(), phase: Math.random() * Math.PI * 2 }));
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let width = 0;
    let height = 0;
    let dpr = 1;
    let raf = 0;
    let lastPaint = 0;
    let visible = true;
    let tabVisible = !document.hidden;
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw(performance.now());
    };
    const draw = (now: number) => {
      context.clearRect(0, 0, width, height);
      points.forEach((point) => {
        const x = point.x * width + Math.sin(now / 9000 + point.phase) * 8;
        const y = point.y * height + Math.cos(now / 10500 + point.phase) * 4;
        const edgeX = (x / width - 0.5) / 0.58;
        const edgeY = (y / height - 0.48) / 0.68;
        const edge = 1 - Math.min(1, edgeX * edgeX + edgeY * edgeY);
        if (edge <= 0) return;
        context.globalAlpha = (0.055 + point.depth * 0.14) * edge;
        const size = 1.2 + point.depth * 2;
        context.fillStyle = "#151517";
        context.fillRect(x, y, size, size);
      });
      context.globalAlpha = 1;
    };
    const tick = (now: number) => {
      raf = 0;
      if (!visible || !tabVisible || reduced) return;
      if (now - lastPaint >= 1000 / 30) {
        lastPaint = now;
        points.forEach((point) => { point.x = (point.x + 0.00008 * (0.3 + point.depth) + 1) % 1; });
        draw(now);
      }
      raf = window.requestAnimationFrame(tick);
    };
    const start = () => { if (!raf && !reduced && visible && tabVisible) raf = window.requestAnimationFrame(tick); };
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; if (visible) start(); else { window.cancelAnimationFrame(raf); raf = 0; } });
    observer.observe(canvas);
    const onVisibility = () => { tabVisible = !document.hidden; if (tabVisible) start(); else { window.cancelAnimationFrame(raf); raf = 0; } };
    document.addEventListener("visibilitychange", onVisibility);
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);
    resize();
    canvas.classList.add("is-on");
    return () => { window.cancelAnimationFrame(raf); observer.disconnect(); resizeObserver.disconnect(); document.removeEventListener("visibilitychange", onVisibility); };
  }, []);
  return <canvas ref={canvasRef} className="hero-field" aria-hidden="true" />;
}

function Splash() {
  return <div className="splash" aria-hidden="true"><div className="splash-inner"><span className="splash-mark">F<i /></span><strong>fusion<span>.vertex</span></strong><small>Requirements intelligence</small><div className="splash-track"><i /></div><span className="splash-percent" /><span className="splash-caption">Grounding your workspace</span></div></div>;
}

function formatBytes(bytes: number) {
  return bytes < 1024 ? bytes + " B" : bytes < 1024 * 1024 ? (bytes / 1024).toFixed(0) + " KB" : (bytes / 1024 / 1024).toFixed(1) + " MB";
}

function choiceLabel(choice: string) {
  return choice === "ACCEPT_SOURCE_A" ? "Accepted source A" : choice === "ACCEPT_SOURCE_B" ? "Accepted source B" : "Kept unresolved";
}
