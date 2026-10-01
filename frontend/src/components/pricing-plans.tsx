"use client";

import { useState } from "react";
import { Check, Crown, Sprout, Users } from "lucide-react";
import { AccessButton } from "@/components/site-chrome";

type Plan = {
  name: string;
  description: string;
  monthly: string;
  yearly: string;
  icon: typeof Sprout;
  accent: "blue" | "violet" | "green";
  features: string[];
  cta: string;
  popular?: boolean;
};

const plans: Plan[] = [
  {
    name: "Free",
    description: "For students and individual explorers.",
    monthly: "₹0",
    yearly: "₹0",
    icon: Sprout,
    accent: "blue",
    cta: "Get started",
    features: ["50 AI coins per month", "Up to 3 projects", "Upload up to 10 files per project", "Max file size 10 MB per file", "Basic AI processing (Gemini)", "View and download BRD (basic format)", "Standard processing speed", "Community support"],
  },
  {
    name: "Pro",
    description: "For professionals and teams working on real projects.",
    monthly: "₹999",
    yearly: "₹799",
    icon: Crown,
    accent: "violet",
    cta: "Get Pro",
    popular: true,
    features: ["500 AI coins per month", "Up to 20 projects", "Upload up to 50 files per project", "Max file size 50 MB per file", "Advanced AI processing (Gemini + enhanced models)", "Custom prompts and instructions", "Export BRD (PDF, DOCX)", "Priority processing speed", "Email support"],
  },
  {
    name: "Team",
    description: "For organizations and larger teams.",
    monthly: "₹2,999",
    yearly: "₹2,399",
    icon: Users,
    accent: "green",
    cta: "Get Team",
    features: ["2,000 AI coins per month", "Unlimited projects", "Upload up to 200 files per project", "Max file size 100 MB per file", "Advanced AI processing (Gemini + enhanced models)", "Custom prompts and instructions", "Export BRD (PDF, DOCX)", "Priority processing speed", "Team collaboration (coming soon)", "Dedicated support"],
  },
];

export function PricingPlans() {
  const [yearly, setYearly] = useState(false);

  return (
    <>
      <div className="billing-toggle" aria-label="Billing frequency">
        <button type="button" className={!yearly ? "is-selected" : ""} aria-pressed={!yearly} onClick={() => setYearly(false)}>Monthly</button>
        <button type="button" className={yearly ? "is-selected" : ""} aria-pressed={yearly} onClick={() => setYearly(true)}>Yearly</button>
        <span className="billing-toggle__save">Save up to 20%</span>
      </div>
      <div className="plan-grid">
        {plans.map((plan) => {
          const Icon = plan.icon;
          return (
            <article className={`plan-card plan-card--${plan.accent}${plan.popular ? " plan-card--popular" : ""}`} key={plan.name}>
              {plan.popular && <span className="plan-card__popular"><Crown size={14} aria-hidden="true" /> Most popular</span>}
              <div className="plan-card__intro">
                <span className="plan-card__icon"><Icon size={27} aria-hidden="true" /></span>
                <div><h2>{plan.name}</h2><p>{plan.description}</p></div>
              </div>
              <p className="plan-card__price"><strong>{yearly ? plan.yearly : plan.monthly}</strong><span>/ month</span></p>
              {yearly && plan.name !== "Free" && <p className="plan-card__billing">Billed annually</p>}
              {!yearly && <p className="plan-card__billing plan-card__billing--spacer" aria-hidden="true">&nbsp;</p>}
              <AccessButton className={`button plan-card__cta${plan.popular ? " plan-card__cta--filled" : " plan-card__cta--outline"}`}>{plan.cta}</AccessButton>
              <ul className="plan-card__features">
                {plan.features.map((feature) => <li key={feature}><Check size={17} strokeWidth={2.4} aria-hidden="true" /><span>{feature}</span></li>)}
              </ul>
            </article>
          );
        })}
      </div>
    </>
  );
}
