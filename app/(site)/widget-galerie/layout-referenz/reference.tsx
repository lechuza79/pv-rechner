import type {ReactNode} from 'react';
import Link from 'next/link';
import WidgetDashboard from '../../../../components/dashboard/WidgetDashboard';
import {layoutExamples,type ExampleNode} from './examples';
import {dashboardLeaves,type DashboardNode,type DashboardSection} from '../../../../lib/widget-dashboard';
import type {WidgetSnapshots} from '../../../../lib/widget-resource';
import type {GalleryEntry} from '../../../../lib/widget-gallery';
import {allWidgets} from '../../../../lib/widget-registry';
import DataSourcesSection from '../../../../components/DataSourcesSection';
import {DataSourceNote} from '../../../../components/PoweredBy';
import galleryStyles from '../gallery.module.css';
import styles from './reference.module.css';
const node=(value:ExampleNode):DashboardNode=>value.children?{id:value.area,label:value.label,direction:value.direction??'row',children:value.children.map(node)}:{id:value.area,label:value.label,widgetId:value.widgetId!,presentation:value.compact?'compact':'full',period:value.period};
export default function LayoutReference({canSave=false,entries,views,queries,snapshots,sources:widgetSources}:{canSave?:boolean;entries:GalleryEntry[];views:Record<string,ReactNode>;queries:Record<string,Record<string,string>>;snapshots:WidgetSnapshots;sources:Record<string,string>}){
 const sections:DashboardSection[]=layoutExamples.flatMap(example=>[
  {id:example.id,title:example.title,description:example.description,root:{id:example.id,label:example.title,direction:example.direction??'row',children:example.nodes.map(node)}},
  ...(example.contentNodes?[{id:example.id+'-content',title:'Bestand und Entwicklung',root:{id:example.id+'-content',label:'Kennzahlen',direction:'column' as const,children:example.contentNodes.map(node)}}]:[]),
 ]);
 const ids=new Set(sections.flatMap(section=>dashboardLeaves(section.root)).map(leaf=>leaf.widgetId));
 const sources=[...new Map(allWidgets().filter(widget=>ids.has(widget.id)).flatMap(widget=>widget.sources).map(source=>[source.url,source])).values()];
 return <div className={`${galleryStyles.page} ${styles.reference}`}>
  <header className={styles.intro}><h1>Widget-Raster ausprobieren</h1><p>Gruppen und Widgets teilen sich ein Raster. Die verfügbare Breite bestimmt die Spalten; Inhalt und Darstellungsvariante bestimmen die nötige Höhe. Teilen und Download bleiben direkt am Widget verfügbar.</p><p><Link href="/widget-galerie/dashboard-bestand">Alle bestehenden Widgets im gemeinsamen Dashboard</Link> · <Link href="/widget-galerie/storyview">Storyansicht und Story-Widgets</Link> · <Link href="/widget-galerie">Widgets und Varianten auswählen</Link></p></header>
  <WidgetDashboard canSave={canSave} entries={entries} sections={sections} views={views} queries={queries} snapshots={snapshots} sources={widgetSources}/>
  <DataSourcesSection>{sources.map(source=><div key={source.url}><DataSourceNote source={source}/></div>)}</DataSourcesSection>
 </div>;
}
