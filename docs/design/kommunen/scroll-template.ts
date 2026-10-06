/** The approved scroll composition, shared by local review and publication. */
export function scrollTemplate(template:string):string {
 return template
        .replace('<body>','<body data-calculator-layout="scroll">')
        .replace('<!-- SHARED_HEADER -->','')
        .replace('<!-- SHARED_BREADCRUMB -->','')
        .replace(/<section class="sc-waitlist-preview">[\s\S]*?<\/section>/,'<div id="municipal-landscape-hero"></div>')
        .replace('<link rel="stylesheet" href="/kommunen.css">','<link rel="stylesheet" href="/kommunen.css">')
        .replace('</head>','<link rel="stylesheet" href="/landscape-shell.css"><link rel="stylesheet" href="/landscape-client.css"><link rel="stylesheet" href="/shared-nav/header.css"></head>')
        .replace('</body>','<script type="module" src="/landscape-client.js"></script></body>')
        .replace('<span class="{{label}}">02 · ENERGIE-CHECKS FÜR DEN ALLTAG</span>','')
        .replace('Von lokalen Zahlen zur eigenen Entscheidung.','Bürgerinnen und Bürger informieren. Entscheidungen erleichtern.')
        .replace('<section class="sc-waitlist-plan"','<!-- MUNICIPAL_SECTION_NAV --><section id="landscape-notes" class="sc-waitlist-plan"')
        .replace('<article class="municipal-product municipal-product-dark municipal-dashboard-section','<article id="dashboard-section" class="municipal-product municipal-product-dark municipal-dashboard-section')
        .replace('<article class="municipal-product municipal-calculator-section','<article id="calculators-section" class="municipal-product municipal-calculator-section')
        .replace('<article class="municipal-product municipal-product-dark {{monitorFoundation}}"','<article id="stories-section" class="municipal-product municipal-product-dark {{monitorFoundation}}"')
        .replace('<section class="municipal-section fit"','<section id="communication-section" class="municipal-section fit"')
        .replace('</body>','<script src="/gemeinde/ankernav.js"></script></body>');
}
