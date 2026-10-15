import Link from 'next/link';
import WidgetPreviewCard from '../../../components/dashboard/WidgetPreviewCard';
import type {GalleryEntry} from '../../../lib/widget-gallery';
import styles from './gallery.module.css';

// Editorial examples refer to the gallery's existing charts and variants.
export const GALLERY_EXAMPLES = [
  {id:'strommix-anteil', title:'Ein Chart zum Artikel', description:'Zeige, wie sich die Stromerzeugung zusammensetzt. Die interaktive Grafik ergänzt die Einordnung im Text und lässt sich an das Aussehen deiner Website anpassen.', group:'energy'},
  {id:'welt-zubaurennen', title:'Entwicklungen anschaulich erzählen', description:'Ein Racing-Chart macht Veränderungen über mehrere Jahre sichtbar. Leserinnen und Leser können die Entwicklung verfolgen und einzelne Zeitpunkte genauer ansehen.', group:'racing'},
] as const;

export function GalleryIntroduction(){
  return <div className={styles.introduction}>
    <p>Energiedaten für deine Website, deinen nächsten Artikel oder die Seite deiner Gemeinde. Wähle passende Charts, passe ihr Aussehen an und übernimm den Einbettungscode. Die Daten werden von Solar Check aktualisiert – entsprechend dem Veröffentlichungsrhythmus der jeweiligen Quelle.</p>
    <p>Starte mit einer fertigen Kombination oder entdecke unten weitere Anwendungen. In den Themenansichten kannst du alle verfügbaren Charts, Datenansichten und kompakten Varianten im Detail ausprobieren.</p>
    <p className={styles.usage}>Die Einbettung ist kostenlos und ohne Anmeldung möglich. Quellenangabe und Solar-Check-Hinweis gehören dazu. Hinweise findest du in den <Link href="/widget-nutzungsbedingungen">Nutzungsbedingungen</Link> und im <Link href="/datenschutz">Datenschutz</Link>.</p>
  </div>;
}

export function GalleryExamples({entries,placeId}:{entries:GalleryEntry[];placeId:string}){
  return <section className={styles.examples} aria-labelledby="gallery-examples-title">
    <h2 id="gallery-examples-title">Weitere Anwendungen</h2>
    <div className={styles.grid}>{GALLERY_EXAMPLES.map(example=>{
      const entry=entries.find(candidate=>candidate.id===example.id);
      if(!entry)return null;
      return <div key={example.id} className={styles.example}>
        <h3>{example.title}</h3><p>{example.description}</p>
        <WidgetPreviewCard entry={entry}/>
        <Link href={`/widget-galerie?ort=${placeId}&gruppe=${example.group}#${entry.id}`}>Chart und Varianten entdecken →</Link>
      </div>;
    })}</div>
  </section>;
}
