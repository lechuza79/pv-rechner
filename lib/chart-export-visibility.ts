/** Keep an in-progress export alive while its tab is hidden. */
export async function waitForChartVisibility(node: HTMLElement): Promise<void> {
  const doc = node.ownerDocument ?? document;
  const removed = () => new Error('Videoexport beendet: Das Diagramm ist nicht mehr geöffnet. Bitte erneut starten.');
  if (!node.isConnected) throw removed();
  if (!doc.hidden) return;
  await new Promise<void>((resolve, reject) => {
    const cleanup = () => {
      doc.removeEventListener('visibilitychange', check);
      observer.disconnect();
    };
    const check = () => {
      if (!node.isConnected) { cleanup(); reject(removed()); }
      else if (!doc.hidden) { cleanup(); resolve(); }
    };
    const observer = new MutationObserver(check);
    doc.addEventListener('visibilitychange', check);
    observer.observe(doc, {childList: true, subtree: true});
    check();
  });
}
