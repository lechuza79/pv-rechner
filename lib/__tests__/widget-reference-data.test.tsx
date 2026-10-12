import {describe, expect, it, vi} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {getWidgetReferenceData} from '../widget-reference-data';
const widgetReferenceData = getWidgetReferenceData();
import {GET} from '../../app/api/widgets/reference-data/route';
vi.mock('../preview-data', () => ({livePreviewResponse: async () => null}));
import {validateLiveWidgetData} from '../widget-data-services';
import {WidgetReferenceDataProvider} from '../../components/dashboard/WidgetReferenceData';
import VerlaufEmbed from '../../app/(embed)/embed/einspeiseverguetung-verlauf/client';
vi.mock('../../components/charts/FeedInTimelineWidget', () => ({default: ({jahre}: {jahre: unknown}) => <output>{JSON.stringify(jahre)}</output>}));
import WorldCapacityRaceWidget from '../../components/energy/WorldCapacityRaceWidget';
import WorldElectricityRaceWidget from '../../components/energy/WorldElectricityRaceWidget';

vi.mock('../../components/charts/RaceChart', () => ({default: (props: {
  kamera: {werte: Float64Array}; anderer: {werte: Float64Array}; annualYears: number[]; stand: string;
}) => <output>{JSON.stringify({renewable: [...props.kamera.werte], nuclear: [...props.anderer.werte], years: props.annualYears, stand: props.stand})}</output>}));

const url = new URL('https://solar-check.io/api/widgets/reference-data');
describe('shared historical observations', () => {
  it('publishes exactly the canonical data, including provenance', async () => {
    const published = await (await GET(new Request(url))).json();
    expect(published).toEqual(widgetReferenceData);
    expect(validateLiveWidgetData(url, published)).toEqual(published);
  });
  it('rejects incomplete series before rendering or caching them', () => {
    const broken = structuredClone(widgetReferenceData);
    broken.capacity.countries[0].windsolar.pop();
    expect(() => validateLiveWidgetData(url, broken)).toThrow('Invalid');
    expect(() => validateLiveWidgetData(url, {version: 1})).toThrow();
  });
  it('passes retrieved observations to the existing capacity renderer', () => {
    const live = structuredClone(widgetReferenceData);
    const world = live.capacity.countries.find(row => row.code === 'WELT')!;
    world.windsolar[0] = 12345;
    const html = renderToStaticMarkup(<WidgetReferenceDataProvider value={live}><WorldCapacityRaceWidget/></WidgetReferenceDataProvider>);
    expect(html).toContain('12345');
    expect(html).toContain(String(live.capacity.years[0]));
  });
  it('passes live historical tariffs to the existing tariff renderer', () => {
    const live = structuredClone(widgetReferenceData);
    live.feedIn.years[0].bars[0] = 123.456;
    const html = renderToStaticMarkup(<WidgetReferenceDataProvider value={live}><VerlaufEmbed jahre={widgetReferenceData.feedIn.years}/></WidgetReferenceDataProvider>);
    expect(html).toContain('123.456');
  });
  it('passes retrieved observations to the existing electricity renderer', () => {
    const live = structuredClone(widgetReferenceData);
    live.worldElectricity.rows[0].wind = 54321;
    live.worldElectricity.rows[0].solar = 0;
    const html = renderToStaticMarkup(<WidgetReferenceDataProvider value={live}><WorldElectricityRaceWidget/></WidgetReferenceDataProvider>);
    expect(html).toContain('54321');
  });
});
