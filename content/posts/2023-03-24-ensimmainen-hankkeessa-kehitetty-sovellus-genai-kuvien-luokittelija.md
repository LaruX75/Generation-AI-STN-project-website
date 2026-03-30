---
title: 'Ensimmäinen hankkeessa kehitetty sovellus: GenAI opetettava kone'
date: '2023-03-24T16:53:18'
updated: '2023-09-21T14:26:14'
slug: ensimmainen-hankkeessa-kehitetty-sovellus-genai-kuvien-luokittelija
permalink: >-
  /ajankohtaista/ensimmainen-hankkeessa-kehitetty-sovellus-genai-kuvien-luokittelija/
status: publish
sourceType: posts
excerpt: >-
  Hankkeessa kehitetään erilaisia työkaluja ja välineitä, jotka on suunnattu
  erityisesti lasten ja nuorten käyttöön. Ensimmäinen työkalu on ”GenAI
  opetettava kone”, joka on yksinkertaistettu esimerkki ohjatusta
  koneoppimisesta. Sovellus on toteutettu siten, että siihen ladattuja kuvia ei
  siirretä muualle www-selaimesta. Se on kaupallisia verrokkejaan turvallisempi
  tapa lähestyä koneoppimisen ja tekoälyn maailmaa juuri tästä syystä.
  Koneoppiminen arjessamme: Tämä…
mainCategory: Toiminta
subCategories:
  - Luokittelija
extraCategories:
  - Hankkeen toiminta
  - Sovellukset
tags:
  - GenAi kuvien luokittelija
  - koneoppiminen
  - luokittelija
  - ohjattu koneoppiminen
  - Teachable Machine
  - tekoäly
author: admin
layout: layouts/post.njk
---

<p>Hankkeessa kehitetään erilaisia työkaluja ja välineitä, jotka on suunnattu erityisesti lasten ja nuorten käyttöön. Ensimmäinen työkalu on &#8221;GenAI opetettava kone&#8221;, joka on yksinkertaistettu esimerkki ohjatusta koneoppimisesta. </p>



<p>Sovellus on toteutettu siten, että siihen ladattuja kuvia ei siirretä muualle www-selaimesta. Se on  kaupallisia verrokkejaan turvallisempi tapa lähestyä koneoppimisen ja tekoälyn maailmaa juuri tästä syystä.</p>



<div class="wp-block-buttons is-content-justification-center is-layout-flex wp-container-core-buttons-is-layout-16018d1d wp-block-buttons-is-layout-flex">
<div class="wp-block-button"><a class="wp-block-button__link wp-element-button" href="https://tm.generation-ai-stn.fi">Käynnistä GenAI kuvien luokittelija tästä</a></div>
</div>



<h2 class="wp-block-heading">Koneoppiminen arjessamme:</h2>



<ul class="wp-block-list">
<li>Jyväskylän yliopiston oppimateriaali &#8221;tekoälyn perusteita ja sovelluksia&#8221; <a href="https://tim.jyu.fi/view/kurssit/tie/tiep1000/tekoalyn-sovellukset/kirja#DKUvbnUuGytQ" title="">https://tim.jyu.fi/view/kurssit/tie/tiep1000/tekoalyn-sovellukset/kirja#DKUvbnUuGytQ</a></li>



<li>Salesforce: <a>Koneoppiminen: 6 esimerkkiä, jotka muuttavat työelämää</a>. <a href="https://www.salesforce.com/fi/blog/2021/koneoppiminen-konkreettiset-esimerkit.html" title="">https://www.salesforce.com/fi/blog/2021/koneoppiminen-konkreettiset-esimerkit.html</a></li>



<li>9 Applications of Machine Learning from Day-to-Day Life <a href="https://medium.com/app-affairs/9-applications-of-machine-learning-from-day-to-day-life-112a47a429d0" title="">https://medium.com/app-affairs/9-applications-of-machine-learning-from-day-to-day-life-112a47a429d0 </a></li>
</ul>



<h2 class="wp-block-heading">Tämä sovellus on itse asiassa luokittelija</h2>



