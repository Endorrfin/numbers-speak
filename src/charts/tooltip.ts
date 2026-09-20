// tooltip.ts — the floating text tooltip shared by the S3-tl renderers (CHANGED (S3-tl): new).
// Pointer only: keyboard and screen-reader users get the table view. Text only — never innerHTML.
export type TipContent = { title: string; lines: string[] };

export function showTip(tooltip: HTMLElement | null, svgEl: SVGSVGElement, event: PointerEvent, content: TipContent): void {
  if (!tooltip) return;
  const title = document.createElement('strong');
  title.textContent = content.title;
  const lines = content.lines.map((line) => {
    const div = document.createElement('div');
    div.textContent = line;
    return div;
  });
  tooltip.replaceChildren(title, ...lines);
  tooltip.hidden = false;
  const host = tooltip.offsetParent ?? svgEl.parentElement;
  const box = host?.getBoundingClientRect();
  if (!box) return;
  const tw = tooltip.offsetWidth;
  const th = tooltip.offsetHeight;
  let left = event.clientX - box.left + 14;
  if (left + tw > box.width) left = Math.max(0, event.clientX - box.left - tw - 14);
  const top = Math.max(0, event.clientY - box.top - th - 10);
  tooltip.style.left = `${Math.round(left)}px`;
  tooltip.style.top = `${Math.round(top)}px`;
}

export function hideTip(tooltip: HTMLElement | null): void {
  if (tooltip) tooltip.hidden = true;
}
