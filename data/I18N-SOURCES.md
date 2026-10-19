# Translation notes

The Modern Standard Arabic (`ar`), Vietnamese (`vi`), Simplified Chinese (`zh`), Korean (`ko`), and Japanese (`ja`) catalogs cover the same English source strings as the existing catalogs. Drafts use machine translation with curated interface labels and element terminology. Native-language editorial review is still useful for longer reference passages.

Element names for Modern Standard Arabic, Vietnamese, Simplified Chinese, Korean, and Japanese were checked against the corresponding [Ptable](https://ptable.com/) tables: [Arabic](https://ptable.com/?lang=ar), [Vietnamese](https://ptable.com/?lang=vi), [Simplified Chinese](https://ptable.com/?lang=zh-hans), [Korean](https://ptable.com/?lang=ko), and [Japanese](https://ptable.com/?lang=ja), accessed October 18, 2026. Chinese names for the newest elements are also documented by the [China National Committee for Terms in Sciences and Technologies](https://www.cnterm.cn/kxcb/kpwz/201810/t20181029_758620.html).

Machine-translation drafts use the public Google Translate service. The application loads static JSON catalogs and has no runtime dependency on a translation provider.

Element symbols, electron configurations, units, brands, and interpolation placeholders retain their canonical forms. Localized element names are display/input aliases; saved games and API payloads continue to use canonical element identifiers.

Run `npm run test:i18n` when changing public copy. It checks fresh source extraction against the registry, verifies every catalog and placeholder, exercises all elBot explanation branches in every language, and audits rendered public pages. After intentional copy changes, run `npm run i18n:extract` and map new sources in every catalog.
