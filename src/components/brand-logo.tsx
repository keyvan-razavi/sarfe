import styles from "./brand-logo.module.css";

export function BrandLogo({ className = "", priority = false }: { className?: string; priority?: boolean }) {
  void priority;
  return <span className={`${styles.frame} ${className}`.trim()} role="img" aria-label="صرفه">
    <span className={styles.art} aria-hidden="true" />
  </span>;
}
