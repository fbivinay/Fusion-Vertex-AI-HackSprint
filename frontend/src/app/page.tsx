import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, FileText, Link2, TriangleAlert, FileBarChart, Play, Sparkles } from "lucide-react";
import { AccessButton, DemoButton } from "@/components/site-chrome";
import { WorkspacePreview } from "@/components/workspace-preview";

export const metadata: Metadata = {
  title: "Fusion Vertex AI — Requirements Intelligence",
  description: "Turn fragmented business information into trusted, evidence-linked requirements with Fusion Vertex AI.",
};

const capabilities = [
  { icon: FileText, title: "Multimodal understanding", className: "capability--blue" },
  { icon: Link2, title: "Evidence-linked requirements", className: "capability--green" },
  { icon: TriangleAlert, title: "Conflict detection & decisions", className: "capability--coral" },
  { icon: FileBarChart, title: "BRD generation", className: "capability--violet" },
];

export default function HomePage() {
  return (
    <>
      <section className="hero hero--home" aria-labelledby="home-title">
        <div className="hero__wash" aria-hidden="true" />
        <div className="hero__inner page-wrap">
          <div className="hero__copy">
            <p className="eyebrow"><Sparkles size={16} fill="currentColor" aria-hidden="true" /> AI-powered requirements intelligence</p>
            <h1 id="home-title">Turn fragmented business information into <span className="text-accent">trusted requirements.</span></h1>
            <p className="hero__description">Upload documents, screenshots, notes and data. Get evidence-grounded requirements, explore decisions, and generate a BRD with AI.</p>
            <div className="hero__actions">
              <AccessButton><span>Try Fusion</span><ArrowRight size={19} aria-hidden="true" /></AccessButton>
              <DemoButton><span className="button__play"><Play size={16} fill="currentColor" aria-hidden="true" /></span><span>Watch demo</span></DemoButton>
            </div>
            <ul className="capability-strip" aria-label="Fusion capabilities">
              {capabilities.map(({ icon: Icon, title, className }) => (
                <li className={`capability ${className}`} key={title}>
                  <span className="capability__icon"><Icon size={21} strokeWidth={2.2} aria-hidden="true" /></span>
                  <span>{title}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="hero__visual"><WorkspacePreview /></div>
        </div>
      </section>

      <section className="home-proof page-wrap" aria-labelledby="proof-title">
        <div className="home-proof__heading">
          <p className="eyebrow eyebrow--subtle">Context, connected</p>
          <h2 id="proof-title">A clear line from source to sign-off.</h2>
          <p>Keep the evidence close, make open questions visible, and leave business decisions with the people who own them.</p>
        </div>
        <div className="proof-points">
          <Link className="proof-point" href="/solutions#capabilities"><span className="proof-point__number">01</span><span><strong>Start with the material</strong><small>Bring fragmented project inputs into one review.</small></span><ArrowRight size={18} aria-hidden="true" /></Link>
          <Link className="proof-point" href="/solutions#how-it-works"><span className="proof-point__number">02</span><span><strong>See what the sources say</strong><small>Follow requirements back to the evidence.</small></span><ArrowRight size={18} aria-hidden="true" /></Link>
          <Link className="proof-point" href="/solutions#how-it-works"><span className="proof-point__number">03</span><span><strong>Move forward with clarity</strong><small>Surface conflicts and prepare a structured BRD.</small></span><ArrowRight size={18} aria-hidden="true" /></Link>
        </div>
      </section>
    </>
  );
}
