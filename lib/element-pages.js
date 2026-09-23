const { readPage } = require('./page-template');
const elements = require('../data/element-reference.json');
const gameElements = require('../data/elements.js');
const gameFacts = new Map(gameElements.map(element => [element.atomicNumber, element.hints]));
const families = {
  'Nonmetal': ['nonmetal', 'Nonmetals have varied appearances and physical states. Their atoms commonly form covalent bonds by sharing electrons, so their compounds include both small molecules and extended networks. Unlike most metals, they are generally poor electrical conductors, although graphite is a notable exception. Several nonmetals are central to the chemistry of living organisms, air, water, and minerals.'],
  'Noble Gas': ['noble-gas', 'The noble gases occupy group 18, at the right-hand edge of the periodic table. Their filled outer electron shells help explain the low reactivity of the lighter members. Those elements occur as individual atoms rather than ordinary two-atom molecules. The family is not completely inert: heavier members can form compounds, and predictions for the superheavy end differ substantially from the familiar gases.'],
  'Alkali Metal': ['alkali-metal', 'Alkali metals occupy group 1, below hydrogen. Their outer electron is comparatively easy to remove, and their compounds are commonly described using a +1 oxidation state. The familiar members are soft, reactive metals that are normally encountered in compounds rather than as uncombined metal in nature. Reactivity, melting point, and other properties change as the atoms become larger down the group.'],
  'Alkaline Earth Metal': ['alkaline-earth', 'Alkaline earth metals form group 2. Their two outer electrons help explain why +2 is their characteristic oxidation state in compounds. Compared with the neighboring alkali metals, they generally bind their electrons more strongly and are harder and less reactive. The group includes elements important in rocks, biological structures, and alloys, but its members differ considerably in solubility, chemical behavior, and biological effects.'],
  'Metalloid': ['metalloid', 'Metalloids lie near the boundary between metals and nonmetals. The label describes a useful collection of intermediate properties rather than a single formal vertical group. Some have electrical behavior that can be tuned by adding small amounts of other elements, making them important in semiconductor materials. Their chemistry often involves covalent bonding, and the properties of their compounds can differ greatly from those of the pure elements.'],
  'Halogen': ['halogen', 'Halogens occupy group 17, just before the noble gases. The lighter members have seven outer-shell electrons and readily form compounds with metals and nonmetals. A −1 oxidation state is common, although several members also show positive oxidation states. Fluorine is especially distinctive in its reactivity. At the superheavy end, predicted chemical behavior can differ from the trends established by the lighter elements.'],
  'Metal': ['metal', 'This is the family labeled Metal in Elementle, covering the metals outside the alkali, alkaline earth, transition, lanthanide, and actinide families. Many are called post-transition metals. Their properties vary widely, but metallic bonding and the ability to form alloys are useful themes. Compared with many transition metals, familiar members often have lower melting points and are softer; these are trends, not rules for every element.'],
  'Transition Metal': ['transition-metal', 'Transition metals occupy the central region of the periodic table. The involvement of d electrons gives many members several accessible oxidation states and a rich coordination chemistry. Their compounds can have distinctive colors, and many serve as catalysts. Metallic bonding makes familiar members useful in structures and alloys. The behavior of an individual element still depends on its electron configuration and the chemical environment around it.'],
  'Lanthanide': ['lanthanide', 'The lanthanide series runs from lanthanum through lutetium in period 6. It is placed below the main table to keep the display compact. Many members share a common +3 oxidation state and similar chemistry, which can make them difficult to separate from one another. Changes in electron structure across the series produce useful magnetic and optical behavior, while their atomic sizes tend to decrease across the row.'],
  'Actinide': ['actinide', 'The actinide series runs from actinium through lawrencium in period 7 and is shown below the main table. Every member is radioactive. The earlier actinides can display several oxidation states, whereas the later members more often favor +3 in studied compounds. Some occur naturally, while many heavier members are produced in nuclear reactions. Available quantities and isotope lifetimes strongly influence how their chemistry can be investigated.']
};
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const slug = e => families[e.family][0];
const link = n => '/elements/' + n;

function tile(e, hero = false) {
  return `<${hero ? 'div' : 'a'} class="periodic-cell family-${slug(e)}${hero ? ' element-hero-tile' : ''}" ${hero ? 'aria-hidden="true"' : `href="${link(e.number)}" aria-label="${escape(e.number + '. ' + e.name + ' (' + e.symbol + '), ' + e.family)}" style="grid-column:${e.x};grid-row:${e.y + 1}"`}>
    <span class="cell-number">${e.number}</span><span class="cell-symbol">${e.symbol}</span><span class="cell-name">${e.name}</span>
  </${hero ? 'div' : 'a'}>`;
}

