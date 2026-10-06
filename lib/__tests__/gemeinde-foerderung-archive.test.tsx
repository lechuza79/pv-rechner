import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {describe, it, expect} from 'vitest';
import GemeindeFoerderung, {foerderEinleitung} from '../../components/gemeinde/GemeindeFoerderung';
import {FUNDING_PROGRAMS, istFinanzierung} from '../funding-programs';

describe('municipal funding archive', () => {
  it('renders available support first and exhausted support in a closed, server-rendered archive', () => {
    const active = FUNDING_PROGRAMS['meinersen-solar'];
    const exhausted = FUNDING_PROGRAMS['gifhorn-kreis-balkonkraftwerke'];
    const html = renderToStaticMarkup(<GemeindeFoerderung ort="Meinersen" programme={[
      {programm: exhausted, standLabel: 'Test', zaehlt: false},
      {programm: active, standLabel: 'Test', zaehlt: true},
    ]}/>);
    const archive = html.indexOf('<details');
    expect(archive).toBeGreaterThan(html.indexOf(active.name));
    expect(html.indexOf(exhausted.name)).toBeGreaterThan(archive);
    expect(html).not.toMatch(/<details[^>]*\bopen/);
    expect(html).toContain('ausgeschöpft');
    expect(html).toContain('>aktiv</span>');
    expect(html).toContain('Gemeinde Meinersen');
    expect(html).toContain('Landkreis Gifhorn');
    expect(html).toContain(active.url);
  });
});

describe('funding sentence follows the cards it introduces', () => {
  const karte = (id: string, zaehlt: boolean) => ({programm: FUNDING_PROGRAMS[id], standLabel: 'Test', zaehlt});

  it('never claims "no support" above an active card, even when it does not deduct money (Berlin SolarPLUS)', () => {
    // Live 28.09.2026: the sentence followed fundingZaehlt(), the cards followed
    // the non-archived set — Berlin read "kein eigener Zuschuss" above SolarPLUS.
    const html = renderToStaticMarkup(<GemeindeFoerderung ort="Berlin" programme={[karte('berlin-solarplus', false)]}/>);
    expect(html).toContain('SolarPLUS');
    expect(html).not.toMatch(/kein eigene[rs]/);
    expect(html).toContain('Dieser Zuschuss gilt hier zusätzlich zur bundesweiten Förderung.');
  });

  it('names a loan as a loan (Bremen)', () => {
    expect(istFinanzierung(FUNDING_PROGRAMS['bremen-rundumshaus'])).toBe(true);
    expect(istFinanzierung(FUNDING_PROGRAMS['berlin-solarplus'])).toBe(false);
    expect(foerderEinleitung('Bremen', 'in', [karte('bremen-rundumshaus', true)])).toBe('Dieses Darlehen gilt hier zusätzlich zur bundesweiten Förderung.');
    expect(foerderEinleitung('Berlin', 'in', [karte('berlin-solarplus', true), karte('bremen-rundumshaus', true)])).toBe('Diese Programme gelten hier zusätzlich zur bundesweiten Förderung.');
  });

  it('uses the shared place preposition instead of a bare "Für Landkreis X"', () => {
    expect(foerderEinleitung('Vogelsbergkreis', 'im', [])).toBe('Im Vogelsbergkreis ist uns derzeit kein eigenes Förderprogramm bekannt. Es gilt die bundesweite Förderung.');
    expect(foerderEinleitung('Quitzdorf am See', 'in', [])).toMatch(/^In Quitzdorf am See ist uns/);
    // Archived programs only sit in the archive — they do not count as current support.
    const archiviert = renderToStaticMarkup(<GemeindeFoerderung ort="Meinersen" programme={[karte('gifhorn-kreis-balkonkraftwerke', false)]}/>);
    expect(archiviert).toContain('In Meinersen ist uns derzeit kein eigenes Förderprogramm bekannt.');
  });
});
