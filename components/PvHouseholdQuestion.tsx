"use client";
import OptionCard from './OptionCard';
import {PERSONEN,NUTZUNG} from '../lib/constants';
import {v} from '../lib/theme';

/** Original household questions, shared by the calculator and its presentation. */
export default function PvHouseholdQuestion({field,selected,onSelect,columns=4}:{columns?:2|4;field:'personen'|'nutzung';selected:number|null;onSelect:(value:number)=>void}) {
 return field==='personen' ? <>
                    <div style={{ fontSize: v("--font-size-small"), fontWeight: 600, color: v('--color-text-muted'), marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.04em" }}>Personen im Haushalt</div>
                    <div style={{ display: "grid", gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`, gap: 6, marginBottom: 20 }}>
                      {PERSONEN.map((p, i) => {
                        // Gewählt erst, wenn wirklich jemand gewählt hat — der
                        // Startwert allein markiert nichts (Flow-Konvention).
                        const aktiv = selected === i;
                        return (
                        // data-flow-option/-group von Hand statt OptionCard: Die
                        // Zahlenreihe ist bewusst schmal (vier Spalten), eine
                        // Auswahlkarte mit Unterzeile würde den Schritt doppelt
                        // so hoch machen. Die Kennzeichnung ist dieselbe, damit
                        // der Flow-Läufer die Frage trotzdem bedienen kann; die
                        // Gruppe trennt sie vom Nutzungsprofil daneben.
                        <button key={i} data-flow-option={p.label === "1" ? "1 Person" : `${p.label} Personen`} data-flow-group="personen" aria-pressed={aktiv}
                          onClick={() => onSelect(i)} style={{
                          padding: "10px 4px", borderRadius: v('--radius-md'), fontSize: v("--font-size-body"), fontWeight: 700, cursor: "pointer", textAlign: "center",
                          background: aktiv ? v('--color-accent-dim') : v('--color-bg-muted'),
                          border: aktiv ? `2px solid ${v('--color-accent')}` : `2px solid ${v('--color-border')}`,
                          color: aktiv ? v('--color-accent') : v('--color-text-secondary'),
                        }}>{p.label}</button>
                        );
                      })}
                    </div>
</> : <>
                <div style={{ fontSize: v("--font-size-small"), fontWeight: 600, color: v('--color-text-muted'), marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.04em" }}>Nutzungsprofil</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  {NUTZUNG.map((n, i) => (
                    <OptionCard key={i} group="nutzung" selected={selected === i} onClick={() => onSelect(i)} label={n.label} sub={n.sub} />
                  ))}
                </div>
</>;
}