function overview() {
  return `<main class="elements-overview">
    <header class="elements-intro"><p class="element-eyebrow">118 elements. One table.</p><h1>Explore the elements</h1><p>Choose an element to discover its story, chemistry, and properties.</p></header>
    <p class="table-scroll-hint">Swipe or scroll sideways to explore the full table →</p>
    <div class="periodic-scroll" tabindex="0" role="region" aria-label="Periodic table; scroll horizontally to see all groups">
      <div class="periodic-table">
        ${Array.from({length:18}, (_,i)=>`<span class="group-number" style="grid-column:${i+1};grid-row:1">${i+1}</span>`).join('')}
        <div class="table-key"><span>Atomic number ↖</span><strong>Symbol</strong><span>Element name</span></div>
        ${elements.map(e=>tile(e)).join('')}
        <a class="series-placeholder family-lanthanide" style="grid-column:3;grid-row:7" href="#lanthanides">57–71<span>Lanthanides ↓</span></a>
        <a class="series-placeholder family-actinide" style="grid-column:3;grid-row:8" href="#actinides">89–103<span>Actinides ↓</span></a>
        <span class="series-label" style="grid-column:1 / 3;grid-row:10" id="lanthanides">6 · Lanthanides</span>
        <span class="series-label" style="grid-column:1 / 3;grid-row:11" id="actinides">7 · Actinides</span>
      </div>
    </div>
    <section class="family-legend" aria-labelledby="legend-heading"><h2 id="legend-heading">Element families</h2><ul>${Object.entries(families).map(([name,[className]])=>`<li><span class="legend-swatch family-${className}" aria-hidden="true"></span>${name}</li>`).join('')}</ul><p>Colors match the families used in Elementle. The two lower rows belong to periods 6 and 7.</p></section>
    <p class="element-source">Properties from <a href="https://pubchem.ncbi.nlm.nih.gov/periodic-table/">PubChem</a>. Each element page includes its references.</p>
  </main>`;
}

function propertyRows(e) {
  const a = e.attributes;
  const value = (text, unit = '') => text ? escape(text + unit) : 'Not available';
  const temperature = (text, kind) => {
    if (!text) return 'Not available';
    if (e.number === 2 && kind === 'melt') return 'Requires pressure; no melting point at 1 atm';
    if (e.number === 6) return 'Pressure-dependent; carbon sublimes at 1 atm';
    return `${value(text, ' K')} (${(Number(text)-273.15).toLocaleString('en',{maximumFractionDigits:2})} °C)${e.number >= 99 ? ' · estimated' : ''}`;
  };
  const state = e.number >= 100 ? 'Bulk state not experimentally established' : value(a.StandardState);
  return [
    ['Atomic number / protons',e.number],['Symbol',e.symbol],['Family (Elementle)',e.family],
    ['Classification (PubChem)',a.GroupBlock],['Period',e.period],['Group',e.y >= 9 ? 'Lanthanide / actinide series' : e.group],
    ['Atomic mass (u)',value(a.AtomicMass)],['Standard state',state],['Electron configuration',value(a.ElectronConfiguration)],
    ['Reported oxidation states',value(a.OxidationStates)],['Electronegativity (Pauling)',value(a.Electronegativity)],
    ['Atomic radius (pm)',value(a.AtomicRadius)],['First ionization energy (eV)',value(a.IonizationEnergy)],
    ['Electron affinity (eV)',value(a.ElectronAffinity)],['Density (g/cm³)',value(a.Density)],
    ['Melting point',temperature(a.MeltingPoint,'melt')],['Boiling point',temperature(a.BoilingPoint,'boil')],
    ['Discovery (PubChem)',a.YearDiscovered === 'Ancient' ? 'Known since antiquity' : value(a.YearDiscovered)]
  ];
}

const numberValue = value => value === '' || value == null ? null : Number(value);
const spokenList = values => values.length < 2
  ? values[0]
  : `${values.slice(0, -1).join(', ')} and ${values.at(-1)}`;

