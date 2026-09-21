import React from 'react';
import {createRoot} from 'react-dom/client';
import MunicipalStoryPreview from '@solar-check/municipal-story-preview';
import data from './stories.json';
import MunicipalDataPreview from './MunicipalDataPreview';
createRoot(document.getElementById('root')!).render(new URLSearchParams(location.search).get('view')==='data'?<MunicipalDataPreview/>:<MunicipalStoryPreview stories={data.stories as any} name={data.name} surfaceScheme="dark" embedded/>);
