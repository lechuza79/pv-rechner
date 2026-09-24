"use client";
import { ANLAGEN, SPEICHER } from "../lib/constants";
import OptionCard from "./OptionCard";
import InlineEdit from "./InlineEdit";
import GlossaryTerm from "./GlossaryTerm";
import { v } from "../lib/theme";

// Shared questions used by the PV calculator and the heat-pump PV add-on.
export function PvSizeQuestion({ answered, selected, customKwp, onSelect, onCustom }: { answered: boolean; selected: number; customKwp: number; onSelect: (index: number) => void; onCustom: (value: number) => void }) {
return (              <div>
                <p style={{ fontSize: v("--font-size-body"), color: v('--color-text-muted'), marginTop: -10, marginBottom: 14, lineHeight: 1.5 }}>
                  Die Leistung wird in <GlossaryTerm id="kwp">kWp</GlossaryTerm> angegeben.
                </p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  {ANLAGEN.map((a, i) => (
                    <OptionCard key={i} selected={answered && selected === i} onClick={() => onSelect(i)} label={a.label} sub={a.sub} icon={a.icon} />
                  ))}
                </div>
                <div style={{
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  marginTop: 14, fontSize: v("--font-size-small"), color: v('--color-text-muted'),
                }}>
                  <span>oder</span>
                  <InlineEdit value={customKwp} onCommit={onCustom} unit=" kWp" step={1} min={1} max={50} width={48} />
                </div>
              </div>);
}
export function PvStorageQuestion({ answered, selected, onSelect }: { answered: boolean; selected: number; onSelect: (index: number) => void }) {
return (              <div>
                <p style={{ fontSize: v("--font-size-body"), color: v('--color-text-muted'), marginTop: -10, marginBottom: 14, lineHeight: 1.5 }}>
                  Die <GlossaryTerm id="speicherkapazitaet">Speicherkapazität</GlossaryTerm> wird in <GlossaryTerm id="kwh">kWh</GlossaryTerm> gemessen.
                </p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {[...SPEICHER.map((s, idx) => ({ ...s, idx }))]
                  .sort((a, b) => a.kwh - b.kwh)
                  .map(s => (
                    <OptionCard key={s.idx} selected={answered && selected === s.idx} onClick={() => onSelect(s.idx)} label={s.label} sub={s.sub} icon={s.icon} />
                  ))}
                </div>
              </div>);
}
