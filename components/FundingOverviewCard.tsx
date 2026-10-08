"use client";

import { useState } from "react";
import ActionButton from "./ActionButton";
import FundingDetailModal from "./FundingDetailModal";
import { FundingStatusBadge } from "./FundingProgramParts";
import type { FoerderProgrammAnsicht } from "./gemeinde/GemeindeFoerderung";
import styles from "./FundingDetailModal.module.css";
import foundation from "./social/atlas-foundations.module.css";

export default function FundingOverviewCard({selected, ort, detailHref}: {
  selected: FoerderProgrammAnsicht;
  ort: string;
  detailHref?: string;
}) {
  const [open, setOpen] = useState(false);
  const program = selected.programm;
  return <div className={`${foundation.foundation} ${styles.overview}`} data-story-scheme="light">
    <article className={styles.card}>
      <div className={styles.overviewMeta}><FundingStatusBadge status={program.status} compact /><span>{selected.standLabel}</span></div>
      <header className={styles.intro}>
        <p className={styles.provider}>{program.traeger}</p>
        <h3>{program.name}</h3>
      </header>
      <p className={styles.description}>{program.coveredCosts}</p>
      <div className={styles.overviewActions}>
        <ActionButton onClick={() => setOpen(true)}>Förderung im Detail</ActionButton>
        {detailHref && <a href={detailHref}>Förderseite {ort}</a>}
      </div>
    </article>
    <FundingDetailModal selected={open ? selected : null} ort={ort} onClose={() => setOpen(false)} />
  </div>;
}