function comparisonSentence(e, key, label, unit, precision = 2) {
  const currentIndex = elements.indexOf(e);
  const neighbors = [elements[currentIndex - 1], elements[currentIndex + 1]].filter(Boolean);
  const current = numberValue(e.attributes[key]);
  const usable = neighbors.filter(neighbor => numberValue(neighbor.attributes[key]) != null);
  if (current == null || usable.length === 0) return '';
  const formatted = value => Number(value).toLocaleString('en', { maximumFractionDigits: precision });
  const comparisons = usable.map(neighbor => {
    const neighborValue = numberValue(neighbor.attributes[key]);
    const relation = current === neighborValue ? 'the same as' : current > neighborValue ? 'higher than' : 'lower than';
    return `${relation} ${neighbor.name}’s ${formatted(neighborValue)}${unit}`;
  });
  return `${e.name}’s listed ${label} is ${formatted(current)}${unit}, ${spokenList(comparisons)}.`;
}

function chemistryStory(e) {
  const a = e.attributes;
  const oxidation = a.OxidationStates
    ? `The reported oxidation states—${a.OxidationStates}—show the formal charges chemists use when tracking ${e.symbol} through compounds and reactions.`
    : `No settled oxidation-state list appears in the reference data, a reminder that the chemistry of ${e.symbol} has not been mapped as completely as that of longer-lived elements.`;
  const configuration = a.ElectronConfiguration.includes('predicted') || e.number >= 104
    ? `${a.ElectronConfiguration || 'Its electron configuration is predicted rather than directly established'}, and calculations at this nuclear charge must account for relativistic electron behavior.`
    : `${e.symbol} has the ground-state electron configuration ${a.ElectronConfiguration}; those occupied orbitals set the starting point for its bonds and ions.`;
  const comparisons = [
    comparisonSentence(e, 'IonizationEnergy', 'first ionization energy', ' eV'),
    comparisonSentence(e, 'Electronegativity', 'Pauling electronegativity', ''),
    comparisonSentence(e, 'AtomicRadius', 'atomic radius', ' pm', 0)
  ].filter(Boolean);
  return `<h2>Why ${e.symbol} behaves the way it does</h2>
    <p>${escape(configuration)} ${escape(oxidation)}</p>
    ${comparisons.length ? `<p>${escape(comparisons.join(' '))} Neighbor comparisons are useful here because periodic trends are patterns, not perfectly smooth rules.</p>` : `<p>For ${e.name}, the gaps in measured atomic data are part of the story: researchers often have only short decay chains and a few atoms from which to test calculations.</p>`}`;
}

function physicalStory(e) {
  const a = e.attributes;
  const state = e.number >= 100 ? 'not established for a macroscopic sample' : (a.StandardState || 'not listed');
  const appearance = e.appearance ? ` Descriptions of prepared samples call it ${e.appearance}.` : '';
  const density = comparisonSentence(e, 'Density', 'density', ' g/cm³');
  const phase = [a.MeltingPoint && `${Number(a.MeltingPoint).toLocaleString('en')} K melting point`, a.BoilingPoint && `${Number(a.BoilingPoint).toLocaleString('en')} K boiling point`].filter(Boolean);
  return `<h2>${e.name} as matter</h2>
    <p>The standard-state entry for ${e.name} is ${escape(state)}.${escape(appearance)} ${density ? escape(density) : `A dependable bulk density is not available for element ${e.number}.`} ${phase.length ? `The compilation reports a ${escape(spokenList(phase))}; phase boundaries depend on pressure and, in some cases, allotrope.` : `Its ordinary melting and boiling points have not been established experimentally.`}</p>`;
}

function discoveryStory(e) {
  const year = e.attributes.YearDiscovered;
  if (year === 'Ancient') {
    return `<h2>A history older than chemistry</h2><p>${e.name} was known in some form in antiquity${e.discoveredBy ? `, with the reference record associating its early use with ${escape(e.discoveredBy)}` : ''}. Its story therefore begins with ores, pigments, tools, medicines, or native material rather than a single laboratory announcement. Recognition of ${e.symbol} as a distinct element came only after people had already learned to use its substances.</p>`;
  }
  const discoverer = e.discoveredBy ? `The element summary credits ${e.discoveredBy}` : 'The reference does not assign one discoverer';
  const date = year ? ` and PubChem records ${year} as its discovery year` : ', while PubChem does not supply one discovery year';
  return `<h2>How ${e.name} entered the periodic table</h2><p>${escape(discoverer + date)}. For ${e.name}, “discovery” may mean recognizing an unfamiliar substance, isolating a pure sample, or creating and identifying a few atoms; those milestones can belong to different experiments. The name and symbol ${e.symbol} preserve that human history in every chemical formula that uses them.</p>`;
}

