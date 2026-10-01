import type { Metadata } from "next";
import { Check, FileText, Link2, ShieldCheck, Sparkles, TriangleAlert } from "lucide-react";
import { PricingPlans } from "@/components/pricing-plans";

export const metadata: Metadata = {
  title: "Pricing — Fusion Vertex AI",
  description: "Choose a Fusion Vertex AI plan for evidence-linked requirements and structured BRDs.",
};

const included = [
  { icon: FileText, title: "Multiple file types", copy: "PDF, DOCX, TXT, CSV, images and more.", tone: "included-item--blue" },
  { icon: ShieldCheck, title: "Secure and private", copy: "Your data is encrypted and never shared.", tone: "included-item--green" },
  { icon: Link2, title: "Source-linked requirements", copy: "Every requirement points to its source.", tone: "included-item--teal" },
  { icon: TriangleAlert, title: "Conflict detection", copy: "Identify contradictions and open questions.", tone: "included-item--coral" },
  { icon: Sparkles, title: "Custom BRD generation", copy: "Structured, export-ready requirements briefs.", tone: "included-item--violet" },
];

export default function PricingPage() {
  return (
    <>
      <section className="pricing-page" aria-labelledby="pricing-title">
        <div className="pricing-page__wash" aria-hidden="true" />
        <div className="page-wrap pricing-page__inner">
          <div className="pricing-heading">
            <p className="eyebrow"><Sparkles size={15} fill="currentColor" aria-hidden="true" /> Simple and transparent pricing</p>
            <h1 id="pricing-title">Choose a plan that <span className="text-accent">fits your needs.</span></h1>
            <p>Start free and explore Fusion. Upgrade anytime for more power, higher limits, and advanced features.</p>
            <PricingPlans />
          </div>
        </div>
      </section>
      <section className="included page-wrap" aria-labelledby="included-title">
        <div className="included__intro"><h2 id="included-title">All plans include</h2><p>Everything you need to turn business information into clear, validated requirements.</p></div>
        <ul className="included__list">
          {included.map(({ icon: Icon, title, copy, tone }) => (
            <li className={`included-item ${tone}`} key={title}><span className="included-item__icon"><Icon size={21} aria-hidden="true" /></span><span><strong>{title}</strong><small>{copy}</small></span></li>
          ))}
        </ul>
      </section>
      <p className="pricing-note page-wrap"><Check size={15} aria-hidden="true" /> Plan selection is a front-end preview; account setup is coming in a later phase.</p>
    </>
  );
}
