const rows = [
  ["Innokas-verkosto, Tekoalya Nyt! hanke", "AI! Kokemuksia tekoalysta viestimisesta", "25", "10.10.2022", "Heureka"],
  ["Ita-Suomen aluehallintovirasto", "Tekoaly: Mahdollisuuksia, haasteita ja eettisia kysymyksia", "8", "12.10.2022", "MT, HV"],
  ["In/Equalities in digitalised society -symposiumi", "Towards Educating the Generation AI", "20", "12.1.2023", "MT"],
  ["UEF pedajohtajaverkosto", "Generatiivinen tekoaly: Yleisia suuntaviivoja opetuksessa", "15", "10.2.2023", "MT, TV"],
  ["Tyo- ja elinkeinoministerio", "Tekoaly4.0 -ohjelman loppuseminaari", "150", "10.2.2023", "TR"],
  ["ITK-webinaari", "Generation AI", "N", "28.3.2023", "MT, JL, HV"],
  ["Tyo- ja elinkeinoministerio", "Esihenkilofoorumi: Tekoalytiedetta ChatGPT:n taustalla", "50", "31.3.2023", "TR"],
  ["FCLab.fi ja eNorssi", "Tekoaly vai tukialy - tekoaly opettamisen ja oppimisen tyokaluna", "230", "4.4.2023", "JL, HV"],
  ["Oulun yliopisto Oppiminen ja oppimisprosessi tutkimusyksikko", "Latest technologies in learning and teaching", "30", "5.4.2023", "JL"],
  ["Valtakunnallinen DigiErko-verkosto", "Avaintaitoja automaation aikakaudella", "14", "11.4.2023", "HV"],
  ["ITK-paivat: Keynote", "Mita tietokone ei osaa tehda? Vaarien kasitysten historia", "480", "20.4.2023", "MT"],
  ["ITK-paivat: Roundtable", "Generation AI", "450", "21.4.2023", "Kaikki"],
  ["Tekoaly hoi, ala jata! Opportunities of AI in Higher Education (NOSTE/UO/Digivisio 2030)", "Panel discussion: AI powered teaching and learning", "100", "28.4.2023", "KM"],
  ["sivistys- ja kulttuuripalvelu Oulu", "tekoalyn mahdollisuuksista koulutuksessa", "30", "2.5.2023", "MI, SM"],
  ["Opettajankouluttajat (JKL): Tulevaisuus Haastaa Oppimisen", "Tekoaly vai tukialy? Uhka vai mahdollisuus? - Miksi Generation AI project on tarkea tassa ajassa?, Tekoaly oppimisen kohteena ja luovan toiminnan lahteena", "80", "2.5.2023", "MT, HV"],
  ["DigiErko: Oppiminen ja opettaminen digitaalisissa ymparistoissa", "Tekoaly opetuksessa", "N", "3.5.2023", "MT, HV, JK"],
  ["UED pedagogiikkaryhma", "Generatiivinen tekoaly: Yleisia suuntaviivoja opetuksessa", "50", "8.5.2023", "MT, TV"],
  ["Helsingin kaupungin kasvatuksen ja koulutuksen toimiala", "Oppimisen digikarnevaali: Generation AI-hankkeen esittely + TR paneelikeskustelussa", "150", "11.5.2023", "TR, KS, SD"],
  ["Punomo (Kasityo verkossa ry)", "Tekoaly tuotesuunnittelussa -webinaari", "40", "15.5.2023", "MT, HV"],
  ["UEF johtoryhma", "Generatiivinen tekoaly: Yleisia suuntaviivoja opetuksessa", "15", "16.5.2023", "MT, TV"],
  ["Etela-Karjalan opettajien taydennyskoulutus", "TVT-, ohjelmointi ja medialukutaidot tekoalyn murroksessa", "60", "17.5.2023", "MT"],
  ["UEF opettajankoulutus", "Tekoaly opetuksessa", "74", "31.5.2023", "MT, HV"],
  ["UEF opettajankoulutus", "Tekoaly opetuksessa työpaja", "36", "31.5.2023", "MT, HV"],
  ["MyData Conference 2023", "Profiling users and predicting behaviour using machine learning", "50", "1.6.2023", "TR"],
  ["UpCERG (Uppsala University)", "Humanization of Computing and Engineering Education Symposium", "25", "8.6.2023", "MT"],
  ["Oulun kaupungin STEAM-ohjausryhma", "GenAI-hankkeen esittely + tekoalyn STEAMiin yhdistaminen", "13", "12.6.2023", "MI"],
  ["ACM ITiCSE 2023 -konferenssi: Poster", "Generation AI: Participatory Machine Learning Co-Design Projects with K-9 Students in Finland", "n", "10.7.2023", "KM, MI"],
  ["ACM ITiCSE 2023 -konferenssi: Keynote", "K-12 Computing Education for the AI Era: From Data Literacy to Data Agency", "257", "10.7.2023", "MT, HV"],
  ["Lukion Veso-paivat: Vesanto & Siilinjarvi", "Tekoaly opetuksessa: Suuntaviivoja", "15", "8.8.2023", "MT"],
  ["Oppimisymparistoseminaari 2023", "Tekoaly oppimisen kohteena ja luovan toiminnan lahteena", "167", "21.8.2023", "HV, MT"],
  ["UNIC CityLabs Lightning Bites Live Session", "Lightning Bites: AI literacy", "162", "12.9.2023", "JL"],
  ["Opetushallitus ja OKM", "GenAI esitys ennen pyorean poydan keskustelua", "20", "19.9.2023", "JL"],
  ["Union of the Baltic Cities, Education Conference, Turku", "Artificial Intelligence Workshop", "76", "20.9.2023", "JL"],
  ["Helsingin kaupungin kasvatuksen ja koulutuksen toimiala, perusopetuksen rehtorit", "Generatiivinen tekoaly perusopetuksessa: Haasteita ja mahdollisuuksia", "130", "21.9.2023", "KK, SD"],
  ["Tutkijoiden yo 2023 / OY, Oulu", "Opetettava kone - työpaja", "200", "29.9.2023", "JL, MI, KM, SMT"],
  ["Digikarnevaali SIKU/Oulu 2023/paneelikeskustelu", "Keskustelua tekoalysta: Jari Laru/OY / Vesa Ayras, Microsoft ja tekoaly", "100", "4.10.2023", "JL"],
  ["Digikarnevaali SIKU/Oulu 2023/tyopaja", "GenAI opetettava kone - työpaja", "45", "4.10.2023", "MI"],
  ["Tyttojen paiva 2023/Oulu", "Tyopaja: opeta konetta (tekoalya)", "30", "12.10.2023", "JL, MI, KM"],
  ["Lukion Veso-paivat: Joensuu", "Tekoaly, opetus ja oppiminen", "100", "8.8.2023", "IJ"],
  ["ITK-paivat: Poster presentation", "Generation AI", "N", "", "JL"],
  ["Third International Workshop on Computational Thinking, Coding Skills and AI in Schools", "Invited talk: AI Literacy in K-12 Computing Education: Experiences from the Classroom", "40", "30.10.2023", "MT"],
  ["Ita-Suomen ohjaushenkiloston koulutuspaivat", "Tekoaly opiskelussa ja tyoelamassa", "150", "2.11.2023", "MT"],
  ["Ita-Suomen Veso-tyopajat", "Koneoppimista koulumaailmaan", "46", "11.11.2023", "HV, MT"],
  ["Uppsala University / Generative AI: Implications for Teaching and Learning (Seminaari)", "Generative AI and Transformation of Educational Practices", "74", "13.11.2023", "HV"],
  ["Uppsala University / Generative AI: Implications for Teaching and Learning (Seminaari)", "Computing education is not just programming: What else does generative AI change?", "74", "13.11.2023", "MT"],
  ["KC 2023 -konferenssi: Keynote", "What about a Ploughman or a Keeper at the Zoo: Survival (Thinking) Tools for the Generation AI", "40", "13.11.2023", "TR"],
  ["WiPSCE 2022 (keynote) (Morschach, Sveitsi)", "Computational Thinking 2.0", "100", "1.11.2022", "MT"],
  ["Helsingin seudun tekstiiliopettajat", "Kasityo- ja teknologiakasvatuksen tulevaisuuden visioita", "20", "27.11.2023", "KK"],
  ["Kasvatustieteen paivat 2023, Vaasa", "Voiko tekoaly nahda, kuulla ja haistaa? Esikoululaisten metaforat ymmarryksen rakentumisen tukena", "", "24.11.2023", "KS, TP"],
  ["EAPRIL 2023, Belfast, Pohjois-Irlanti", "Developing AI literacy for the Generation AI with the novel machine learning tool", "29", "22.11.2023", "JL, KM, MI"],
  ["EAPRIL 2023, Belfast, Pohjois-Irlanti", "Generation AI: Teaching AI and data agency to novice learners", "25", "23.11.2023", "JL, KM, MI"],
  ["Joensuun kaupungin VESO-koulutukset, Uimaharju", "Koneoppimista koulumaailmaan", "14", "31.10.2023", "IJ"],
  ["Joensuun kaupungin VESO-koulutukset, Kontiolahti", "Koneoppimista koulumaailmaan", "3", "2.11.2023", "IJ"],
  ["Joensuun kaupungin VESO-koulutukset, Ylamylly", "Koneoppimista koulumaailmaan", "7", "6.11.2023", "IJ"],
  ["Ita-Suomen liikuntaopisto, henkilostokoulutus", "Tekoaly, opetus ja oppiminen", "30", "18.8.2023", "IJ"],
  ["Etela-Savon Tiedeseura ry:n seminaari", "Digitalisoituva opetus – tekoalytys opetuksessa ja oppimisessa", "45", "16.2.2023", "IJ"],
  ["Digi- ja vaestoviraston webinaari", "Sujuva Suomi tekoalylla – eettisesti ja vastuullisesti (panelisti)", "97", "14.11.2023", "SL"],
  ["Innokas-verkoston tekoalyseminaari", "Oppijana tekoalyn aikakaudella", "183", "1.12.2023", "MT, HV"],
  ["Opetushallitus: Digioppimisen areena 2023", "Opettajana tekoalyn aikakaudella – kriittisen ajattelun merkitys oppimisessa", "105", "11.12.2023", "MT, HV"],
  ["Pelastakaa lapset: Nordic Digital Citizenship conference on children’s rights in the digital world (workshop)", "Generation AI", "10", "12.12.2023", "HV"],
  ["Pelastakaa lapset: Nordic Digital Citizenship conference on children’s rights in the digital world (workshop)", "Disinformation as a challenge to democracy and children's rights", "20", "12.12.2023", "MS"],
  ["Tieke AamuAreena: Nuorten dataymmarrysta kehittamassa", "Tekoalyn utopioista datatoimijuuden tukemiseen", "77", "15.12.2023", "HV, MT"],
  ["OAJ yliopistopaivat 17-18.11", "Mita me oikeastaan tiedamme tekoalysta ja sen opetuskaytosta? Onko kyseessa", "231", "17.11.2023", "JL"],
  ["OPH Digioppimisen areena 2023", "uhka vai mahdollisuus?", "350", "11.12.2023", "JL"],
  ["Helsingin yliopisto, Kasvatustieteellisen tiedekunnan Digitori", "Generation AI: Kohti tekoalyn luovan hyodyntamisen taitoa", "50", "31.1.2024", "SD, KS, KK"],
  ["Aluehallintovirasto, Mediakasvatuspaiva", "Mita tekoaly on", "122", "7.2.2024", "MT"],
  ["EDUCA", "Generation AI: from AI Literacy to AI Agency", "150", "16.1.2024", "TR"],
  ["EDUCA", "Kuka pelkaa ChatGPT:ta – Tekoaly koulussa", "200", "16.1.2024", "TR"],
  ["CUDIS-seminaari: Digiteknologia- ja kansainvalisyysosaaminen", "Miksi tekoalysta puhutaan juuri nyt?", "30", "5.2.2024", "MT"],
  ["Verkkotyopaja: Analytiikka ja oppimispolut / Pedagoginen tietojohtaminen ja oppimisanalytiikka", "Opettajan uudet tyokalut, nuo kiehtovat tekoalyt – muutamia havaintoja tutkimuksen kentalta – Jari Laru", "30", "7.2.2024", "JL"],
  ["Uudistuva Tampere / Tekoaly opiskelijan ja opettajan tyokaverina / TREDU", "Mita tekoaly on? Miten se toimii? Mita silla voi tehda? Nakokulma: arkiset toimistosovellukset ja niissa lymyava tekoaly", "60", "8.2.2024", "JL"],
  ["Digital Futures (KTH & DSV)", "AI, teaching, and learning: See the waves or the tide?", "50", "6.3.2024", "MT"],
  ["Manta-Vilppulan ja Juupajoen VESO", "Perustietoa tekoalysta ja sen opetuskaytosta", "120", "9.3.2024", "JL"],
  ["Mediakasvatusseuran Aamuklubi", "Tekoalyn utopioista datatoimijuuden tukemiseen", "23", "20.3.2024", "HV, MT"],
  ["IT kouluttajat ry", "Generation AI - IT Kouluttajat ry esitys", "50", "22.3.2024", "JL"],
  ["EDU Areena", "Teknologiset murrokset ja eettiset haasteet opetuksessa: Tekoalyn utopioista ymmarryksen tukemiseen", "123", "27.3.2024", "HV"],
  ["EDU Areena", "Miten teknologia ja oppimisymparistot muovaavat koulutuksen tulevaisuutta?", "123", "27.3.2024", "JL"],
  ["Faktabaari 10v -seminaari", "Commentary on Jevin West's talk 'Election integrity at the time of social media and generative AI'", "50", "2.4.2024", "TR"],
  ["Tutoropettajien ja digivastaavien koulutuspaiva", "Miksi tekoalysta puhutaan juuri nyt?", "60", "9.4.2024", "MT"],
  ["Lukema 2024 (Lukion matematiikan ja luonnontieteen kehittamisverkosto)", "Tekoalyn murros tieteessa ja datalahtoisen suunnittelun pedagogiikka", "86", "25.4.2024", "HV, MT"],
  ["AamuSADE: muotoilukasvattajien aamukahvit", "Tekoaly tuotesuunnittelussa", "70", "3.5.2024", "HV, MT"],
  ["Opetushallitus: Osaamisen ennakointifoorumin Koulutus, kulttuuri ja viestinta -ryhma", "Tekoalyn nakokulmia medialukutaitoon", "21", "24.5.2024", "HV, MT"],
  ["Teknisten aineiden opettajien liitto TAO ry", "Digitaaliset tyokalut teknisen tyon opetuksessa - mahdollisuuksia ja tutkimustuloksia", "20", "5-7.4.2024", "JL"],
  ["DevTech lab (Boston College)", "Generation AI - Epistemic Fluency & Invention Pedagogy", "18", "10.4.2024", "KS"],
  ["Kulosaaren lukio", "Esitys tekoalysta", "20", "8.4.2024", "TR"],
  ["Digihumaus (Digi- ja vaestotietovirasto)", "Tekoalyosaaminen boomerista gen alphaan – Millaiseen yhteiskuntaan olemme matkalla?", "", "11.4.2024", "TR"],
  ["Murros 2024", "Nain avataan tekoalyn musta laatikko – kuinka Generation AI hanke kehittaa lapsista ja nuorista datatoimijoita?", "385", "11.4.2024", "JL"],
  ["ITK 2024", "Kuka pelkaa ChatGPT:ta? Tekoaly koulussa", "250", "18.4.2024", "TR"],
  ["Pohjois-Suomen kasvatus- ja optusalan johdon paivat", "Tekoaly - uhka vai mahdollisuus?", "167", "26.4.2024", "JL"],
  ["MIT Media Lab - Personal Robotics Group (Day of AI-projekti)", "Generation AI - Epistemic Fluency & Invention Pedagogy", "8", "22.5.2024", "KS"],
  ["NordFo conference AI Make Sloyd", "Luxury, Ethics, and Anti-ads – Utilizing Generative AI in Media-Art in Finnish Basic Education", "", "", "SD, KS, KK"],
  ["Chydenius-Instituutin kannatusyhdistys", "Tekoalyn utopioista datatoimijuuden tukemiseen", "12", "28.5.2024", "HV"],
  ["Creating Knowledge: Keynote", "The tide, not the waves: AI education for novice learners", "180", "6.6.2024", "MT, HV"],
  ["Kainuun alueen opettajat / VESO / DOK hanke", "Tekoalya oppimassa ja opettamassa", "170", "5.8.2024", "JL"],
  ["Savonlinnan kaupungin VESO-koulutukset", "Tutki Somea: Generation AI -tyopaja", "21", "6.8.2024", "JK, MT, HV"],
  ["AVI: Ita-Suomen johtajuus- ja rehtoripaivat", "Tieteen tekoalymurros ja datalahtoisen suunnittelun pedagogiikka", "60", "12.9.2024", "HV, MT"],
  ["Nordic Science Centre Association (NSCA) Conference", "AI & Machine Learning: the threats and benefits of AI", "70", "12.9.2024", "TR"],
  ["Tasa-arvoasioiden neuvottelukunta (TANE)", "Pyorea poyta - tekoaly ja tasa-arvo", "15", "24.10.2024", "TR"],
  ["EDEN 2024 Research Workshop", "Technology Education for the Generation AI: From AI Literacy to AI Agency", "150", "17.10.2024", "TR"],
  ["CONNECTS-UK Open Forum 'AI: what does it mean for research, for society and for you?'", "AI: What does it mean for Research, for Society and for You?", "100", "20.11.2024", "TR"],
  ["Pyhtaan kunta, koulujen avoin paiva", "Tekoaly - Mita se on ja miten se nakyy arjessamme nyt ja tulevaisuudessa?", "600", "31.8.2024", "SD"],
  ["Oikeusministerio", "Tekoalyn utopioista datatoimijuuden tukemiseen", "108", "11.12.2024", "HV"],
  ["Tiedonjulkistamisen neuvottelukunta (TJNK)", "Paneelikeskustelu: Mista syntyy luottamus asiantuntijoihin?", "85", "10.1.2025", "HV"],
  ["Tiedonjulkistamisen neuvottelukunta (TJNK)", "Tekoaly haastaa lukutaidon ja datatoimijuuden: Heiluttaako hanta koiraa?", "85", "10.1.2025", "TR"],
  ["University of Cambridge public lecture", "Developing tools for AI Education: the Generation AI project", "40", "21.1.2025", "MT"],
  ["Fab Learning Academy", "Generation AI: Tools for teaching about AI", "30", "27.1.2025", "MI"],
  ["Nufit: Nuorten filosofiatapahtuma", "Tekoaly haastaa ihmisalyn", "10", "17.1.2025", "TR"],
  ["Tiedekulma", "Aito vai deepfake – mihin voimme luottaa tekoalyaikassa?", "?", "28.1.2025", "TR"],
  ["Opetushallitus: Digioppimisen areena 2024", "EU:n uusi tekoalyasetus juridiikan ja koulutuksen nakokulmasta", "?", "2.12.2024", "SL"],
  ["Euroopan tietosuojavaltuutettu", "European Data Protection Summit: Rethinking Data in A Democratic Society (panelisti)", "?", "20.6.2024", "SL"],
  ["Social Sciences Faculty, Lund University", "Critical Legal Conference 2024: Speculation(s)", "15", "16-18.09.2024", "KF"],
  ["Data Protection Scholars Network (DPSN)", "DPSN International Data Protection Day work-in-progress event", "80", "19.01.2024", "KF"],
  ["Law Faculty, University of Helsinki", "Doctoral Seminar in Public Law", "20", "17.04.2023", "KF"],
  ["Law School, University of British Columbia", "24th UBC Interdisciplinary Legal Studies Conference", "35", "04-05.05.2023", "KF"],
  ["Vrije Universiteit Brussel (VUB)", "Symposium on Governing Artificial Intelligence: Designing Legal and Regulatory Responses", "10", "23.05.2023", "KF"],
  ["Joensuun kaupunki", "Tekoaly ja datapohjainen ajattelu: Mita ne ovat ja miten niita voi oppia?", "55", "12.2.2025", "MT"],
  ["Simon kunta", "Mika se on? Miten se toimii? Apua? AI?! Vesokoulutus Simon kunta", "32", "31.8.2024", "JL"],
  ["Tampereen yliopisto", "Kommenttipuheenvuoro teoksen 'digitalisaatio oppimisen ja oppimistulosten selittajana' julkaisutilaisuudessa", "35", "3.9.2024", "JL"],
  ["Tyovaen sivistysliitto", "Tyovaenkirjallisuuden paiva: Aly -paneeli. Tampere", "45", "7.9.2024", "JL"],
  ["Oulun yliopisto/tuotantotalous", "AI threat or possibility for education?", "29", "10.9.2024", "JL"],
  ["EDUTEN/Opinvirta/tekoalykoulutus", "Tekoaly on arkipaivaa. NYT. AI?!", "200", "19.9.2024", "JL"],
  ["Opopassi (opinto-ohjaajat)", "Tekoalysta kaveri opinto-ohjaukseen", "98", "4.10.2024", "JL"],
  ["Howspace", "Howspace inspiraatioaamu oppilaitoksille (kuinka kaytan tekoalyominaisuuksia)", "42", "10.10.2024", "JL"],
  ["Tyttojen paiva 2024", "Somekonetyopaja tyttojen paivassa. Oulun yliopisto", "20", "11.10.2024", "JL, MI, KM, SM-T"],
  ["ICT Research breakfast. ITEE Faculty UniOulu.", "How to teach AI literacy to primary and secondary school students?", "51", "28.10.2024", "JL"],
  ["the International Convergence & STEAM Education Conference", "AI Education in K-12. How to teach AI literacy to primary school students.", "48", "1.11.2024", "JL"],
  ["Annie Webinar", "Artificial intelligence in special education", "120", "6.11.2024", "JL"],
  ["TkaEdite project Workshop. Kosovo.", "Generation AI teachable Machine workshop: How to teach AI literacy to primary school children", "24", "6.11.2024", "JL"],
  ["TkaEdite project Workshop. Albania", "Generation AI teachable Machine workshop: How to teach AI literacy to primary school children", "24", "8.11.2024", "JL"],
  ["Kasvatustieteen paivat 2024, Turku", "Esiseminaari: Alykasta opettamista vai opettamisen loppu. Lasten ja nuorten tekoalylukutaitoja kehittamassa – kokemuksia Generation AI -hankkeesta", "35", "20.11.2024", "JL"],
  ["Turun yliopisto. Digierko.", "PANEELI (hybridi toteutus): 'Pakkodigista kännykkakieltoon – digiloikasta someaddiktioon, mikä on digipedagogiikan tulevaisuus?' -paneelikeskustelu", "80", "28.11.2024", "JL"],
  ["Turun yliopisto. Digierko.", "Esitys laivaseminaarissa: Muutama sananen tekoalysta", "28", "29.11.2024", "JL"],
  ["Porin kaupunki. Tutorpäivät.", "Millaisia tekoalytaitoja peruskoulussa tulisi opettaa 2020-luvulla? Miten taitoja voidaan opettaa?", "52", "21.11.2024", "JL"],
  ["Keravan kaupunki. Digitutoreiden AI-koulutus ja tyopaja.", "Millaisia tekoalytaitoja peruskoulussa tulisi opettaa 2020-luvulla? Miten taitoja voidaan opettaa?", "48", "10.12.2024", "JL"],
  ["Luento teoksen 'Effective Practices in AI literacy Education: Case Studies and Reflections.' julkaisutilaisuudessa", "Learning AI literacy in collaborative projects with an AI Education Tool by Making Machine-Learning-Driven Apps: A case study from Finnish pre-service teacher education", "19", "12.12.2024", "JL"],
  ["OTAVIA kehittamispaivat 2025", "Tekoalyn ajankohtaiskatsaus", "87", "3.1.2025", "JL"],
  ["INNOKAS paivat 2025 Oulu", "Muutama sananen selitettavasta tekoalysta (XA)", "75", "16.1.2025", "JL"],
  ["Haaga-Helian digierkokoulutus ammatillisille opettajille", "AI - Opettajan tyon ja arvioinnin muutos", "29", "4.2.2025", "JL"],
  ["Labquality Days. Helsinki.", "Generative AI as a professional tool - agent, coach or friend? Research-based insights into the context of early adoption, regulation and AI literacy", "80", "6.2.2025", "JL"],
  ["Merikosken Rotary klubi.", "Luento tekoalysta", "30", "10.2.2025", "JL"],
  ["Educhallenger Lithuania.", "Generative AI as a tool to adapt teaching to learner's needs", "40", "25.2.2025", "JL"],
  ["FEDUTALK 2024 Kosovo", "Generative AI - threat or possibility for Education?", "120", "26.6.2024", "JL"],
  ["KICER Conference 28.6.2024 Kosovo", "Keynote: From EU AI ACT to National AI Guidelines", "120", "28.6.2024", "JL"],
  ["Midnight Summer School Finland 24", "Generation AI project", "62", "4.6.2024", "JL"],
  ["AIDEA 2025, Salzburg", "Generation AI: Tools for AI Education", "60", "24.2.2025", "MT"],
  ["AIDEA 2025, Salzburg", "Hands-on introduction to K-12 AI education using XAI social media simulator", "40", "24.2.2025", "HV"],
  ["CreateAI, Univ. of Pennsylvania", "Fireside: Creating AI", "30", "3.3.2025", "MT"],
  ["CreateAI, Univ. of Pennsylvania", "Poster session", "50", "2.3.2025", "MT"],
  ["ICASSE 2024", "Keynote: Dreams and Utopia: AI Technology in Teaching and Learning", "11", "13.12.2024", "KM"],
  ["EAPRIL 2024", "Workshop: Social Media simulator 'SOMEKONE' - an educational tool for understanding explainable AI", "15", "27.11.2024", "KM, MI, JK, JL"],
  ["Pohjois-Pohjanmaan SIVIS-verkostotapaaminen", "Esitys: Unelmaa ja utopiaa - tekoalyillaan oppimisen ja opetuksen kontekstissa", "20", "14.6.2024", "KM"],
  ["SIKU-ohjausryhma: Oulun kaupunki, sivistys ja kulttuuripalvelut ja OY", "Generation AI-hanke", "10", "5.6.2024", "KM"],
  ["Tekoalytarinat Hiukkavaarassa", "Standi: Generation AI", "50", "26.3.2024", "KM, JR, MI, SM-T"],
  ["Amazing North", "Standi: Generation AI", "150", "21.5.2024", "KM, JR, MI, SM-T"],
  ["Amazing North", "Esitys: Generation AI", "300", "21.05.2024", "KM"],
  ["EDUCA 2025", "Tyopaja:", "75", "25.01.2025", "JL, JK, SM-T"],
  ["EDUCA 2025", "Standi: Generation AI", "1000", "24.-25.01.2025", "KM, JL, MI, SM-T, TR, TP, SD, KK"],
  ["EDUCA 2025", "Panelisti: Learning with and about AI", "150", "25.01.2025", "JK"],
  ["Tekoalytarinat Hiukkavaarassa", "Panelisti", "50", "26.3.2024", "KM"],
  ["Unite! network seminar keynote", "Beyond AI Hype and Toward Critical AI Education", "35", "13.3.2025", "HV, MT"],
  ["Ita-Suomen Hovioikeuden tuomiopiirin tuomarit", "Mita tekoaly on, missa tekoalyjarjestelmat ovat hyvia ja missa eivat", "80", "18.3.2025", "MT"],
  ["Raspberry Pi Computing Education Research Seminars", "AI as a design domain: Empowering students with no-code AI/ML app development in the classroom", "83", "13.5.2025", "MT, HV"],
  ["ITK 2025", "Miksi some koukuttaa? Miten tekoaly toimii?", "150", "25.4.2025", "MI"],
  ["ITK 2025", "Generation AI 3v: Millainen on tekoaly- ja turvallisuuskasvatuksen perusta? Mita seuraavaksi?", "", "25.4.2025", "JL, TR, JK, HV"],
  ["Nordic-Baltic Workshop on CT and AI", "AI education within the domain of computing education", "15", "27.8.2025", "MT"],
  ["Raspberry Pi Computing Education Research Seminars", "Somekone - Teaching about AI with an explainable social media simulator", "63", "9.9.2025", "MT, HV"],
  ["UEF. Study visit from Jordan", "Generation AI", "9", "17.9.2025", "JK, HV"],
  ["International conference on smart learning environments (ICSLE)", "Towards transformative AI education through cross-boundary co-design", "34", "17.10.2025", "HV"],
  ["FERA 2025, CHAT SIG", "Panel discussion: CHAT perspectives on Agency, Mediation and AI", "42", "5.11.2025", "HV"],
  ["Suurten kaupunkien sivistysjohto + OAJ:n edustajisto", "GenAI:n ja Joensuun kaupungin yhteistyöesittely", "80", "13.11.2025", "MT"],
  ["25th Koli Calling Conference on Computing Education Research pre-conference workshop", "Theorizing AI Education Research", "25", "12.11.2025", "MT, HV, TR"],
  ["Mediakasvatusseuran Pyorean poydan keskustelu: Mita kaikkea mediakasvatus ja mediataidot ovat tassa ajassa?", "", "20", "9.12.2025", "HV"],
  ["50 myyttia tekoalysta ja datasta: Kirjanjulkistamistilaisuus", "", "21", "22.1.2026", "JK, ES, HV, MT"],
  ["National Academy of Science, Washington DC", "Generation AI: AI education in Finland", "80", "23.2.2026", "MT"],
  ["Stewart Alan Robertson Lecture", "AI Education for Meaningful Life, Life Together, and Life on the Planet", "", "12.3.2026", "MT"]
];

