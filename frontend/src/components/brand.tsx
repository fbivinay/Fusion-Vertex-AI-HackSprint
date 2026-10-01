import Link from "next/link";

export function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <Link className={`brand${compact ? " brand--compact" : ""}`} href="/" aria-label="Fusion Vertex AI home">
      <svg className="brand__symbol" viewBox="0 0 52 52" aria-hidden="true">
        <path d="M26 2.8 47 14.5v23L26 49.2 5 37.5v-23L26 2.8Z" fill="#f4f2ff" stroke="#e4e0ff" strokeWidth="1.2" />
        <path d="M26 3 26 26 5.2 14.7 26 3Z" fill="#5847ff" />
        <path d="M26 3 46.8 14.7 26 26V3Z" fill="#887aff" />
        <path d="M5.2 14.7 26 26 5.2 37.3v-22.6Z" fill="#7767ff" />
        <path d="M46.8 14.7v22.6L26 26l20.8-11.3Z" fill="#5443f3" />
        <path d="M5.2 37.3 26 26v23L5.2 37.3Z" fill="#4433dc" />
        <path d="M46.8 37.3 26 49V26l20.8 11.3Z" fill="#6554ff" />
        <path d="M26 3v46M5.2 14.7 26 26l20.8-11.3M5.2 37.3 26 26l20.8 11.3" fill="none" stroke="white" strokeWidth="1.3" strokeLinejoin="round" />
      </svg>
      <span className="brand__wordmark"><strong>FUSION</strong><span>Vertex AI</span></span>
    </Link>
  );
}
