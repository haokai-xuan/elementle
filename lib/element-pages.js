const { readPage } = require('./page-template');
const elements = require('../data/element-reference.json');
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

function detail(e) {
  const a = e.attributes;
  const prev = elements[(e.number + 116) % 118];
  const next = elements[e.number % 118];
  const position = e.y >= 9 ? `the ${e.family.toLowerCase()} series in period ${e.period}` : `group ${e.group} in period ${e.period}`;
  const electronText = a.ElectronConfiguration.includes('predicted') || e.number >= 104
    ? `Electron configurations for the heaviest elements are partly or wholly based on theoretical work. At these high nuclear charges, relativistic effects can change how electrons behave, so extrapolating directly from lighter relatives can be misleading.`
    : `The electron configuration listed below describes how a neutral ${e.name.toLowerCase()} atom’s electrons occupy its orbitals. Outer electrons participate most directly in bonding, while inner electrons help shield them from the nucleus. An ion has gained or lost electrons, so its charge and chemical behavior differ from those of the neutral atom.`;
  const oxidation = a.OxidationStates
    ? `Reported oxidation states include ${a.OxidationStates}. These numbers are a way to keep track of electrons in compounds; they are not a list of equally common or equally stable substances.`
    : `A reliable set of oxidation states is not supplied in this reference. Missing values indicate a limit in the available data, rather than a value of zero or proof that compounds cannot form.`;
  const history = a.YearDiscovered === 'Ancient'
    ? `${e.name} was known in some form in antiquity. Knowing and using a substance predates the modern understanding of atoms, and the isolation of a pure element may have come much later. The dates attached to element discoveries often distinguish between first observation, recognition as an element, and successful isolation.`
    : `PubChem lists ${a.YearDiscovered || 'no single year'} for the discovery of ${e.name.toLowerCase()}.${e.discoveredBy ? ` The accompanying element summary credits ${e.discoveredBy}.` : ''} A discovery date can refer to the identification of a new substance, its isolation, or the production of atoms in a laboratory; those milestones do not always happen at the same time.`;
  return `<main class="page-container element-detail">
    <nav class="element-breadcrumb" aria-label="Breadcrumb"><a href="/elements">Elements</a><span aria-hidden="true">/</span><span>${e.name}</span></nav>
    <header class="element-hero">${tile(e,true)}<div><p class="element-eyebrow">Element ${e.number} · ${e.family}</p><h1>${e.name}</h1><p>Period ${e.period}${e.y < 9 ? ' · Group ' + e.group : ''}</p></div></header>
    <article class="element-description">
      <p class="element-lede">${escape(e.summary)}</p>
      <h2>Atomic structure and chemistry</h2>
      <p>${e.name} occupies ${position}. Its atomic number, ${e.number}, is the number of protons in its nucleus; a neutral atom also has ${e.number} electrons. Isotopes retain this proton count but differ in their numbers of neutrons. Changing the number of protons would produce a different element, whereas changing the number of electrons produces an ion.</p>
      <p>${escape(families[e.family][1])}</p>
      <p>${escape(electronText)} ${escape(oxidation)}</p>
      <h2>Discovery and physical properties</h2><p>${escape(history)}</p>
      <p>${e.number >= 99 ? 'Only small quantities of this radioactive element are available for study. Many bulk properties cannot be measured directly, and estimated properties should not be read as observations of an ordinary sample.' : `The physical properties below describe ${e.name.toLowerCase()} using values compiled by PubChem. Temperature, pressure, crystal form, and isotopic composition can affect a measurement; a single tabulated number does not describe every possible sample.`} Atomic mass is distinct from atomic number. For elements without a standard atomic weight, the listed mass refers to a selected isotope rather than an average for a naturally occurring mixture.</p>
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
