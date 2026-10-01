"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, Check, Menu, Play, Sparkles, X } from "lucide-react";
import { BrandMark } from "@/components/brand";

type SiteAction = "access" | "demo" | null;
type SiteActionContextValue = { openAction: (action: Exclude<SiteAction, null>) => void };

const SiteActionContext = createContext<SiteActionContextValue | null>(null);

export function useSiteAction() {
  const value = useContext(SiteActionContext);
  if (!value) throw new Error("Site actions must be used inside SiteChrome.");
  return value.openAction;
}

export function AccessButton({ children, className = "button button--primary" }: { children: ReactNode; className?: string }) {
  const openAction = useSiteAction();
  return <button className={className} type="button" onClick={() => openAction("access")}>{children}</button>;
}

export function DemoButton({ children, className = "button button--secondary" }: { children: ReactNode; className?: string }) {
  const openAction = useSiteAction();
  return <button className={className} type="button" onClick={() => openAction("demo")}>{children}</button>;
}

function SiteHeader({ onAccess }: { onAccess: () => void }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const nav = [
    { href: "/", label: "Overview" },
    { href: "/solutions", label: "Solutions" },
    { href: "/pricing", label: "Pricing" },
  ];

  const closeMenu = () => setMenuOpen(false);

  return (
    <header className="site-header">
      <div className="site-header__inner page-wrap">
        <BrandMark />
        <nav id="site-menu" className={`site-nav${menuOpen ? " site-nav--open" : ""}`} aria-label="Main navigation">
          {nav.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                className={`site-nav__link${active ? " is-active" : ""}`}
                href={item.href}
                aria-current={active ? "page" : undefined}
                key={item.href}
                onClick={closeMenu}
              >
                {item.label}
              </Link>
            );
          })}
          <div className="site-nav__mobile-actions">
            <button className="button button--secondary" type="button" onClick={() => { closeMenu(); onAccess(); }}>Log in</button>
            <button className="button button--primary" type="button" onClick={() => { closeMenu(); onAccess(); }}>Sign up</button>
          </div>
        </nav>
        <div className="site-header__actions">
          <button className="button button--secondary button--login" type="button" onClick={onAccess}>Log in</button>
          <button className="button button--primary button--signup" type="button" onClick={onAccess}>Sign up</button>
        </div>
        <button
          className="site-header__menu"
          type="button"
          aria-label={menuOpen ? "Close navigation" : "Open navigation"}
          aria-expanded={menuOpen}
          aria-controls="site-menu"
          onClick={() => setMenuOpen((open) => !open)}
        >
          {menuOpen ? <X size={22} aria-hidden="true" /> : <Menu size={22} aria-hidden="true" />}
        </button>
      </div>
    </header>
  );
}

function SiteFooter({ onAccess }: { onAccess: () => void }) {
  return (
    <footer className="site-footer">
      <div className="page-wrap site-footer__inner">
        <div className="site-footer__brand">
          <BrandMark compact />
          <p>Turn scattered context into requirements people can trust.</p>
        </div>
        <nav className="site-footer__links" aria-label="Footer navigation">
          <Link href="/">Overview</Link>
          <Link href="/solutions">Solutions</Link>
          <Link href="/pricing">Pricing</Link>
          <button type="button" onClick={onAccess}>Workspace access</button>
        </nav>
        <p className="site-footer__copyright">© {new Date().getFullYear()} Fusion Vertex AI</p>
      </div>
    </footer>
  );
}

function SplashLoader() {
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const duration = 3200;
    const started = performance.now();
    let frame = 0;
    let finishTimer = 0;

    const update = (now: number) => {
      const next = Math.min(100, Math.floor(((now - started) / duration) * 100));
      setProgress(next);
      if (next < 100) {
        frame = window.requestAnimationFrame(update);
      } else {
        finishTimer = window.setTimeout(() => setVisible(false), 260);
      }
    };

    frame = window.requestAnimationFrame(update);
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(finishTimer);
    };
  }, []);

  if (!visible) return null;

  return (
    <div className={`splash-loader${progress === 100 ? " splash-loader--complete" : ""}`} role="status" aria-live="off" aria-label="Preparing Fusion Vertex AI">
      <div className="splash-loader__content">
        <BrandMark />
        <p className="splash-loader__label"><span>Preparing your workspace</span><span aria-hidden="true">{progress}%</span></p>
        <div className="splash-loader__track" role="progressbar" aria-label="Loading progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}>
        <span className="splash-loader__bar" style={{ transform: `scaleX(${progress / 100})` }} />
        </div>
        <span className="splash-loader__footnote">Sources in. Decisions out.</span>
      </div>
    </div>
  );
}

function ActionDialog({ action, onClose }: { action: SiteAction; onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (action && !dialog.open) {
      dialog.showModal();
      closeRef.current?.focus();
    } else if (!action && dialog.open) {
      dialog.close();
    }
  }, [action]);

  const isDemo = action === "demo";

  return (
    <dialog className="action-dialog" ref={dialogRef} onClose={onClose}>
      <div className="action-dialog__topline">
        <span className="action-dialog__icon">{isDemo ? <Play size={20} fill="currentColor" aria-hidden="true" /> : <Sparkles size={21} aria-hidden="true" />}</span>
        <button ref={closeRef} className="action-dialog__close" type="button" aria-label="Close dialog" onClick={onClose}><X size={19} aria-hidden="true" /></button>
      </div>
      <p className="eyebrow">{isDemo ? "A product walkthrough" : "Fusion workspace"}</p>
      <h2>{isDemo ? "From source to sign-off." : "Workspace access is coming next."}</h2>
      {isDemo ? (
        <>
          <p className="action-dialog__copy">Fusion brings project context into one reviewable path.</p>
          <ol className="action-dialog__steps">
            <li><span>1</span><span>Bring documents, notes, screenshots, and data together.</span></li>
            <li><span>2</span><span>Review extracted requirements beside their sources.</span></li>
            <li><span>3</span><span>Resolve conflicts and prepare a structured BRD.</span></li>
          </ol>
        </>
      ) : (
        <p className="action-dialog__copy">This new Fusion site is ready to explore. Workspace sign-in will be reconnected in a later phase.</p>
      )}
      <button className="button button--primary action-dialog__done" type="button" onClick={onClose}>Continue exploring <ArrowRight size={17} aria-hidden="true" /></button>
      <p className="action-dialog__note"><Check size={15} aria-hidden="true" /> Your project information stays traceable to its sources.</p>
    </dialog>
  );
}

export function SiteChrome({ children }: { children: ReactNode }) {
  const [action, setAction] = useState<SiteAction>(null);

  return (
    <SiteActionContext.Provider value={{ openAction: setAction }}>
      <a className="skip-link" href="#main-content">Skip to content</a>
      <SplashLoader />
      <SiteHeader onAccess={() => setAction("access")} />
      <main id="main-content">{children}</main>
      <SiteFooter onAccess={() => setAction("access")} />
      <ActionDialog action={action} onClose={() => setAction(null)} />
    </SiteActionContext.Provider>
  );
}
