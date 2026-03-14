# Codex-prompti: Kadence Pro → Eleventy/Nunjucks korjaukset

Kopioi kaikki alla oleva Codexille sellaisenaan.

---

## PROMPTI CODEXILLE

Tässä projektissa on Eleventy + Nunjucks -sivusto. Tee seuraavat muutokset täsmälleen kuvatulla tavalla. Älä tee mitään muita muutoksia.

---

### KORJAUS 1 — Poista rikkinäiset triple-nested CSS-värimuuttujat kaikista content-tiedostoista

Etsi kaikista tiedostoista hakemistossa `content/` kaikki esiintymät, joissa `color`-attribuutin arvo on muodossa:

```
var(--global-var(--global-var(--global-paletteX)))
```

Korvaa ne muodolla:

```
var(--global-paletteX)
```

Esimerkkejä:
- `"var(--global-var(--global-var(--global-palette1)))"` → `"var(--global-palette1)"`
- `"var(--global-var(--global-var(--global-palette9)))"` → `"var(--global-palette9)"`

Tarkista kaikki `.njk`-tiedostot hakemistoissa `content/pages/` ja `content/posts/`.

---

### KORJAUS 2 — Korjaa `advancedheading.njk` käsittelemään fontSize-taulukko oikein

Korvaa tiedoston `_includes/blocks/kadence/advancedheading.njk` koko sisältö seuraavalla:

```nunjucks
{# kadence/advancedheading — Heading with configurable tag level, alignment and color #}
{% set b = kadenceBlock.attrs %}
{% set tag = "h" ~ (b.level if b.level else 2) %}
{% if b.fontSize %}
  {% if b.fontSize[0] is defined and b.fontSize[0] != "" %}
    {% set fsRaw = b.fontSize[0] %}
  {% else %}
    {% set fsRaw = b.fontSize %}
  {% endif %}
  {% if fsRaw == "sm" %}{% set fsCss = "0.875rem" %}
  {% elif fsRaw == "md" %}{% set fsCss = "1rem" %}
  {% elif fsRaw == "lg" %}{% set fsCss = "1.25rem" %}
  {% elif fsRaw == "xl" %}{% set fsCss = "1.75rem" %}
  {% elif fsRaw == "xxl" %}{% set fsCss = "2.25rem" %}
  {% elif fsRaw == "3xl" %}{% set fsCss = "3rem" %}
  {% else %}{% set fsCss = fsRaw %}{% endif %}
{% endif %}
<{{ tag }}
  class="wp-block-kadence-advancedheading kb-adv-heading kadence-block kadence-advancedheading{% if b.uniqueID %} kt-adv-heading_{{ b.uniqueID }}{% endif %}{% if b.className %} {{ b.className }}{% endif %}"
  {% if b.align or b.color or fsCss or b.textTransform or b.fontWeight %}style="{% if b.align %}text-align:{{ b.align }};{% endif %}{% if b.color %} color:{{ b.color }};{% endif %}{% if fsCss %} font-size:{{ fsCss }};{% endif %}{% if b.textTransform %} text-transform:{{ b.textTransform }};{% endif %}{% if b.fontWeight %} font-weight:{{ b.fontWeight }};{% endif %}"{% endif %}
>{{ kadenceInnerHtml | safe }}</{{ tag }}>
```

---

### KORJAUS 3 — Korjaa listitem-sisällöt tiedostossa `content/pages/home.njk`

Tiedostossa `content/pages/home.njk` on kolme `kadence/listitem`-lohkoa. Niiden `kadenceInnerHtml`-muuttujat alkavat virheellisesti fragmentilla `</span><span class="kt-svg-icon-list-text">`. Template lisää nämä tagit itse, joten sisällössä ei pidä olla niitä.

Etsi kolme listitem-lohkoa ja poista jokaisen `kadenceInnerHtml`-sisällöstä alusta pois teksti `</span><span class="kt-svg-icon-list-text">`. Jätä vain pelkkä suomenkielinen teksti.

Korjattujen lohkojen tulee näyttää tältä:

```nunjucks
{% set kadenceInnerHtml %}
Turvallisuuden, kontrollin ja vapaan tahdon tunteen heikkeneminen dataistuneessa yhteiskunnassa
{% endset %}
{% include "blocks/kadence/listitem.njk" %}

{% set kadenceInnerHtml %}
Luottamuksen heikkeneminen viranomaisiin, tiedotusvälineisiin, tieteeseen, kansalaisyhteiskuntaan ja kansalaisiin sekä
{% endset %}
{% include "blocks/kadence/listitem.njk" %}

{% set kadenceInnerHtml %}
Nopeasti kasvava eriarvoisuus, joka liittyy alati muuttuvan tieto- ja viestintätekniikan hallintaan ja toimijuuteen.&nbsp;&nbsp;
{% endset %}
{% include "blocks/kadence/listitem.njk" %}
```

Sama periaate koskee kaikkia muitakin sivuja: `kadenceInnerHtml` saa sisältää vain tekstin, ei koskaan HTML-tageja joita template itse lisää.

---

### KORJAUS 4 — Luo posts-kokoelma Eleventy-directory-datalla

Luo uusi tiedosto `content/posts/posts.json` seuraavalla sisällöllä (täsmälleen tämä, ei mitään muuta):

```json
{
  "tags": ["posts"],
  "layout": "layouts/post.njk"
}
```

Tämä tekee `collections.posts`-kokoelmasta toimivan, jolloin `postgrid`-lohkot näyttävät artikkelit.

---

### KORJAUS 5 — Poista kuollut WordPress-linkki `content/pages/home.njk`-tiedostosta

Tiedostossa `content/pages/home.njk` on rivi:

```html
<p><a href="/?page_id=420"></a></p>
```

Poista tämä rivi kokonaan.

---

### TARKISTUS — Kun kaikki muutokset on tehty

Aja `npx @11ty/eleventy --serve` ja varmista:

1. Ei build-virheitä konsolissa
2. Etusivulla (`/`) näkyvät kaikki osiot oikeilla taustaväreillä
3. Kolme postgrid-lohkoa näyttää artikkeleita (ei tyhjiä)
4. Iconlist näyttää kolme kohtaa checkmark-ikonilla ilman tuplattuja span-elementtejä
5. Selaimen DevToolsissa ei esiinny `var(--global-var(` tai `font-size:xl,,` merkkijonoja
