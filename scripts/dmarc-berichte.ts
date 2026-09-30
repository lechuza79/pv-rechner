/**
 * Read the DMARC aggregate reports from the outreach mailbox, file them away,
 * judge them.
 *
 *   npm run dmarc:berichte              read and print, nothing moved
 *   npm run dmarc:berichte -- --ablegen move report mails into the "DMARC" folder
 *   npm run dmarc:berichte -- --melden  file the result in the watcher Ablage
 *
 * The operator asked explicitly (30.09.2026) not to see these mails: "die
 * bringt mir garnix, die musst du auswerten". So the reports leave the inbox
 * (moved, never deleted — the raw report stays retrievable) and the judgement
 * goes to the Ablage for Claude. The run fails (exit 1) only when a domain
 * shows a failing share that points at our own mail; strangers spoofing the
 * domain and forwarded mail are background noise in every report.
 *
 * Runs in the daily Kommunen-Rücklauf workflow BEFORE the reply intake, so the
 * intake never sees a report mail.
 *
 * Env: OUTREACH_IMAP_HOST/PORT/USER/PASS; CRON_SECRET for --melden.
 */
import { berichtAblegen } from "../lib/alert-senden";
import { beurteile, entpacke, istAuffaellig, istDmarcBericht, leseBericht, type DmarcBericht } from "../lib/dmarc-bericht";

const hat = (f: string) => process.argv.includes(`--${f}`);
const ORDNER = "DMARC";

async function main() {
  const { ImapFlow } = await import("imapflow");
  const { simpleParser } = await import("mailparser");
  const { OUTREACH_IMAP_HOST: host, OUTREACH_IMAP_USER: user, OUTREACH_IMAP_PASS: pass } = process.env;
  if (!host || !user || !pass) throw new Error("OUTREACH_IMAP_HOST/USER/PASS fehlen");
  const port = Number(process.env.OUTREACH_IMAP_PORT ?? 993);
  const imap = new ImapFlow({ host, port, secure: port === 993, auth: { user, pass }, logger: false });
  await imap.connect();

  const berichte: DmarcBericht[] = [];
  const zuVerschieben: number[] = [];
  let unlesbar = 0;
  const lock = await imap.getMailboxLock("INBOX");
  try {
    for await (const m of imap.fetch({ all: true }, { envelope: true, uid: true })) {
      if (!istDmarcBericht(m.envelope?.subject ?? "")) continue;
      zuVerschieben.push(m.uid);
    }
    for (const uid of zuVerschieben) {
      const m = await imap.fetchOne(String(uid), { source: true }, { uid: true });
      if (!m || !m.source) continue;
      const mail = await simpleParser(m.source);
      let gelesen = false;
      for (const a of mail.attachments) {
        const xml = entpacke(a.filename ?? "", a.content);
        const b = xml ? leseBericht(xml) : null;
        if (b) { berichte.push(b); gelesen = true; }
      }
      if (!gelesen) unlesbar++;
    }
    if (hat("ablegen") && zuVerschieben.length) {
      if (!(await imap.list()).some((f) => f.path === ORDNER)) await imap.mailboxCreate(ORDNER);
      await imap.messageMove(zuVerschieben.join(","), ORDNER, { uid: true });
    }
  } finally {
    lock.release();
  }
  await imap.logout();

  const urteile = beurteile(berichte);
  console.log(`${zuVerschieben.length} Berichte im Posteingang, ${berichte.length} gelesen, ${unlesbar} ohne lesbaren Anhang${hat("ablegen") ? `, nach „${ORDNER}" verschoben` : ""}`);
  for (const u of urteile) {
    console.log(`${istAuffaellig(u) ? "✗" : "✓"} ${u.domain} (p=${u.policy}) ${u.zeitraum.von}–${u.zeitraum.bis}: ${u.mails} Mails, ${u.durchgefallen} durchgefallen, ${u.abgewiesen} abgewiesen · ${u.absender.join(", ")}`);
    for (const q of u.quellen.slice(0, 5)) console.log(`    ${q.ip} ×${q.anzahl} (${q.absender.join(", ")})`);
  }

  const auffaellig = urteile.filter(istAuffaellig);
  if (hat("melden") && berichte.length) {
    await berichtAblegen(
      {
        tag: "dmarc-berichte",
        subject: auffaellig.length ? `DMARC: ${auffaellig.map((u) => u.domain).join(", ")} fällt durch` : "DMARC: alles bestanden",
        audience: "claude",
        decisions: [],
        done: [],
        details: urteile
          .map((u) => `${u.domain}: ${u.mails} Mails, ${u.durchgefallen} durchgefallen (${u.quellen.slice(0, 3).map((q) => `${q.ip}×${q.anzahl}`).join(", ") || "—"})`)
          .join("\n"),
      },
      process.env.CRON_SECRET ?? "",
    );
  }
  if (auffaellig.length) process.exit(1);
}

main().catch((e) => {
  console.error((e as Error).message);
  process.exit(1);
});
