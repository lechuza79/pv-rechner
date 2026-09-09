import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { isAdminSession } from "../../../../../lib/admin-guard";
import { baueAllePosts, quellenzeile } from "../../../../../lib/social-posts";
import { entwurfAus } from "../../../../../lib/social-entwurf";
import { fassungsAbdruck } from "../../../../../lib/social-pruefung";
import { pruefeMechanisch } from "../../../../../lib/social-mechanik";
import { socialKennzahlen } from "../../../../../lib/social-kennzahlen";
import { ladePlaetze } from "../../../../../lib/social-plaetze";
import {
  FUND_STAND_LABEL,
  standMitAbleitung,
  leseFunde,
  orteImVorrat,
  setzeStand,
  zaehleFunde,
  type FundStand,
} from "../../../../../lib/social-fundvorrat";
import { FundListe } from "../../../../../components/social/FundListe";
import { BucketFilter } from "../../../../../components/social/BucketFilter";
import AdminSeitenkopf from "../../../../../components/admin/AdminSeitenkopf";
import { v, space } from "../../../../../lib/theme";

// Der Story-Bucket — was der Suchlauf in den Daten gefunden hat.
//
// EIN VORRAT AN IDEEN, NICHT AN BEITRÄGEN. Jeder Eintrag ist ein gerechneter
// Satz mit seinen Zahlen und seiner Grundlage; was davon taugt, entscheidet ein
// Mensch, und aus dem Vorgemerkten wird dann Visual und Text.
//
// Die Kennung neben jedem Satz ist der Griff: Sie bleibt über Läufe hinweg
// dieselbe und lässt sich zurufen („mach aus g10-anomalie-fuerfeld einen
// Post"). Ohne sie wäre die Auswahl auf dieser Seite eingesperrt.

