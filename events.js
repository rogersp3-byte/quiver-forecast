/* ═══════════════════════════════════════════════════
 QUIVER EVENTS - events.js
 Edit this file to add/remove events.
 Counties: 'Clare' | 'Donegal' | 'Sligo' | 'Dublin' | 'All'
═══════════════════════════════════════════════════ */

const QUIVER_EVENTS = [
  {
    id: 'kennys-surf-open-2026',
    title: "Kenny's Surf Open '26",
    type: 'competition',
    date: '2026-03-21',
    location: 'Lahinch Beach, Clare',
    counties: ['All'],
    description: "Open Mens, Womens and Mixed Expression. Entry €35 - T-shirt, BBQ and after party included.",
    link: 'https://irishsurfing.justgo.com',
    cta: 'Register now'
  },
  {
    id: 'clean-coasts-lahinch-2026',
    title: 'Beach Clean - Lahinch',
    type: 'beach-clean',
    date: '2026-03-22',
    location: 'Lahinch Beach, Clare',
    counties: ['Clare'],
    description: 'Community beach clean with Clean Coasts Ireland. Bags and gloves provided. Meet at the main car park at 10am.',
    link: 'https://cleancoasts.org',
    cta: 'Sign up'
  },
  {
    id: 'bundoran-biodiversity-2026',
    title: 'Ocean Biodiversity Talk',
    type: 'talk',
    date: '2026-04-03',
    location: 'Bundoran Community Centre',
    counties: ['Donegal'],
    description: 'Marine biologist Dr. Aoife Ni Fhaoláin on changing species patterns in Donegal Bay. Free entry.',
    link: '#',
    cta: 'Find out more'
  },
  {
    id: 'strandhill-clean-2026',
    title: 'Beach Clean - Strandhill',
    type: 'beach-clean',
    date: '2026-04-05',
    location: 'Strandhill Beach, Sligo',
    counties: ['Sligo'],
    description: 'Monthly beach clean organised by Strandhill Surf Club. All welcome.',
    link: 'https://strandhillsurfclub.com',
    cta: 'Join in'
  }
];

const EVENT_TYPE_LABELS = {
  'beach-clean': 'Beach Clean',
  'competition': 'Competition',
  'talk': 'Event',
  'shop': 'Local Business',
  'advocacy': 'Advocacy',
  'paddle': 'Paddle Event'
};

function getEventsForCounty(county) {
  const today = new Date();
  today.setHours(0,0,0,0);
  return QUIVER_EVENTS
    .filter(e => {
      const eventDate = new Date(e.date);
      return eventDate >= today && (e.counties.includes('All') || e.counties.includes(county));
    })
    .sort((a,b) => new Date(a.date) - new Date(b.date));
}

function renderEventBanner(county, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const events = getEventsForCounty(county);
  if (!events.length) { container.style.display = 'none'; return; }
  const e = events[0];
  const typeLabel = EVENT_TYPE_LABELS[e.type] || e.type;
  const dateObj = new Date(e.date);
  const dateStr = dateObj.toLocaleDateString('en-IE', { weekday:'short', day:'numeric', month:'short' });
  const today = new Date();
  today.setHours(0,0,0,0);
  const daysUntil = Math.round((dateObj - today) / (1000*60*60*24));
  const daysLabel = daysUntil === 0 ? 'Today' : daysUntil === 1 ? 'Tomorrow' : daysUntil + ' days';
  container.innerHTML = `
    <div class="event-banner-inner">
      <div class="event-banner-left">
        <div class="event-type-pill">${typeLabel}</div>
        <div class="event-title">${e.title}</div>
        <div class="event-meta">${dateStr} &middot; ${e.location}</div>
        <div class="event-desc">${e.description}</div>
      </div>
      <div class="event-banner-right">
        <div class="event-soon">${daysLabel}</div>
        <a href="${e.link}" target="_blank" rel="noopener" class="event-cta">${e.cta} &rarr;</a>
      </div>
    </div>
    ${events.length > 1 ? `<div class="event-more">+${events.length - 1} more event${events.length > 2 ? 's' : ''} in your area</div>` : ''}
  `;
}
