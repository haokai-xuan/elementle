# Element reference data

`element-reference.json` contains the 118 named elements used by Elementle.

- Numerical attributes: [PubChem periodic table JSON](https://pubchem.ncbi.nlm.nih.gov/rest/pug/periodictable/JSON), retrieved 2026-09-22. Temperatures are kelvin; density is g/cm³; atomic radius is pm; ionization energy and electron affinity are eV. Empty strings are unavailable values. Atomic masses for radioactive elements may refer to selected isotopes rather than standard atomic weights.
- Introductions, discovery credits, and table coordinates: [Bowserinator/Periodic-Table-JSON](https://github.com/Bowserinator/Periodic-Table-JSON), retrieved 2026-09-22. Its summaries originate from Wikipedia; each record includes the corresponding article URL. This material and the adapted element descriptions are licensed under [Creative Commons Attribution-ShareAlike 3.0 Unported](https://creativecommons.org/licenses/by-sa/3.0/). See the [source license](https://github.com/Bowserinator/Periodic-Table-JSON/blob/master/LICENSE.md).
- Names, symbols, and family colors/classifications follow the existing Elementle game data. The source's hypothetical element 119 is excluded. Some chemical-family conventions differ; each detail page also reports PubChem's classification.

Adaptations include added explanatory paragraphs, integration of PubChem attributes, explicit unavailable/predicted-property notes, pressure qualifications for helium/carbon phase changes, and the game's family labels. No source photographs or other media are redistributed.

Descriptions and data are bundled locally, so element pages do not make runtime requests to these services. Update this snapshot deliberately when revising scientific content.