export const metadata = {
  title: "Redaktion – Story-Bucket",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

// Alle Stände als Filter — auch die abgeleiteten: Man will sehen, was schon
// ein Beitrag ist, ohne es setzen zu können.
const STAENDE: FundStand[] = ["offen", "vorgemerkt", "beitrag", "geplant", "verworfen"];

export default async function StoryBucket({
  searchParams,
}: {
  searchParams: Promise<{
    stand?: string;
    muster?: string;
    ort?: string;
    land?: string;
    zeit?: string;
    suche?: string;
  }>;
}) {
  if (!(await isAdminSession())) redirect("/login?next=/admin/redaktion/bucket");

  const p = await searchParams;
  const stand = STAENDE.includes(p.stand as FundStand) ? (p.stand as FundStand) : undefined;
  const muster = p.muster || undefined;
  const ort = p.ort || undefined;
  const land = p.land || undefined;
  const zeit = p.zeit === "evergreen" || p.zeit === "zeitnah" ? p.zeit : undefined;
  const suche = p.suche || undefined;

  // Welche Funde sind schon ein Beitrag, welche geplant? Abgeleitet statt
  // mitgeschrieben: Ein Beitrag trägt die Kennung seines Fundes, und der Platz
  // im Kalender hängt am Beitrag. Beides zusätzlich zu speichern wäre eine
  // zweite Wahrheit, und die veraltet beim ersten Vergessen.
  //
  // Fällt einer der beiden Abrufe aus, bleibt der Stand der von Hand gesetzte —
  // ein Fund erscheint dann als „vorgemerkt" statt als „Beitrag". Die
  // vorsichtige Richtung: zu wenig Fortschritt zu zeigen kostet einen Klick,
  // zu viel verdeckt Arbeit, die noch aussteht.
  const [posts, plaetze] = await Promise.all([
    socialKennzahlen()
      .then((kz) => baueAllePosts(kz))
      .catch(() => []),
    ladePlaetze().catch(() => []),
  ]);
  const beitragsKennungen = new Set(posts.map((p) => p.id));
  const geplanteKennungen = new Set(
    plaetze.map((pl) => pl.post_id).filter((id): id is string => Boolean(id)),
  );

  const [funde, zahlen, orte] = await Promise.all([
    leseFunde({
      stand,
      muster,
      ort,
      land,
      evergreen: zeit ? zeit === "evergreen" : undefined,
      suche,
      grenze: 300,
    }),
    zaehleFunde(),
    orteImVorrat(),
  ]);

  // DER ENTWURF ENTSTEHT HIER, für jeden Fund der Liste — und das kostet keinen
  // Abruf: Er ist eine reine Funktion über den Fund. So kann das Fenster mit
  // den Pfeilen sofort weiterblättern, statt je Fund nachzuladen.
  const kennzahlen = await socialKennzahlen().catch(() => null);
  const quelle = kennzahlen ? quellenzeile(kennzahlen.standIso, false) : "";

  // Der jüngste Lauf über den ganzen Vorrat — nicht über die gefilterte
  // Auswahl: Sonst gälte in einer Liste, die nur alte Funde zeigt, der älteste
  // als aktuell, und die Kennzeichnung verschwände genau dort, wo sie zählt.
  const juengsterLauf = funde.reduce(
    (spaet, f) => (f.zuletztGesehen > spaet ? f.zuletztGesehen : spaet),
    "",
  );

  const mitStand = funde.map((f) => {
    const entwurf = entwurfAus(f, quelle);
    return {
      kennung: f.kennung,
      muster: f.muster,
      satz: f.satz,
      staerke: f.staerke,
      grundlage: f.grundlage,
      werte: f.werte,
      // Ohne Angabe zeitgebunden — dieselbe vorsichtige Richtung wie in der
      // Ablage: Ein Fund, den niemand eingeordnet hat, gilt nicht als Evergreen.
      evergreen: f.evergreen ?? false,
      zuletztGesehen: f.zuletztGesehen,
      juengsterLauf,
      stand: standMitAbleitung(f, beitragsKennungen, geplanteKennungen),
      entwurf,
      abdruck: fassungsAbdruck({ text: entwurf.text, bild: entwurf.bild }),
      // Ohne Kennzahlen keine mechanische Prüfung — sie braucht den Datenstand.
      // Lieber keine Befunde als erfundene.
      befunde: kennzahlen ? pruefeMechanisch(entwurf, kennzahlen) : [],
    };
  });

  const jeMuster = new Map<string, number>();
  const jeStand = new Map<string, number>();
  for (const z of zahlen) {
    jeMuster.set(z.muster, (jeMuster.get(z.muster) ?? 0) + z.zahl);
    jeStand.set(z.stand, (jeStand.get(z.stand) ?? 0) + z.zahl);
  }
  const gesamt = zahlen.reduce((n, z) => n + z.zahl, 0);

  async function standSetzen(kennung: string, neu: FundStand) {
    "use server";
    await setzeStand(kennung, neu);
    revalidatePath("/admin/redaktion/bucket");
  }

  const gefiltert = Boolean(stand || muster || ort || land || zeit || suche);

  return (
    <>
      <AdminSeitenkopf
        titel="Story-Bucket"
        hilfe={
          "Was der Suchlauf in den Daten gefunden hat — Ideen, keine fertigen Beiträge. " +
          "Jeder Eintrag ist ein gerechneter Satz mit seinen Zahlen; „Grundlage“ zeigt, " +
          "worauf er beruht und was die Zahlen NICHT hergeben. Vormerken heißt: daraus " +
          "soll ein Post werden. Die Kennung links lässt sich kopieren und zurufen."
        }
      />

      <BucketFilter
        staende={STAENDE.map((s) => ({
          schluessel: s,
          name: FUND_STAND_LABEL[s],
          zahl: jeStand.get(s) ?? 0,
        }))}
        muster={[...jeMuster.entries()]
          .sort((a, b) => b[1] - a[1])
          .map(([m, n]) => ({ schluessel: m, name: m, zahl: n }))}
        kommunen={orte.kommunen.map((o) => ({ schluessel: o.name, name: o.name, zahl: o.zahl }))}
        laender={orte.laender.map((o) => ({ schluessel: o.name, name: o.name, zahl: o.zahl }))}
        gewaehlt={{
          stand: stand ?? "",
          muster: muster ?? "",
          ort: ort ?? "",
          land: land ?? "",
          zeit: zeit ?? "",
          suche: suche ?? "",
        }}
      />

      {/* WAS DIE LISTE ZEIGT, NICHT WAS ES GIBT. Vorher stand ohne Filter die
          Gesamtzahl da, während die Liste darunter gekappt war — wer nach unten
          scrollte und aufhörte, hielt den Vorrat für abgearbeitet. */}
      <p style={{ fontSize: v("--font-size-small"), color: v("--color-text-muted"), margin: `0 0 ${space.sm}px` }}>
        {mitStand.length === gesamt
          ? `${gesamt} Funde`
          : `${mitStand.length} von ${gesamt} Funden${gefiltert ? "" : " — je Muster die stärksten"}`}
      </p>

      <FundListe funde={mitStand} onStandAction={standSetzen} />
    </>
  );
}
