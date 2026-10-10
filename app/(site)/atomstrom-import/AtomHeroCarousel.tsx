'use client';
import AtomHeroTilesPreview from '../../../components/energy/AtomHeroPreviews';
import type { ComponentProps } from 'react';
import StorySlider from '../../../components/StorySlider';
import { WidgetPresentationProvider } from '../../../components/dashboard/WidgetPresentationContext';

/** The page owns rotation; the central widget owns all three tile renderers. */
export default function AtomHeroCarousel(props: Omit<ComponentProps<typeof AtomHeroTilesPreview>, 'renderTiles'>) {
  return <WidgetPresentationProvider appearance={{ theme: 'dark' }}>
    <AtomHeroTilesPreview {...props} renderTiles={tiles =>
      <StorySlider variant="hero" ariaLabel="Atomstrom im Überblick"
        labels={['Atomstrom-Anteil im bisherigen Jahr', 'Import der letzten sieben Tage', 'Stromhandel im bisherigen Jahr']}>
        {tiles}
      </StorySlider>
    } />
  </WidgetPresentationProvider>;
}
