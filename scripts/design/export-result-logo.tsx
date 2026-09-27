import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { writeFileSync } from 'node:fs';
import Logo from '../../components/Logo';
// Static prototypes use the same geometry and palette as React pages.
(globalThis as unknown as { React: typeof React }).React = React;
writeFileSync('public/brand/logo-result.svg', renderToStaticMarkup(<Logo width={140} variant="result" />));
