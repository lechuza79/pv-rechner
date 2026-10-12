import React from 'react';
import {describe,it,expect} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {MunicipalWidgetVisual} from '../../components/dashboard/MunicipalWidgetVisual';
import {storyWidgetDefinition} from '../story-widget-definition';
import {STORY_CONCEPTS} from '../story-konzepte';
describe('one municipal widget basis',()=>{
 it('uses the same body with independent detail and interaction choices',()=>{
  const story={...STORY_CONCEPTS[0],label:'Zubau-Monatsrecap',additionsSeries:{months:['2026-08','2026-09'],counts:[4,8],kwp:[40,90],segments:[]}};
  expect(story).toBeDefined();
  const active=renderToStaticMarkup(<MunicipalWidgetVisual story={story} view={{controls:true}}/>);
  const still=renderToStaticMarkup(<MunicipalWidgetVisual story={story} view={{controls:false}}/>);
  expect(active).toContain('Zubau anzeigen');expect(still).not.toContain('Zubau anzeigen');
  expect(still).toContain('<svg');
 });
 it('gives every legacy template shared export identity and retains historical sources',()=>{
  for(const story of STORY_CONCEPTS){const widget=storyWidgetDefinition(story);expect(widget.sources.length).toBeGreaterThan(0);expect(widget.title).toBeTruthy();}
  const story={...STORY_CONCEPTS[0],sources:[{label:'Historical provider',url:'https://example.org/archive'}]};
  expect(storyWidgetDefinition(story).sources).toEqual([{name:'Historical provider',url:'https://example.org/archive'}]);
 });
});