function pad(value) {
  return String(value).padStart(2, "0");
}

function parseDateParts(value) {
  const text = String(value || "").trim();
  if (!text) return null;

  const range = text.match(/^(\d{1,2})(?:\.-?|-) *(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (range) {
    const [, day, , month, year] = range;
    return { day, month, year };
  }

  const dotted = text.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (dotted) {
    const [, day, month, year] = dotted;
    return { day, month, year };
  }

  const compact = text.match(/^(\d{1,2})\.(\d{1,2})(20\d{2})$/);
  if (compact) {
    const [, day, month, year] = compact;
    return { day, month, year };
  }

  return null;
}

function parseSortableDate(value) {
  const parsed = parseDateParts(value);
  if (parsed) {
    return `${parsed.year}-${pad(parsed.month)}-${pad(parsed.day)}`;
  }

  const text = String(value || "").trim();
  const yearOnly = text.match(/(20\d{2})/);
  return yearOnly ? `${yearOnly[1]}-01-01` : "";
}

function parseDisplayDate(value) {
  const parsed = parseDateParts(value);
  if (parsed) {
    return `${pad(parsed.day)}.${pad(parsed.month)}.${parsed.year}`;
  }

  return String(value || "").trim();
}

function classifyActivity(stakeholder, title) {
  const haystack = `${stakeholder} ${title}`.toLowerCase();
  const researchKeywords = [
    "conference",
    "konferenssi",
    "symposium",
    "poster",
    "keynote",
    "research workshop",
    "work-in-progress",
    "doctoral seminar",
    "public lecture",
    "interdisciplinary legal studies",
    "critical legal conference",
    "iticse",
    "wipsce",
    "eapril",
    "icsle",
    "icasse",
    "eden 2024 research workshop",
    "raspberry pi computing education research seminars",
    "computational thinking",
    "kc 2023",
    "mydata conference",
    "upcerg",
    "mit media lab",
    "devtech lab",
    "lunds university",
    "ubc",
    "vrije universiteit",
    "createai",
    "cambridge",
    "national academy of science",
    "academy of science",
    "koli calling",
    "journal release",
    "research seminar",
    "robertson lecture",
    "creating knowledge",
    "network seminar keynote",
    "workshop on ct and ai",
    "faculty, lund university"
  ];

  return researchKeywords.some(keyword => haystack.includes(keyword)) ? "research" : "project";
}

module.exports = function stakeholderActivitiesData() {
  const items = rows.map(([stakeholder, title, participants, date, consortium]) => {
    const category = classifyActivity(stakeholder, title);
    return {
      stakeholder,
      title,
      participants,
      date,
      displayDate: parseDisplayDate(date),
      consortium,
      category,
      sortDate: parseSortableDate(date)
    };
  });

  const projectItems = items
    .filter(item => item.category === "project")
    .sort((a, b) => String(b.sortDate).localeCompare(String(a.sortDate)));
  const researchItems = items
    .filter(item => item.category === "research")
    .sort((a, b) => String(b.sortDate).localeCompare(String(a.sortDate)));

  return {
    items,
    projectItems,
    researchItems
  };
};
