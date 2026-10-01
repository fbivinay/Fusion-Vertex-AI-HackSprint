import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, FileText, Link2, ListChecks, Sparkles, TriangleAlert, Upload, WandSparkles } from "lucide-react";
import { AccessButton } from "@/components/site-chrome";
import { WorkspacePreview } from "@/components/workspace-preview";

export const metadata: Metadata = {
  title: "Solutions — Fusion Vertex AI",
  description: "See how Fusion turns scattered project information into structured, decision-ready requirements.",
};

const solutions = [
  { icon: FileText, title: "Multimodal understanding", copy: "Upload PDFs, documents, screenshots, notes, spreadsheets and more. Fusion reads your inputs together.", tone: "solution-card--blue" },
  { icon: Link2, title: "Evidence-linked requirements", copy: "Extract and structure requirements with source evidence, so your team can see where each one came from.", tone: "solution-card--green" },
  { icon: TriangleAlert, title: "Conflict detection & decisions", copy: "Find contradictory information across sources and surface the questions that need human judgment.", tone: "solution-card--coral" },
  { icon: FileText, title: "Custom BRD generation", copy: "Prepare a structured business requirements document with prioritized requirements and source references.", tone: "solution-card--violet" },
];

const steps = [
  { icon: Upload, title: "Upload sources", copy: "Add your documents, images, notes and data.", tone: "step--blue" },
  { icon: Sparkles, title: "AI analysis", copy: "Fusion organizes context into requirements.", tone: "step--green" },
  { icon: TriangleAlert, title: "Review & decide", copy: "Check conflicts and resolve open questions.", tone: "step--coral" },
  { icon: ListChecks, title: "Explore & refine", copy: "Review requirements and make adjustments.", tone: "step--violet" },
  { icon: FileText, title: "Generate BRD", copy: "Prepare a source-linked brief for review.", tone: "step--blue" },
];

export default function SolutionsPage() {
  return (
    <>
      <section className="solution-hero" aria-labelledby="solutions-title">
        <div className="hero__wash" aria-hidden="true" />
        <div className="solution-hero__inner page-wrap">
          <div className="solution-hero__copy">
            <p className="eyebrow"><Sparkles size={16} fill="currentColor" aria-hidden="true" /> Our solution</p>
            <h1 id="solutions-title">From messy information to structured, <span className="text-accent">decision-ready requirements.</span></h1>
            <p>Fusion uses Google’s Gemini and advanced AI to understand your documents, screenshots, notes and data, detect conflicts, and generate a custom BRD with clear structure and source evidence.</p>
            <div className="solution-hero__links"><AccessButton className="button button--primary">Explore Fusion <ArrowRight size={18} aria-hidden="true" /></AccessButton><Link className="text-link" href="#how-it-works">See how it works <ArrowRight size={16} aria-hidden="true" /></Link></div>
          </div>
          <div className="solution-hero__visual"><WorkspacePreview compact /></div>
        </div>
      </section>

      <section className="solutions-section page-wrap" id="capabilities" aria-labelledby="capabilities-title">
        <div className="section-heading">
          <p className="eyebrow eyebrow--subtle">One connected workflow</p>
          <h2 id="capabilities-title">What Fusion solves</h2>
          <p>Turn scattered business information into clear, validated requirements and a comprehensive BRD.</p>
        </div>
        <div className="solution-grid">
          {solutions.map(({ icon: Icon, title, copy, tone }) => (
            <article className={`solution-card ${tone}`} key={title}>
              <span className="solution-card__icon"><Icon size={25} aria-hidden="true" /></span>
              <div><h3>{title}</h3><p>{copy}</p></div>
            </article>
          ))}
        </div>
      </section>

      <section className="workflow-section page-wrap" id="how-it-works" aria-labelledby="workflow-title">
        <div className="workflow-section__intro">
          <p className="eyebrow eyebrow--subtle">Five clear steps</p>
          <h2 id="workflow-title">How it works</h2>
          <p>A simple flow from your project information to a custom requirements brief.</p>
          <Link className="text-link" href="/pricing">Explore plans <ArrowRight size={16} aria-hidden="true" /></Link>
        </div>
        <ol className="workflow-steps">
          {steps.map(({ icon: Icon, title, copy, tone }, index) => (
            <li className={`workflow-step ${tone}`} key={title}>
              <span className="workflow-step__number">{index + 1}</span>
              <span className="workflow-step__icon"><Icon size={21} aria-hidden="true" /></span>
              <h3>{title}</h3><p>{copy}</p>
              {index < steps.length - 1 && <ArrowRight className="workflow-step__arrow" size={18} aria-hidden="true" />}
            </li>
          ))}
        </ol>
      </section>

      <section className="solution-close page-wrap" aria-label="Get started">
        <div><span className="solution-close__mark"><WandSparkles size={23} aria-hidden="true" /></span><div><h2>Make the next review clearer.</h2><p>Bring your project context into one traceable requirements flow.</p></div></div>
        <AccessButton>Try Fusion <ArrowRight size={18} aria-hidden="true" /></AccessButton>
      </section>
    </>
  );
}
