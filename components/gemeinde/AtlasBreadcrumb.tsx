import styles from "./AtlasBreadcrumb.module.css";

/** Shared breadcrumb from the approved municipality hero. */
export default function AtlasBreadcrumb({ parents, name }: { parents: { name: string; href: string }[]; name: string }) {
  return <nav aria-label="Brotkrümel" className={`atlas-breadcrumb ${styles.breadcrumb}`}>
    {parents.map(parent => <span key={parent.href} style={{display:"contents"}}>
      <a href={parent.href}>{parent.name}</a>
      <svg className="sc-live-icon" aria-hidden="true" focusable="false" height="16" viewBox="0 0 28 14" fill="none">
        <path d="M1 7h25m0 0-5-5m5 5-5 5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>)}
    <span aria-current="page">{name}</span>
  </nav>;
}
