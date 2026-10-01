import { ArrowDownToLine, ArrowRight, FileSpreadsheet, FileText, Image as ImageIcon, Layers3, Sparkles, Upload } from "lucide-react";
import { BrandMark } from "@/components/brand";

export function WorkspacePreview({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`workspace-art${compact ? " workspace-art--compact" : ""}`} aria-hidden="true">
      <div className="source-file source-file--pdf"><span className="source-file__icon source-file__icon--red"><FileText size={21} aria-hidden="true" /></span><span>PDF</span></div>
      <div className="source-file source-file--doc"><span className="source-file__icon source-file__icon--blue"><FileText size={21} aria-hidden="true" /></span><span>DOCX</span></div>
      <div className="source-file source-file--csv"><span className="source-file__icon source-file__icon--green"><FileSpreadsheet size={21} aria-hidden="true" /></span><span>CSV</span></div>
      <div className="source-file source-file--image"><span className="source-file__icon source-file__icon--violet"><ImageIcon size={21} aria-hidden="true" /></span><span>IMAGE</span></div>

      <div className="source-lines" aria-hidden="true"><i /><i /><i /><i /></div>
      <div className="device">
        <div className="device__screen">
          <div className="preview-topbar">
            <BrandMark compact />
            <div className="preview-topbar__right"><span className="preview-credits"><Sparkles size={12} aria-hidden="true" /> 42 AI coins left</span><span className="preview-avatar">V</span></div>
          </div>
          <div className="preview-app">
            <aside className="preview-sidebar">
              <span className="preview-sidebar__label">FUSION WORKSPACE</span>
              <span className="preview-nav preview-nav--active"><Layers3 size={13} aria-hidden="true" /> Overview</span>
              <span className="preview-nav"><Upload size={13} aria-hidden="true" /> Upload sources</span>
              <span className="preview-nav"><FileText size={13} aria-hidden="true" /> Requirements</span>
              <span className="preview-nav"><Sparkles size={13} aria-hidden="true" /> Decisions</span>
            </aside>
            <div className="preview-workspace">
              <div className="preview-workspace__heading"><div><small>PROJECT WORKSPACE</small><strong>Requirements review</strong></div><span className="preview-status"><i /> Analysis ready</span></div>
              <div className="preview-dropzone"><span className="preview-dropzone__icon"><Upload size={19} aria-hidden="true" /></span><strong>Drop your sources here</strong><small>PDF, DOCX, TXT, CSV, images and more</small><div className="preview-file-pills"><span>Brief.pdf</span><span>Notes.docx</span></div></div>
              <div className="preview-prompt"><span>OPTIONAL PROJECT FOCUS</span><div>What should we look for?</div></div>
              <button className="preview-process" type="button" tabIndex={-1}><Sparkles size={13} aria-hidden="true" /> Process with AI</button>
              <div className="preview-evidence"><span className="preview-evidence__check">✓</span><span><b>Source-linked requirements</b><small>Each finding is grounded in evidence</small></span><span className="preview-evidence__count">06</span></div>
            </div>
          </div>
        </div>
        <div className="device__base"><div className="device__keyboard" /><div className="device__trackpad" /></div>
      </div>

      <div className="report-card">
        <div className="report-card__icon"><FileText size={25} aria-hidden="true" /></div>
        <span className="report-card__overline">READY TO REVIEW</span>
        <strong>Business Requirements Brief</strong>
        <div className="report-card__line report-card__line--long" /><div className="report-card__line" />
        <div className="report-card__chart"><i /><i /><i /><i /><i /><i /></div>
        <span className="report-card__footer"><ArrowDownToLine size={12} aria-hidden="true" /> Export-ready</span>
      </div>
      <span className="flow-arrow"><ArrowRight size={25} aria-hidden="true" /></span>
      <span className="workspace-art__spark workspace-art__spark--one"><Sparkles size={19} aria-hidden="true" /></span>
      <span className="workspace-art__spark workspace-art__spark--two"><Sparkles size={13} aria-hidden="true" /></span>
    </div>
  );
}