<blockquote class="wp-block-quote is-layout-flow wp-block-quote-is-layout-flow">
<p>Koneoppimisen osalta keskitymme tällä kurssilla pääasiassa ohjattuun koneoppimiseen ja etenkin sen yhteen osa-alueeseen eli luokitteluun. Luokittelussa havaitsemme syötteen, kuten liikennemerkin kuvan, ja yritämme päätellä sen luokan, kuten liikennemerkin tarkoituksen. Muita luokitteluongelmia ovat valetilien tunnistaminen Twitterissä (syötteenä voi olla luettelo seuraajista ja tieto siitä, kuinka nopeasti seuraajat ovat kertyneet ja luokka on joko ”valetili” tai ”aito tili”) sekä käsin kirjoitettujen numeroiden tunnistus (syöte on kuva ja luokka on numero välillä 0, 1, &#8230;, 9).</p>
<cite>Elements of AI verkkokurssin koneoppimista käsittelevän sivun luokittelua käsittelevä osio <a href="https://course.elementsofai.com/fi/4/1" title="">https://course.elementsofai.com/fi/4/1</a></cite></blockquote>



<h2 class="wp-block-heading">Sovelluksen käyttöliittymä</h2>



<p>Käytännössä käyttäjä opettaa tekoälysovellusta ohjatusti opetusdatan avulla. Opetusdata on aineistoa, jonka käyttäjä valmistelee itse. Käytännössä tämän sovelluksen aineistoa ovat kuvat, jotka voi hakea internetin kuvakirjastoista tai kuvata webkameran avulla. </p>



<p><em>Huom! Sovellus on suunniteltu siten, että sitä voi käyttää tietokoneen ohella myös tabletilla ja puhelimella.</em></p>



<div class="wp-block-buttons is-content-justification-center is-layout-flex wp-container-core-buttons-is-layout-16018d1d wp-block-buttons-is-layout-flex">
<div class="wp-block-button"><a class="wp-block-button__link wp-element-button" href="https://tm.generation-ai-stn.fi">Käynnistä GenAI opetettava kone tästä</a></div>
</div>



<h3 class="wp-block-heading">A. Päänäkymä: GenAI opetettava kone </h3>



<p>Tämä päänäkymä sisältää viisi eri vaihetta, jotka ohjaavat käyttäjää tekemään ohjatun koneoppimisen mallin. Nämä vaiheet on kuvattu alla kuvakaappausten kera.</p>



<p>Huom! Luokittelijasovelluksen yläosassa on tallennuspainike, jonka avulla luokittelijan voi tallentaa paikallisesti koneelle!</p>



<figure class="wp-block-image size-large"><img loading="lazy" decoding="async" width="1024" height="658" src="https://www.generation-ai-stn.fi/wp-content/uploads/2023/04/Luokittelija_A-1024x658.png" alt="" class="wp-image-540" srcset="https://www.generation-ai-stn.fi/wp-content/uploads/2023/04/Luokittelija_A-1024x658.png 1024w, https://www.generation-ai-stn.fi/wp-content/uploads/2023/04/Luokittelija_A-300x193.png 300w, https://www.generation-ai-stn.fi/wp-content/uploads/2023/04/Luokittelija_A-768x494.png 768w, https://www.generation-ai-stn.fi/wp-content/uploads/2023/04/Luokittelija_A-1536x988.png 1536w" sizes="auto, (max-width: 1024px) 100vw, 1024px" /><figcaption class="wp-element-caption">GenAI sovelluksen päänäkymä</figcaption></figure>



<div class="wp-block-media-text alignwide is-stacked-on-mobile is-style-tw-shadow" style="grid-template-columns:24% auto"><figure class="wp-block-media-text__media"><img loading="lazy" decoding="async" width="276" height="598" src="https://www.generation-ai-stn.fi/wp-content/uploads/2023/04/opetusdata.png" alt="" class="wp-image-543 size-full" srcset="https://www.generation-ai-stn.fi/wp-content/uploads/2023/04/opetusdata.png 276w, https://www.generation-ai-stn.fi/wp-content/uploads/2023/04/opetusdata-138x300.png 138w" sizes="auto, (max-width: 276px) 100vw, 276px" /></figure><div class="wp-block-media-text__content">
<h4 class="wp-block-heading">1. Vaihe: luokkien luominen ja opetusdatan lisääminen</h4>



<p>Yllä olevassa kuvassa on yksinkertainen kivi-paperi-sakset esimerkki, josta jokainen ymmärtää että sen aineisto jakautuu kolmeen kategoriaan (luokka): kivi, paperi ja sakset. Lisäksi on neljäs luokka, tyhjä, jossa ei ole kiveä, paperia tai saksia. Tämä muodostaa kokonaisuudessaan opetusdatan, jota käytetään tekoälyn opettamiseen. Toimi näin:</p>



<ul class="wp-block-list">
<li>Jaa tekoälylle opetettava aineisto luokkiin, joita voivat olla esim. tyhjä, sakset, paperi, kivi. </li>



<li>Lisää luokat GenAI sovellukseen ja nimeä ne.</li>



<li>Tuo jokaiseen luokkaan riittävä määrä opetusdataa, jonka avulla tekoäly tulee oppimaan miltä esim. kivi-paperi-sakset esimerkin kivi näyttää. Tämän voi tehdä kameran tai valmiiden kuvien avulla.</li>
</ul>
</div></div>



<div class="wp-block-media-text alignwide has-media-on-the-right is-stacked-on-mobile is-style-tw-shadow" style="grid-template-columns:auto 24%"><div class="wp-block-media-text__content">
<h4 class="wp-block-heading">2. Vaihe: opeta koneoppimismallille vaiheessa 1. lisätty aineisto</h4>



<p>GenAI luokittelijan tekoäly perustuu ohjattuun oppimiseen. Hetki sitten loit luokat ja toit niihin tarvittavan opetusdatan. Tässä vaiheessa tekoäly opetetetaan tunnistamaan erot ja yhtäläisyydet eri luokkiin jaetun aineiston välillä. Sinun ei tarvitse tehdä muuta kuin painaa painiketta.</p>



<ul class="wp-block-list">
<li>Paina painiketta &#8221;opeta luokittelija&#8221; ja odota kunnes &#8221;luokittelija opetettu&#8221; tulee näkyville.</li>
</ul>
</div><figure class="wp-block-media-text__media"><img loading="lazy" decoding="async" width="200" height="147" src="https://www.generation-ai-stn.fi/wp-content/uploads/2023/04/opetaluokittelija.png" alt="" class="wp-image-542 size-full"/></figure></div>



<div class="wp-block-media-text alignwide is-stacked-on-mobile is-style-tw-shadow" style="grid-template-columns:24% auto"><figure class="wp-block-media-text__media"><img loading="lazy" decoding="async" width="200" height="444" src="https://www.generation-ai-stn.fi/wp-content/uploads/2023/04/syote.png" alt="" class="wp-image-541 size-full" srcset="https://www.generation-ai-stn.fi/wp-content/uploads/2023/04/syote.png 200w, https://www.generation-ai-stn.fi/wp-content/uploads/2023/04/syote-135x300.png 135w" sizes="auto, (max-width: 200px) 100vw, 200px" /></figure><div class="wp-block-media-text__content">
<h4 class="wp-block-heading">3. Vaihe: tarkista kuinka hetki sitten opettamasi luokittelija toimii?</h4>



<p>Nyt on aika tutkia kuinka ohjatusti opetettu koneoppimismalli toimii? Osaako se erottaa kiven, paperin ja sakset toisistaan? Sen näkee helposti &#8221;syöte&#8221; kameraikkunan alla olevista prosenttipalkeista. Voit palata vaiheeseen 1. ja parantaa opetusdataa, jos tunnistus ei ole varmaa tai se jopa tunnistaa väärin. Jos muutat opetusdataa, sinun tulee myös opettaa painamalla &#8221;opeta luokittelija&#8221;</p>



<ul class="wp-block-list">
<li>Jotta tiedät toimiiko tekoäly oikein, sitä tulee testata. Testaaminen tehdään näyttämällä mallille jokin uusi kuva luokiteltujen sisältöjen aihepiireistä. Käyttöliittymäkuvassa olen näyttänyt sormillani &#8221;saksi&#8221; eleen kameralle (näkyy kohdassa syöte).</li>



<li>Katso luokittelun varmuus &#8221;syöte&#8221; ruudun alla olevista prosenttipalkeista. Voit tarvittaessa korjata malliasi palaamalla takaisin opetusaineiston pariin (vaihe 1) ja opettamalla tekoälyn uudelleen (vaihe 2)</li>



<li>Kun olet luokittelijan toimintaan tyytyväinen, paina &#8221;next / seuraava&#8221;  ja siirry seuraavaan vaiheeseen</li>
</ul>
</div></div>



<div class="wp-block-media-text alignwide has-media-on-the-right is-stacked-on-mobile is-vertically-aligned-top is-style-tw-shadow" style="grid-template-columns:auto 24%"><div class="wp-block-media-text__content">
<h4 class="wp-block-heading">4. vaihe: Suunnittele kuinka luokittelija reagoi havaintoonsa</h4>



<p>Tässä vaiheessa voit suunnitella kuinka luokittelija reagoi havaittuaan syötteessä luokiteltua tietoa. Esim. voit suunnitella kuinka GenAI luokittelija reagoi havaittuaan sakset, paperin, kiven tai sakset? </p>



<p>Voit lisätä seuraavia sisältöjä:</p>



<ul class="wp-block-list">
<li><em>Kuva:</em> voit lisätä (tai raahata) kuvan, joka voi olla myös animoitu gif</li>



<li><em>Ääni</em>: voit lisätä tai tallentaa äänitiedoston</li>



<li><em>Teksti</em>: voit lisätä tekstiä ja muotoilla sitä perustyökaluilla</li>



<li><em>Linkki:</em> voit lisätä esim. youtube-videon tai muun www-sisällön (estetty, kun asetus on 4-9 lk sovelluksen asetuksissa)</li>
</ul>
</div><figure class="wp-block-media-text__media"><img loading="lazy" decoding="async" width="214" height="785" src="https://www.generation-ai-stn.fi/wp-content/uploads/2023/04/toiminta.png" alt="" class="wp-image-544 size-full" srcset="https://www.generation-ai-stn.fi/wp-content/uploads/2023/04/toiminta.png 214w, https://www.generation-ai-stn.fi/wp-content/uploads/2023/04/toiminta-82x300.png 82w" sizes="auto, (max-width: 214px) 100vw, 214px" /></figure></div>



<div class="wp-block-media-text alignwide is-stacked-on-mobile is-style-tw-shadow" style="grid-template-columns:24% auto"><figure class="wp-block-media-text__media"><img loading="lazy" decoding="async" width="280" height="325" src="https://www.generation-ai-stn.fi/wp-content/uploads/2023/04/tulos.png" alt="" class="wp-image-545 size-full" srcset="https://www.generation-ai-stn.fi/wp-content/uploads/2023/04/tulos.png 280w, https://www.generation-ai-stn.fi/wp-content/uploads/2023/04/tulos-258x300.png 258w" sizes="auto, (max-width: 280px) 100vw, 280px" /></figure><div class="wp-block-media-text__content">
<h4 class="wp-block-heading">5. vaihe: Tulos </h4>



<p>Tämä &#8221;tulos&#8221; ikkuna sisältää esikatselun sille miltä eri toiminnot näyttävät. Kuvassa luokittelija on tunnistanut &#8221;sakset&#8221; eleen ja näyttää sekä sakset gif animaationa että tekstinä.</p>



<ul class="wp-block-list">
<li>Huom! Kun painat &#8221;deploy&#8221; painiketta, siirrytään koko ruudun käyttötilaan.</li>
</ul>
</div></div>



<h3 class="wp-block-heading">B. Lopetusnäkymä: tekoäly piilotettuna</h3>



<div class="wp-block-media-text alignwide has-media-on-the-right is-stacked-on-mobile is-style-tw-shadow" style="grid-template-columns:auto 34%"><div class="wp-block-media-text__content">
<h4 class="wp-block-heading">&#8221;Sovellus&#8221; kokoruudun tilassa ja tekoäly piilotettuna</h4>



<p>Koko ruudun tilassa itse varsinainen tekoäly on jo piilossa ihan samalla tavalla kuin se on piilossa esim. robotti-imurissa, sosiaalisessa mediassa tai vaikkapa autossa.</p>



<ul class="wp-block-list">
<li>Voit käyttää koneoppimismallia joko webkameran tai kuvatiedostojen avulla (alaosan palkki). </li>



<li>Webkameran käyttöä helpottamassa on kameran esikatseluikkuna</li>



<li>Lisäksi voit säätää äänenvoimakkuutta.</li>
</ul>
</div><figure class="wp-block-media-text__media"><img loading="lazy" decoding="async" width="698" height="684" src="https://www.generation-ai-stn.fi/wp-content/uploads/2023/04/deploy.png" alt="" class="wp-image-546 size-full" srcset="https://www.generation-ai-stn.fi/wp-content/uploads/2023/04/deploy.png 698w, https://www.generation-ai-stn.fi/wp-content/uploads/2023/04/deploy-300x294.png 300w" sizes="auto, (max-width: 698px) 100vw, 698px" /></figure></div>



<div class="wp-block-buttons is-content-justification-center is-layout-flex wp-container-core-buttons-is-layout-16018d1d wp-block-buttons-is-layout-flex">
<div class="wp-block-button"><a class="wp-block-button__link wp-element-button" href="https://tm.generation-ai-stn.fi">Käynnistä GenAI kuvien luokittelija tästä</a></div>
</div>



<p></p>
