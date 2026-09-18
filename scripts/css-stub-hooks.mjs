// css-stub-hooks.mjs — module-customization hooks that stub `.css` imports for the SSR smoke
// (standard §4.6). Needed only if your sims/components co-locate CSS (`import "./x.css"`), which
// Node can't load as a module — without this the tsx-run smoke crashes on the first such import.
// smoke.ts registers these via node:module `register()` before importing any component.
// From ../_standard/templates/tier1-spa.
export async function resolve(specifier, context, nextResolve) {
  if (specifier.endsWith(".css")) {
    return { url: new URL(specifier, context.parentURL).href, shortCircuit: true };
  }
  return nextResolve(specifier, context);
}

export async function load(url, context, nextLoad) {
  if (url.endsWith(".css")) {
    return { format: "module", source: "export default {};", shortCircuit: true };
  }
  return nextLoad(url, context);
}
