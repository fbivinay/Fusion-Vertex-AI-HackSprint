"use client";

import { ChangeEvent, FormEvent, useCallback, useEffect, useRef, useState } from "react";

const API = (process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8080").replace(/\/$/, "");

type Project = { project_id: string; name: string; description?: string; analysis_status?: string; brd_status?: string; analysis_summary?: string; source_count?: number; sources?: Source[]; [key: string]: unknown };
type Source = { source_id: string; filename: string; mime_type: string; byte_size: number; uploaded_at: string; analyzed?: boolean };
type Evidence = { evidence_id: string; requirement_id: string; source_id: string; location: string; supporting_text: string; explanation: string };
type Requirement = { id: string; description: string; type: string; priority: string; confidence: number; classification: string; rationale?: string; evidence: { source_id: string; location: string; supporting_text: string; explanation: string }[]; acceptance_criteria?: string[]; related_conflict_ids?: string[] };
type Conflict = { id: string; title: string; severity: string; source_a_id: string; source_a_statement: string; source_b_id: string; source_b_statement: string; impact: string; why_it_matters: string; requirement_ids?: string[]; status: string; resolution?: string; selected_source_id?: string; resolution_rationale?: string };
type Decision = { decision_id: string; conflict_id: string; choice: string; selected_source_id?: string; rationale: string; status: string; decided_at: string };
type Ask = { answer: string; citations: { requirement_id?: string; evidence_id?: string; source_id?: string; explanation?: string }[] };

type View = "Overview" | "Requirements" | "Evidence" | "Conflicts" | "Decisions" | "Ask Fusion" | "BRD";
const navItems: { name: View; icon: string }[] = [
  { name: "Overview", icon: "◫" }, { name: "Requirements", icon: "☷" }, { name: "Evidence", icon: "⌕" },
  { name: "Conflicts", icon: "◈" }, { name: "Decisions", icon: "◎" }, { name: "Ask Fusion", icon: "✳" }, { name: "BRD", icon: "▤" },
];

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API}${path}`, init);
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.detail || `Request failed (${response.status})`);
  }
  return response.json() as Promise<T>;
}

function Badge({ children, tone = "neutral" }: { children: React.ReactNode; tone?: string }) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}

function Icon({ children }: { children: React.ReactNode }) { return <span className="icon" aria-hidden="true">{children}</span>; }

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
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [projectDialog, setProjectDialog] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<Ask | null>(null);
  const [brd, setBrd] = useState("");
  const [dropActive, setDropActive] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

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
        api<Project>(`/api/projects/${id}`),
        api<Requirement[]>(`/api/projects/${id}/requirements`),
        api<Evidence[]>(`/api/projects/${id}/evidence`),
        api<Conflict[]>(`/api/projects/${id}/conflicts`),
        api<{ decisions: Decision[]; pending: Conflict[] }>(`/api/projects/${id}/decisions`),
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
    const timer = window.setTimeout(() => {
      reloadProjects().then((list) => {
        if (list[0]) setProjectId(list[0].project_id);
      }).catch((err) => setError(err instanceof Error ? err.message : "The Fusion API is not reachable."));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [reloadProjects]);

  useEffect(() => {
    if (!projectId) return;
    const timer = window.setTimeout(() => { void refreshProject(projectId); }, 0);
    return () => window.clearTimeout(timer);
  }, [projectId, refreshProject]);

  const highConfidence = requirements.filter((item) => item.confidence >= 0.8).length;
  const openQuestions = Array.isArray(project?.open_questions) ? project.open_questions.length : 0;
  const sourceCount = project?.sources?.length || 0;
  const selectedConflictCount = conflicts.filter((item) => item.status === "NEEDS_HUMAN_DECISION").length;
  const firstConflict = conflicts[0];
  const steps = [
    ["Files uploaded", sourceCount > 0], ["Multimodal analysis", project?.analysis_status === "complete"],
    ["Requirements extracted", requirements.length > 0], ["Sources cross-checked", project?.analysis_status === "complete"],
    ["Conflicts reviewed", project?.analysis_status === "complete"], ["Evidence mapped", evidence.length > 0], ["BRD generated", project?.brd_status === "generated"],
  ] as [string, boolean][];

  async function runAnalysis(id = projectId) {
    setBusy("Analyzing all sources with Gemini…"); setError(""); setNotice("");
    try {
      await api(`/api/projects/${id}/analyze`, { method: "POST" });
      await Promise.all([refreshProject(id), reloadProjects()]);
      setNotice("Cross-source analysis complete. Evidence and conflicts are ready for review.");
    } catch (err) { setError(err instanceof Error ? err.message : "Analysis failed"); }
    finally { setBusy(""); }
  }

  async function launchDemo() {
    setBusy("Creating the five-source checkout demo…"); setError(""); setNotice("");
    try {
      const result = await api<{ project: Project; sources: Source[] }>("/api/demo", { method: "POST" });
      setProjectId(result.project.project_id); setView("Overview");
      await reloadProjects();
      setBusy("Running Gemini across the transcript, PDFs, screenshot, and analytics…");
      await api(`/api/projects/${result.project.project_id}/analyze`, { method: "POST" });
      await refreshProject(result.project.project_id); await reloadProjects();
      setNotice("Demo analysis complete. Open Conflicts to review the payment-retention decision.");
    } catch (err) { setError(err instanceof Error ? err.message : "Could not launch demo"); }
    finally { setBusy(""); }
  }

  async function createProject(event: FormEvent) {
    event.preventDefault(); setBusy("Creating project…"); setError("");
    try {
      const created = await api<Project>("/api/projects", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: projectName, description: projectDescription }) });
      await reloadProjects(); setProjectId(created.project_id); setProjectDialog(false); setProjectName(""); setProjectDescription(""); setView("Overview");
    } catch (err) { setError(err instanceof Error ? err.message : "Project creation failed"); }
    finally { setBusy(""); }
  }

  async function uploadFiles(fileList: FileList | File[]) {
    if (!projectId || !fileList.length) return;
    const form = new FormData(); Array.from(fileList).forEach((file) => form.append("files", file));
    setBusy(`Uploading ${fileList.length} source${fileList.length > 1 ? "s" : ""}…`); setError(""); setNotice("");
    try {
      await api(`/api/projects/${projectId}/upload`, { method: "POST", body: form });
      await refreshProject(projectId); await reloadProjects();
      setNotice("Sources stored securely. Run analysis when your source set is ready.");
    } catch (err) { setError(err instanceof Error ? err.message : "Upload failed"); }
    finally { setBusy(""); if (fileInput.current) fileInput.current.value = ""; }
  }

  async function submitAsk(event: FormEvent) {
    event.preventDefault(); if (!projectId || !question.trim()) return;
    setBusy("Searching project evidence…"); setError(""); setAnswer(null);
    try {
      const result = await api<Ask>(`/api/projects/${projectId}/ask`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ question }) });
      setAnswer(result); setQuestion("");
    } catch (err) { setError(err instanceof Error ? err.message : "Ask Fusion failed"); }
    finally { setBusy(""); }
  }

  async function decide(conflict: Conflict, choice: "ACCEPT_SOURCE_A" | "ACCEPT_SOURCE_B" | "KEEP_UNRESOLVED") {
    const label = choice === "ACCEPT_SOURCE_A" ? "Source A" : choice === "ACCEPT_SOURCE_B" ? "Source B" : "Keep unresolved";
    const rationale = window.prompt(`Record why the team chose “${label}” for ${conflict.id}:`);
    if (!rationale?.trim()) return;
    setBusy("Recording human decision…"); setError("");
    try {
      await api(`/api/projects/${projectId}/conflicts/${conflict.id}/decision`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ choice, rationale }) });
      await refreshProject(projectId); setNotice("Decision recorded in the project decision log.");
    } catch (err) { setError(err instanceof Error ? err.message : "Decision could not be saved"); }
    finally { setBusy(""); }
  }

  async function createBrd() {
    setBusy("Preparing a traceable BRD…"); setError("");
    try {
      const result = await api<{ markdown: string }>(`/api/projects/${projectId}/generate-brd`, { method: "POST" });
      setBrd(result.markdown); await refreshProject(projectId); setView("BRD"); setNotice("BRD generated with requirement traceability and unresolved decisions.");
    } catch (err) { setError(err instanceof Error ? err.message : "BRD generation failed"); }
    finally { setBusy(""); }
  }

  async function downloadBrd() {
    try {
      const result = brd ? { markdown: brd } : await api<{ markdown: string }>(`/api/projects/${projectId}/brd`);
      const objectUrl = URL.createObjectURL(new Blob([result.markdown], { type: "text/markdown" }));
      const anchor = document.createElement("a"); anchor.href = objectUrl; anchor.download = `${(project?.name || "fusion-brd").toLowerCase().replace(/[^a-z0-9]+/g, "-")}-brd.md`; anchor.click(); URL.revokeObjectURL(objectUrl);
    } catch (err) { setError(err instanceof Error ? err.message : "Could not download BRD"); }
  }

  async function openBrd() {
    setBusy("Loading BRD…"); setError("");
    try { const result = await api<{ markdown: string }>(`/api/projects/${projectId}/brd`); setBrd(result.markdown); }
    catch (err) { setError(err instanceof Error ? err.message : "BRD is not available"); }
    finally { setBusy(""); }
  }

  const title = project?.name || "Project intelligence";

  function handleDrop(event: React.DragEvent) {
    event.preventDefault(); setDropActive(false); void uploadFiles(event.dataTransfer.files);
  }

  function onFileChange(event: ChangeEvent<HTMLInputElement>) { if (event.target.files) void uploadFiles(event.target.files); }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#" onClick={(event) => event.preventDefault()}>
          <span className="brand-mark"><span>f</span><i /></span>
          <span className="brand-word">fusion<span>vertex</span></span>
        </a>
        <div className="workspace-label">WORKSPACE</div>
        <button className="workspace-switch" onClick={() => setProjectDialog(true)}>
          <span className="workspace-avatar">FV</span><span className="workspace-name">Fusion workspace<small>Enterprise plan</small></span><span className="chevron">⌄</span>
        </button>
        <div className="nav-label">PROJECT</div>
        <nav className="side-nav" aria-label="Project sections">
          {navItems.map((item) => <button key={item.name} className={`nav-item ${view === item.name ? "active" : ""}`} onClick={() => { setView(item.name); if (item.name === "BRD" && project?.brd_status === "generated" && !brd) void openBrd(); }}>
            <Icon>{item.icon}</Icon>{item.name}{item.name === "Conflicts" && selectedConflictCount > 0 && <span className="nav-count">{selectedConflictCount}</span>}
          </button>)}
        </nav>
        <div className="sidebar-bottom">
          <div className="side-status"><span className="status-dot" /> Google AI Studio · Gemini API<small>Project grounded · Evidence linked</small></div>
          <div className="profile-row"><div className="profile-avatar">RV</div><span>R. Vinay<small>Project owner</small></span><button aria-label="Profile options">···</button></div>
        </div>
      </aside>

      <section className="main-area">
        <header className="topbar">
          <div className="breadcrumbs"><span>Projects</span><span className="crumb-slash">/</span><strong>{title}</strong></div>
          <div className="top-actions">
            <span className="connection"><i /> API {project ? "connected" : "ready"}</span>
            <button className="icon-button" aria-label="Help">?</button>
            <div className="profile-avatar top-profile">RV</div>
          </div>
        </header>

        <div className="content-scroll" aria-busy={loading}>
          <div className="page-heading">
            <div><div className="eyebrow"><span className="eyebrow-line" /> REQUIREMENTS INTELLIGENCE</div><h1>{view === "Overview" ? "Project overview" : view}</h1><p>{project?.description || "Turn scattered business context into decisions your team can trust."}</p></div>
            <div className="heading-actions">
              <label className="project-picker"><span className="sr-only">Select project</span><select value={projectId} onChange={(e) => { setProjectId(e.target.value); setBrd(""); setAnswer(null); }}><option value="">Select a project</option>{projects.map((item) => <option key={item.project_id} value={item.project_id}>{item.name}</option>)}</select></label>
              <button className="button button-secondary" onClick={() => setProjectDialog(true)}>＋ New project</button>
            </div>
          </div>

          {error && <div className="alert alert-error"><span>!</span><div><strong>Action needed</strong><p>{error}</p></div><button onClick={() => setError("")}>×</button></div>}
          {notice && <div className="alert alert-success"><span>✓</span><p>{notice}</p><button onClick={() => setNotice("")}>×</button></div>}
          {busy && <div className="busy-strip"><span className="spinner" />{busy}<span className="busy-hint">This may take a moment</span></div>}

          {!project && <div className="welcome-panel">
            <div className="welcome-art"><div className="orb orb-one" /><div className="orb orb-two" /><div className="art-core">✳</div><div className="art-card art-card-a">▤ <span>Source evidence</span></div><div className="art-card art-card-b">◈ <span>Decision clarity</span></div></div>
            <div className="welcome-copy"><Badge tone="violet">MULTIMODAL REQUIREMENTS ENGINE</Badge><h2>Make the full picture<br />visible.</h2><p>Bring transcripts, policies, product docs, screenshots, and data into one traceable requirements workspace.</p><div className="welcome-actions"><button className="button button-primary" onClick={() => void launchDemo()}>Explore the checkout demo <span>→</span></button><button className="text-button" onClick={() => setProjectDialog(true)}>Create a project</button></div><div className="welcome-foot"><span>↗</span> Gemini analysis · Cross-source validation · Human decisions</div></div>
          </div>}

          {project && <>
            <section className="pipeline-card">
              <div className="pipeline-head"><div><span className="section-kicker">PROCESSING PIPELINE</span><strong>{project.analysis_status === "complete" ? "Source analysis complete" : sourceCount ? "Sources are ready to analyze" : "Add project sources to begin"}</strong></div><div className="pipeline-head-actions"><span className={`pipeline-state ${project.analysis_status === "complete" ? "state-done" : ""}`}><i />{project.analysis_status === "complete" ? "Up to date" : "Waiting for sources"}</span>{sourceCount > 0 && <button className="button button-primary button-small" onClick={() => void runAnalysis()} disabled={!!busy}>✳ Run analysis</button>}</div></div>
              <div className="pipeline-steps">{steps.map(([label, done], index) => <div key={label} className={`pipeline-step ${done ? "done" : ""}`}><span className="step-check">{done ? "✓" : String(index + 1).padStart(2, "0")}</span><span>{label}</span></div>)}</div>
            </section>

            {view === "Overview" && <>
              <div className="metric-grid">
                <Metric label="Requirements" value={requirements.length} sub="Across all source material" icon="☷" tone="blue" />
                <Metric label="High confidence" value={highConfidence} sub="≥ 80% evidence confidence" icon="◉" tone="green" />
                <Metric label="Conflicts" value={selectedConflictCount} sub="Awaiting human decision" icon="◈" tone="coral" />
                <Metric label="Open questions" value={openQuestions} sub="Missing context to clarify" icon="?" tone="amber" />
              </div>
              <div className="dashboard-grid">
                <section className="panel source-panel" onDragOver={(e) => { e.preventDefault(); setDropActive(true); }} onDragLeave={() => setDropActive(false)} onDrop={handleDrop}>
                  <div className="panel-heading"><div><span className="section-kicker">SOURCE LIBRARY</span><h2>Project evidence</h2><p>Fragmented inputs, analyzed together.</p></div><button className="button button-secondary button-small" onClick={() => fileInput.current?.click()}>＋ Add sources</button></div>
                  <input ref={fileInput} className="sr-only" type="file" multiple accept=".pdf,.docx,.txt,.png,.jpg,.jpeg,.csv" onChange={onFileChange} />
                  {sourceCount > 0 ? <div className="source-list">{project.sources?.map((source) => <div className="source-row" key={source.source_id}><FileBadge filename={source.filename} /><div className="source-name"><strong>{source.filename}</strong><small>{source.source_id} · {formatBytes(source.byte_size)}</small></div><Badge tone={source.analyzed ? "green" : "neutral"}>{source.analyzed ? "Analyzed" : "Ready"}</Badge></div>)}</div> : <div className={`dropzone ${dropActive ? "drag-active" : ""}`} onClick={() => fileInput.current?.click()}><div className="upload-icon">↑</div><strong>Drop files here, or <span>browse</span></strong><p>PDF, DOCX, TXT, PNG, JPG, CSV <i>·</i> 10 MB per file</p><button className="text-button" onClick={(e) => { e.stopPropagation(); void launchDemo(); }}>Or load the five-source checkout demo →</button></div>}
                  {sourceCount > 0 && <div className="source-footer"><span><i className="tiny-dot" /> Private project storage</span><button className="text-button" onClick={() => setView("Evidence")}>View evidence map <span>→</span></button></div>}
                </section>
                <section className="panel insight-panel"><div className="panel-heading"><div><span className="section-kicker">CROSS-SOURCE INSIGHT</span><h2>Decision spotlight</h2></div><span className="spark-icon">✳</span></div>
                  {firstConflict ? <div className="spotlight"><div className="spotlight-label"><Badge tone="coral">{firstConflict.severity} conflict</Badge><span>{firstConflict.id}</span></div><h3>{firstConflict.title}</h3><p>{firstConflict.why_it_matters}</p><div className="mini-evidence"><div><span>A</span><p>{firstConflict.source_a_statement}</p></div><div><span>B</span><p>{firstConflict.source_b_statement}</p></div></div><button className="button button-dark button-full" onClick={() => setView("Conflicts")}>Review decision <span>→</span></button></div> : <div className="empty-insight"><span>✳</span><strong>Analysis finds the connections</strong><p>Once sources are analyzed together, conflicts and decisions will surface here.</p></div>}
                </section>
              </div>
              <section className="panel requirements-panel"><div className="panel-heading"><div><span className="section-kicker">REQUIREMENTS REGISTER</span><h2>Priority requirements</h2></div><button className="text-button" onClick={() => setView("Requirements")}>View all <span>→</span></button></div><RequirementsTable requirements={requirements.slice(0, 5)} onEvidence={() => setView("Evidence")} /></section>
            </>}

            {view === "Requirements" && <section className="panel full-panel"><div className="panel-heading"><div><span className="section-kicker">VALIDATED WITH EVIDENCE</span><h2>Requirements register</h2><p>Each statement keeps its priority, confidence, conclusion, and supporting source links.</p></div><Badge>{requirements.length} requirements</Badge></div><RequirementsTable requirements={requirements} onEvidence={() => setView("Evidence")} /></section>}

            {view === "Evidence" && <section className="panel full-panel"><div className="panel-heading"><div><span className="section-kicker">TRACEABILITY MAP</span><h2>Requirement evidence</h2><p>Follow every claim back to a source and location.</p></div><Badge>{evidence.length} evidence links</Badge></div>
              {evidence.length ? <div className="evidence-list">{evidence.map((item) => { const req = requirements.find((r) => r.id === item.requirement_id); const source = project.sources?.find((s) => s.source_id === item.source_id); return <article className="evidence-card" key={item.evidence_id}><div className="evidence-link"><span className="evidence-id">{item.requirement_id}</span><span className="evidence-line" /><span className="file-mini">▤</span></div><div className="evidence-body"><div className="evidence-top"><strong>{req?.description || item.requirement_id}</strong><Badge tone="blue">{item.evidence_id}</Badge></div><div className="evidence-source"><span>↳</span><strong>{source?.filename || item.source_id}</strong><span>·</span>{item.location}</div>{item.supporting_text && <blockquote>“{item.supporting_text}”</blockquote>}<p>{item.explanation}</p></div></article>; })}</div> : <EmptyState icon="⌕" title="No evidence mapped yet" copy="Run cross-source analysis to extract claims and attach precise source references." />}
            </section>}

            {view === "Conflicts" && <section className="full-panel conflict-page"><div className="view-title-row"><div><span className="section-kicker">HUMAN-IN-THE-LOOP REVIEW</span><h2>Conflicts need a decision</h2><p>Fusion surfaces both sides with impact. Your team chooses what the product should do.</p></div><Badge tone={selectedConflictCount ? "coral" : "green"}>{selectedConflictCount} open</Badge></div>
              {conflicts.length ? conflicts.map((conflict) => <ConflictCard key={conflict.id} conflict={conflict} project={project} onDecision={decide} decisions={decisions} />) : <div className="panel"><EmptyState icon="◈" title="No conflicts found" copy="Cross-source contradictions will appear here with their evidence and business impact." /></div>}
            </section>}

            {view === "Decisions" && <section className="panel full-panel"><div className="panel-heading"><div><span className="section-kicker">HUMAN APPROVAL LOG</span><h2>Decisions & approvals</h2><p>Human choices are recorded with rationale and linked to the original conflict.</p></div><Badge tone={pending.length ? "amber" : "green"}>{pending.length} pending</Badge></div>
              {decisions.length || pending.length ? <div className="decision-list">{pending.map((item) => <div className="decision-row pending-row" key={`pending-${item.id}`}><div className="decision-icon pending-icon">◷</div><div className="decision-text"><strong>{item.id} · {item.title}</strong><p>Needs a human decision · {item.severity} impact</p></div><button className="button button-secondary button-small" onClick={() => setView("Conflicts")}>Review conflict →</button></div>)}{decisions.map((item) => <div className="decision-row" key={item.decision_id}><div className={`decision-icon ${item.status === "RECORDED" ? "resolved-icon" : "pending-icon"}`}>{item.status === "RECORDED" ? "✓" : "◷"}</div><div className="decision-text"><strong>{item.conflict_id} · {choiceLabel(item.choice)}</strong><p>{item.rationale}</p><small>{new Date(item.decided_at).toLocaleString()} · {item.selected_source_id || "Unresolved by choice"}</small></div><Badge tone={item.status === "RECORDED" ? "green" : item.status === "STALE" ? "neutral" : "amber"}>{item.status === "RECORDED" ? "Recorded" : item.status === "STALE" ? "Stale · review" : "Still open"}</Badge></div>)}</div> : <EmptyState icon="◎" title="No decisions recorded" copy="Conflicts that need business approval will be listed here." />}
            </section>}

            {view === "Ask Fusion" && <section className="ask-layout"><div className="ask-intro"><span className="ask-orb">✳</span><span className="section-kicker">PROJECT-GROUNDED ASSISTANT</span><h2>Ask Fusion</h2><p>Get clear answers grounded in this project’s requirements, evidence, conflicts, and decisions.</p><div className="suggestions"><span>Try asking</span>{["Why was the highest-priority requirement marked P0?", "Which sources support this project’s requirements?", "What decisions are still pending?", "What information is missing before sign-off?"].map((suggestion) => <button key={suggestion} onClick={() => setQuestion(suggestion)}>↗ {suggestion}</button>)}</div></div><div className="ask-workspace"><div className="ask-context"><span className="context-dot" /><strong>{project.name}</strong><span>·</span>{requirements.length} requirements<span>·</span>{evidence.length} evidence links</div><div className="conversation"><div className="assistant-greeting"><span className="assistant-mark">✳</span><div><strong>Fusion is grounded in this project</strong><p>Ask about requirements, source evidence, contradictions, or open decisions.</p></div></div>{answer && <div className="answer-card"><div className="answer-heading"><span className="assistant-mark">✳</span><strong>Fusion</strong><span>· Evidence-backed answer</span></div><p>{answer.answer}</p>{answer.citations?.length > 0 && <div className="citation-row">{answer.citations.map((citation, i) => <span className="citation-chip" key={i}>{citation.requirement_id && <b>{citation.requirement_id}</b>}{citation.source_id && <span>{citation.source_id}</span>}{citation.evidence_id && <span>{citation.evidence_id}</span>}</span>)}</div>}</div>}</div><form className="ask-form" onSubmit={submitAsk}><textarea aria-label="Ask Fusion" placeholder="Ask a question about this project…" value={question} onChange={(e) => setQuestion(e.target.value)} rows={2} /><div><span>Answers use only analyzed project context</span><button className="button button-primary" disabled={!question.trim() || !!busy}>Ask Fusion <span>↗</span></button></div></form></div></section>}

            {view === "BRD" && <section className="panel full-panel brd-panel"><div className="panel-heading brd-heading"><div><span className="section-kicker">TRACEABLE PROJECT DOCUMENT</span><h2>Business requirements document</h2><p>Structured analysis rendered with conflicts, assumptions, and source traceability.</p></div><div className="brd-actions">{project.brd_status === "generated" && <button className="button button-secondary" onClick={() => void downloadBrd()}>↓ Download .md</button>}<button className="button button-primary" onClick={() => void createBrd()} disabled={!requirements.length || !!busy}>{project.brd_status === "generated" ? "↻ Regenerate BRD" : "✳ Generate BRD"}</button></div></div>{brd ? <pre className="brd-document">{brd}</pre> : <EmptyState icon="▤" title={requirements.length ? "Your BRD is ready to generate" : "Analyze sources first"} copy={requirements.length ? "Fusion will use the extracted requirements and evidence to render a professional, traceable BRD." : "Run source analysis to build structured requirements before rendering the document."} action={requirements.length ? <button className="button button-primary" onClick={() => void createBrd()}>Generate BRD <span>→</span></button> : undefined} />}</section>}
          </>}
        </div>
      </section>

      {projectDialog && <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) setProjectDialog(false); }}><form className="project-modal" onSubmit={createProject}><button className="modal-close" type="button" onClick={() => setProjectDialog(false)}>×</button><span className="section-kicker">NEW WORKSPACE PROJECT</span><h2>Start with your business context.</h2><p>Create a project, then add the documents, conversations, images, and data your team needs to reconcile.</p><label>Project name<input required minLength={2} maxLength={120} autoFocus placeholder="e.g. Checkout modernization" value={projectName} onChange={(e) => setProjectName(e.target.value)} /></label><label>Project description <span className="optional">Optional</span><textarea rows={3} maxLength={2000} placeholder="What business outcome is this project trying to achieve?" value={projectDescription} onChange={(e) => setProjectDescription(e.target.value)} /></label><div className="modal-actions"><button type="button" className="button button-secondary" onClick={() => setProjectDialog(false)}>Cancel</button><button type="submit" className="button button-primary" disabled={!!busy}>Create project <span>→</span></button></div></form></div>}
    </main>
  );
}

function Metric({ label, value, sub, icon, tone }: { label: string; value: number; sub: string; icon: string; tone: string }) {
  return <article className="metric-card"><div className={`metric-icon ${tone}`}>{icon}</div><div className="metric-value">{value}</div><div className="metric-label">{label}</div><div className="metric-sub">{sub}</div><span className={`metric-accent ${tone}`} /></article>;
}

function FileBadge({ filename }: { filename: string }) {
  const ext = filename.split(".").pop()?.toLowerCase() || "file";
  const tones: Record<string, string> = { pdf: "pdf", docx: "doc", txt: "txt", csv: "csv", png: "img", jpg: "img", jpeg: "img" };
  return <div className={`file-badge ${tones[ext] || "txt"}`}>{ext === "pdf" ? "PDF" : ext === "docx" ? "DOC" : ext.toUpperCase()}</div>;
}

function RequirementsTable({ requirements, onEvidence }: { requirements: Requirement[]; onEvidence: () => void }) {
  if (!requirements.length) return <EmptyState icon="☷" title="No requirements extracted yet" copy="Upload a source set and run Gemini analysis to create evidence-linked requirements." />;
  return <div className="table-wrap"><table className="requirements-table"><thead><tr><th>REQUIREMENT</th><th>TYPE</th><th>PRIORITY</th><th>CONFIDENCE</th><th>CONCLUSION</th><th>TRACE</th></tr></thead><tbody>{requirements.map((req) => <tr key={req.id}><td><div className="requirement-cell"><span className="req-id">{req.id}</span><strong>{req.description}</strong>{req.rationale && <small>{req.rationale}</small>}</div></td><td><span className="type-label">{req.type.replace("-", " ")}</span></td><td><Badge tone={req.priority === "P0" ? "coral" : req.priority === "P1" ? "amber" : "neutral"}>{req.priority}</Badge></td><td><div className="confidence"><div className="confidence-track"><i style={{ width: `${Math.max(0, Math.min(100, req.confidence * 100))}%` }} /></div><span>{Math.round(req.confidence * 100)}%</span></div></td><td><Badge tone={req.classification === "SUPPORTED" ? "green" : req.classification === "NEEDS_HUMAN_DECISION" || req.classification === "CONFLICTED" ? "coral" : "violet"}>{req.classification.replaceAll("_", " ")}</Badge></td><td><button className="trace-link" onClick={onEvidence}>{req.evidence.length} source{req.evidence.length !== 1 ? "s" : ""} <span>↗</span></button></td></tr>)}</tbody></table></div>;
}

function ConflictCard({ conflict, project, decisions, onDecision }: { conflict: Conflict; project: Project; decisions: Decision[]; onDecision: (c: Conflict, choice: "ACCEPT_SOURCE_A" | "ACCEPT_SOURCE_B" | "KEEP_UNRESOLVED") => void }) {
  const sourceA = project.sources?.find((source) => source.source_id === conflict.source_a_id);
  const sourceB = project.sources?.find((source) => source.source_id === conflict.source_b_id);
  const hasFinalDecision = decisions.some((item) => item.conflict_id === conflict.id && item.status === "RECORDED");
  return <article className={`conflict-card ${conflict.status === "RESOLVED" ? "resolved-conflict" : ""}`}><div className="conflict-top"><div className="conflict-id"><span>◈</span>{conflict.id}<span className="dot-divider">·</span>{conflict.requirement_ids?.join(", ") || "Cross-source conflict"}</div><div className="conflict-badges"><Badge tone={conflict.severity === "Critical" ? "coral" : "amber"}>{conflict.severity}</Badge><Badge tone={conflict.status === "RESOLVED" ? "green" : "coral"}>{conflict.status === "RESOLVED" ? "Human decision recorded" : "Needs human decision"}</Badge></div></div><h3>{conflict.title}</h3><div className="conflict-evidence-grid"><div className="conflict-side side-a"><div className="side-source"><span className="source-letter">A</span><div><small>SOURCE A</small><strong>{sourceA?.filename || conflict.source_a_id}</strong><span>{conflict.source_a_id}</span></div></div><blockquote>“{conflict.source_a_statement}”</blockquote></div><div className="conflict-center">≠</div><div className="conflict-side side-b"><div className="side-source"><span className="source-letter">B</span><div><small>SOURCE B</small><strong>{sourceB?.filename || conflict.source_b_id}</strong><span>{conflict.source_b_id}</span></div></div><blockquote>“{conflict.source_b_statement}”</blockquote></div></div><div className="conflict-impact"><div><span>BUSINESS & TECHNICAL IMPACT</span><p>{conflict.impact}</p></div><div><span>WHY THIS NEEDS YOUR CALL</span><p>{conflict.why_it_matters}</p></div></div>{conflict.status === "RESOLVED" && <div className="resolution-note">✓ Team accepted {conflict.selected_source_id} · {conflict.resolution_rationale}</div>}{!hasFinalDecision && conflict.status !== "RESOLVED" && <div className="conflict-actions"><span>Fusion will not decide for your team.</span><div><button className="button button-accept" onClick={() => onDecision(conflict, "ACCEPT_SOURCE_A")}>Accept source A</button><button className="button button-accept" onClick={() => onDecision(conflict, "ACCEPT_SOURCE_B")}>Accept source B</button><button className="text-button" onClick={() => onDecision(conflict, "KEEP_UNRESOLVED")}>Keep unresolved</button></div></div>}</article>;
}

function EmptyState({ icon, title, copy, action }: { icon: string; title: string; copy: string; action?: React.ReactNode }) {
  return <div className="empty-state"><div className="empty-icon">{icon}</div><strong>{title}</strong><p>{copy}</p>{action}</div>;
}

function formatBytes(bytes: number) { return bytes < 1024 ? `${bytes} B` : bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(0)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`; }
function choiceLabel(choice: string) { return choice === "ACCEPT_SOURCE_A" ? "Accepted source A" : choice === "ACCEPT_SOURCE_B" ? "Accepted source B" : "Kept unresolved"; }