function signatureFacts(e) {
  const facts = gameFacts.get(e.number);
  if (!facts || facts.length !== 3) throw new Error(`Expected three signature facts for element ${e.number}`);
  return `<section class="element-signatures" aria-labelledby="signatures-${e.number}">
    <h2 id="signatures-${e.number}">Three reasons ${e.name} stands out</h2>
    <ol>${facts.map((fact, index) => `<li><span>${index + 1}</span><p>${escape(fact)}</p></li>`).join('')}</ol>
  </section>`;
}

function detail(e) {
  const prev = elements[(e.number + 116) % 118];
  const next = elements[e.number % 118];
  return `<main class="page-container element-detail">
    <nav class="element-breadcrumb" aria-label="Breadcrumb"><a href="/elements">Elements</a><span aria-hidden="true">/</span><span>${e.name}</span></nav>
    <header class="element-hero">${tile(e,true)}<div><p class="element-eyebrow">Element ${e.number} · ${e.family}</p><h1>${e.name}</h1><p>Period ${e.period}${e.y < 9 ? ' · Group ' + e.group : ''}</p></div></header>
    <article class="element-description">
      <p class="element-lede">${escape(e.summary)}</p>
      ${signatureFacts(e)}
      ${chemistryStory(e)}
      ${physicalStory(e)}
      ${discoveryStory(e)}
    </article>
    <table class="element-properties"><caption>${e.name} at a glance</caption><tbody>${propertyRows(e).map(([key,val])=>`<tr><th scope="row">${key}</th><td>${val}</td></tr>`).join('')}</tbody></table>
    <p class="element-data-note">Values are reference data, not a specification for every temperature, pressure, or allotrope. Unknown properties are left unavailable. Superheavy-element predictions remain uncertain.</p>
    <section class="element-sources"><h2>Sources &amp; further reading</h2><p><a href="https://pubchem.ncbi.nlm.nih.gov/element/${e.number}">PubChem: ${e.name}</a> · <a href="${escape(e.source)}">${e.name} on Wikipedia</a></p><p>Introduction and supporting reference data adapted from Wikipedia contributors via <a href="https://github.com/Bowserinator/Periodic-Table-JSON">Periodic-Table-JSON</a>. Element descriptions and their adaptations are available under <a href="https://creativecommons.org/licenses/by-sa/3.0/">CC BY-SA 3.0</a>. Numerical attributes use the <a href="https://pubchem.ncbi.nlm.nih.gov/rest/pug/periodictable/JSON">PubChem periodic-table dataset</a>, retrieved September 22, 2026.</p></section>
    <nav class="element-cycle" aria-label="Browse elements"><a href="${link(prev.number)}" rel="prev"><span>← Previous</span><strong>${prev.number} · ${prev.name}</strong></a><a href="/elements" class="cycle-table">All elements</a><a href="${link(next.number)}" rel="next"><span>Next →</span><strong>${next.number} · ${next.name}</strong></a></nav>
  </main>`;
}

function createElementPages(rootDir) {
  const template = readPage(rootDir, 'how-to-play');
  const render = (main, title, url, description) => template
    .replace(/<main\b[\s\S]*?<\/main>/, () => main)
    .replace(/<title>.*?<\/title>/, () => `<title>${escape(title)} | Elementle</title>`)
    .replace(/<meta name="description" content="[^"]*">/, () => `<meta name="description" content="${escape(description)}">`)
    .replace(/<link rel="canonical" href="[^"]*">/, () => `<link rel="canonical" href="https://elementlegame.com${url}">`)
    .replace('href="/how-to-play" aria-current="page"','href="/how-to-play"')
    .replace('href="/elements">Elements</a>','href="/elements" aria-current="page">Elements</a>')
    .replace(/(href|src)="(styles|scripts|images)\//g, '$1="/$2/')
    .replace('</head>','<link rel="stylesheet" href="/styles/elements.css">\n</head>');
  return {
    overview: render(overview(),'Periodic Table','/elements','Explore all 118 elements in a clickable periodic table, with family colors, detailed descriptions, and atomic properties.'),
    details: new Map(elements.map(e=>[String(e.number),render(detail(e),`${e.name} (${e.symbol}) — Element ${e.number}`,link(e.number),`Explore ${e.name}: atomic number ${e.number}, the ${e.family.toLowerCase()} family, electron configuration, physical properties, and discovery.`)]))
  };
}
module.exports = {createElementPages, elements};
