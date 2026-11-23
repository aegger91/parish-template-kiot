/*
  The single cross used everywhere in the template (Cross.astro and client-rendered markup).
  - byzantine: equal-armed Greek cross with flared arms and bead finials (default)
  - icxc: the Byzantine cross with IC XC / NI KA in the quadrants, titla over IC and XC
  - slavic: eight-pointed cross; the slanted footrest is HIGHER at the viewer's LEFT
  Never render it mirrored: no scaleX(-1) and no RTL flips.
*/
export type CrossVariant = 'byzantine' | 'icxc' | 'slavic';

const ARM = 'M-5.2 -7 L-8.6 -36 Q0 -39.5 8.6 -36 L5.2 -7 Z';

/** Inner shapes of the Byzantine cross in a -50..50 box, for embedding in other marks (logo, seal). */
export function crossShapes(beads = true): string {
  const arms = [0, 90, 180, 270].map((r) => `<g transform="rotate(${r})"><path d="${ARM}"/>${beads ? '<circle cx="0" cy="-43" r="4.6"/>' : ''}</g>`).join('');
  return `${arms}<rect x="-7.5" y="-7.5" width="15" height="15"/>`;
}

export function crossSvg(variant: CrossVariant = 'byzantine', size: number | string = 24, cls = '', title?: string): string {
  const label = title ?? (variant === 'icxc' ? 'IC XC NIKA' : undefined);
  const a11y = label ? `role="img" aria-label="${label.replace(/"/g, '&quot;')}"` : 'aria-hidden="true"';
  const klass = `cross${cls ? ' ' + cls : ''}`;
  if (variant === 'slavic') {
    return `<svg class="${klass}" width="${size}" height="${size}" viewBox="0 0 60 100" fill="currentColor" ${a11y}><rect x="27" y="3" width="6" height="94" rx="1"/><rect x="18" y="13" width="24" height="5.5" rx="1"/><rect x="5" y="28" width="50" height="6.5" rx="1"/><polygon points="13,67 47,77 47,82.5 13,72.5"/></svg>`;
  }
  const letters =
    variant === 'icxc'
      ? `<g font-family="var(--font-display)" font-size="15" text-anchor="middle" letter-spacing="0.5"><text x="-26" y="-17">IC</text><text x="26" y="-17">XC</text><text x="-26" y="31">NI</text><text x="26" y="31">KA</text><path d="M-35 -33.5 h18 M17 -33.5 h18" stroke="currentColor" stroke-width="2" fill="none"/><path d="M-35 -33.5 v2.5 M-17 -33.5 v2.5 M17 -33.5 v2.5 M35 -33.5 v2.5" stroke="currentColor" stroke-width="1.6" fill="none"/></g>`
      : '';
  return `<svg class="${klass}" width="${size}" height="${size}" viewBox="-50 -50 100 100" fill="currentColor" ${a11y}><g>${crossShapes()}</g>${letters}</svg>`;
}
