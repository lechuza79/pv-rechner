# Shared personal contact section

Source: Atlas V3 shared-person/person.js and person.css. Prototype component for subsequent Claude integration.

Import mountPerson and personVariants. Provide target element, variant (municipality/homepage), town, portrait and avatar asset URLs. Optional copy overrides title/before/emphasis/after/primary/primaryHref/contact. Text is inserted through textContent, not HTML. Optional primaryElement retains existing action listeners; alternatively use onPrimary.

Desktop: portrait fills the text row height and rests on the lower rule, with horizontal cropping only. Mobile <=700px: circular avatar, signature, heading, text and actions. No card background. Homepage copy is an editable draft; municipality wording approved in conversation. Name/role defaults: Sebastian Schäder · Gründer von Solar Check.
