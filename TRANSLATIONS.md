# Game languages

Account → Settings → Language selects English, French, Spanish, German, Portuguese, Dutch, Turkish, or Polish. Guests can also use the setting. It is saved in this browser (`elementle_language`), not synchronized to an account on the API. English is the default. Portuguese currently uses Brazilian terminology.

The language picker shows flags alongside native language names: 🇬🇧 English, 🇫🇷 Français, 🇪🇸 Español, 🇩🇪 Deutsch, 🇧🇷 Português, 🇳🇱 Nederlands, 🇹🇷 Türkçe, and 🇵🇱 Polski.

`/scripts/i18n.js` loads only the selected static JSON catalog. There are no runtime calls to a translation service. It translates page text, accessible labels, placeholders, and newly rendered panels. Canonical element data, atomic numbers, chemical symbols, URLs, account identifiers, and input values are preserved. Game matching accepts localized names, English names, chemical symbols, and accent-insensitive input. Saved guesses remain canonical and wins/duplicates compare atomic numbers.

The catalogs cover gameplay, all 118 element names and 354 hints, results, help, account screens, statistics, Lab analysis, archives, and element reference pages. Static local dates and number formatting use the selected locale. Unknown API errors fall back to their original message. If a catalog cannot load, the page falls back to English without resetting progress.

## Maintaining translations

Catalogs are `data/i18n-{fr,es,de,pt,nl,tr,pl}.json`, keyed by the original English text. Run `npm run i18n:extract` after changing English copy to refresh `data/i18n-source.json`, then update all seven catalogs. A `{0}` or `{1}` placeholder must remain intact, though its position can change in translation. Preserve emoji, arrows, and status symbols from the English source, including emoji variation selectors. Do not put HTML in translations. Use `translate="no"` around player-provided content and scientific notation. Explicitly localized autocomplete names use this attribute to avoid translating them again.

Run `npm run test:i18n` to verify catalog coverage, all element names and hints, placeholder integrity, matching, autocomplete, dynamic updates, settings persistence, denied storage, and game-progress preservation. The existing gameplay, stats, analysis, and billing suites also exercise the affected screens.

Translations were initially machine-generated (Dutch uses a local OPUS-MT model) and require native-speaker review, especially scientific prose and legal text. Element names received corrections for chemistry rather than place/person/planet meanings. Naming references include the [French Chemical Society](https://new.societechimiquedefrance.fr/le-nihonium-le-moscovium-la-tenessine-et-loganesson-font-leur-entree-officielle-dans-le-tableau-periodique/), [German Chemical Society](https://www.gdch.de/my/article/die-vier-neuen-nihonium-moscovium-tenness-und-oganesson-4077083), [Brazilian Chemical Society periodic table](https://www.sbq.org.br/wp-content/uploads/2023/11/tabela-periodica_SBQ_3.0_set2023.pdf), and [FundéuRAE Spanish naming guidance](https://www.fundeu.es/recomendacion/teneso-y-oganeson-mejor-que-tenesino-y-oganesson/).

Turkish and Polish were added with machine-translated catalogs and reviewed element names and key controls. Input matching also accepts Turkish dotless ı as i and Polish ł as l. Scientific naming references: [TÜBİTAK periodic table](https://bilimgenc.tubitak.gov.tr/periyodik-tablo) and [Polish educational periodic table](https://zpe.gov.pl/a/uklad-okresowy-pierwiastkow/DYjZOiKZ3).
