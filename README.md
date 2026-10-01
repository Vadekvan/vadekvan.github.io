# ASTRA — Vesmír na dosah

Interaktivní vesmírná observatoř v češtině. Čisté HTML, CSS a JavaScript, bez závislostí a buildu. Obsahuje Slunce, všech osm planet a 41 vybraných hlavních a menších měsíců. Povrchy Slunce, planet a Měsíce používají místní textury Solar System Scope / INOVE. Ostatní měsíce mají přibližné procedurální povrchy. Google Fonts jsou volitelné, při nedostupnosti se použije systémový font.

## Spuštění

Otevři `index.html` v moderním prohlížeči, nebo v této složce spusť vlastní statický HTTP server.

## Ovládání

- Pohyb myši: paralaxa hvězd a planet.
- Kliknutí do prázdné scény: roj meteorů.
- Kliknutí na planetu nebo její tlačítko: přiblížení a informace.
- Tlačítka měsíců v detailu planety: přiblížení jednotlivých měsíců, návrat k jejich planetě.
- Na telefonu přejížděj seznam planet vodorovně. Vybraná planeta se posune do viditelné části seznamu. Tlačítko **Detail** rozbalí popis, údaje a výběr měsíců; jeho obsah lze posouvat a opět sbalit bez změny vybraného tělesa.
- V detailu planety mají i nejmenší měsíce klikací popisky a značky polohy. Kroužek a bod jsou orientační značky v pixelech, průměr samotného tělesa zůstává ve skutečném měřítku. Zakrytý měsíc má přerušovanou značku a text „za planetou“ nebo „za Sluncem“.
- Početné soustavy Jupiteru, Saturnu a Neptunu mají popisky ve dvou sloupcích spojené čarami s pozicemi měsíců, aby se neprolínaly ani při skutečných vzdálenostech. Kliknutí na text má přednost před značkou jiného tělesa pod ním.
- Při výběru planety se kamera přizpůsobí rozsahu drah jejích měsíců, aby se celá soustava vešla vedle informací a ovládání. Platí i pro skutečné vzdálenosti; na mobilu je panel času nad detailem.
- Přepínač vzdáleností: přehled se zkrácenými drahami, nebo skutečné měřítko vzdáleností i průměrů.
- Přepínač měsíců: zobrazení nebo skrytí satelitů a jejich drah.
- Datum nad scénou: skutečný čas simulace v UTC a informace, zda polohy leží v rozsahu dat JPL.
- **Živě**: návrat na aktuální čas, rychlost 1 s/s a sledování hodin počítače (také po návratu do neaktivní karty).
- **Zpět na teď**: návrat na aktuální datum se zachováním zvoleného tempa, pauzy a vybraného tělesa.
- Kolečko myši nebo gesto dvěma prsty: přiblížení a oddálení.
- Spodní panel: pozastavení, zobrazení orbit, zvuková atmosféra a obnovení pohledu.
- Tlačítko s hodinami a aktuální rychlostí vedle pauzy: nastavení tempa. Posuvník má 12 kroků od skutečného času přes minuty, hodiny a dny až po 100 let za sekundu. Rychlé předvolby nabízejí skutečný čas, 1 hodinu/s, výchozí 2 dny/s a 1 rok/s. Funguje také klávesnicí (šipky, Home, End).
- Pauza si zvolenou rychlost zapamatuje. Změna rychlosti během pauzy animaci nespustí; po spuštění pokračuje novým tempem. Obnovení pohledu tempo nemění. Escape zavře panel rychlosti bez změny pohledu.
- Escape: návrat do výchozího pohledu nebo zavření průvodce.

Rozložení se přizpůsobuje mobilům, krátkým displejům i otočení telefonu na šířku. Dotykové ovládání má plochy nejméně 44 px, panely respektují výřezy displeje a kamera používá skutečný volný prostor mezi nimi. Planety a všechny ovládací prvky lze vybrat klávesnicí. Při systémové preferenci omezeného pohybu začíná animace pozastavená. Zvuk se spouští jen na vyžádání. Neaktivní karta pozastaví vykreslování i zvuk.

Průměry těles vždy sdílejí skutečné lineární měřítko: Slunce má přibližně 109krát větší průměr než Země. Přehled zkracuje vzdálenosti planet i měsíců, aby šla soustava prozkoumat. Režim skutečných vzdáleností používá stejný převod kilometrů na pixely pro rozměry i dráhy; jednotlivá tělesa jsou proto v celkovém pohledu velmi drobná.

Planety obíhají po elipsách s přibližnou skutečnou excentricitou a řešením Keplerovy rovnice. Tempo je nastavitelné; výchozí jsou dva simulační dny za sekundu. Všechny oběhy se zrychlují společně, takže jejich vzájemné poměry zůstávají zachované. Meteory, blikání hvězd a kamera mají vlastní čas, aby rychlé tempo soustavy nezpůsobovalo prudké blikání a neměnilo ovládání. Měsíce obíhají kolem svých planet; Triton a Phoebe retrográdně. Osvětlení a denní/noční strana se řídí směrem ke Slunci, Uran má výrazně nakloněné prstence a plynní obři zploštělé póly. Pás asteroidů leží mezi Marsem a Jupiterem.

Počáteční datum odpovídá okamžiku otevření webu. Všech 8 planet a 41 měsíců používá datované oskulační elementy NASA/JPL Horizons, včetně excentricity, sklonu, orientace a fáze dráhy. Planety jsou vztažené ke středu Slunce, měsíce ke středu své planety. Soustava je zobrazená ze stálého šikmého pohledu na ekliptiku J2000, nejde o pohled pozorovatele ze Země. Dráhy měsíců jsou nyní eliptické; retrográdní pohyb plyne ze skutečných elementů.

Data pokrývají ±400 dnů pro planety (epochy po dni) a ±90 dnů pro měsíce (epochy po 6 hodinách) kolem data stažení. Mezi epochami se polohy dopočítávají Keplerovou rovnicí z obou sousedních oskulačních drah a jejich souřadnice se plynule interpolují. Nejde o plnou gravitační integraci ani přesné efemeridy pro navigaci. Za hranicí rozsahu se extrapoluje krajní dráha a web viditelně uvádí **Přibližná predikce · mimo data JPL**. Tak mohou fungovat i rychlosti 10 či 100 let/s, ale jejich vzdálená budoucnost není přesná. Pokud soubor chybí nebo není platný, zůstanou dostupné ilustrativní dráhy s upozorněním. Slunce, prstence, rotace povrchů a dekorativní asteroidy nejsou datovanou simulací.

UTC se převádí na TDB současným rozdílem 69,184 s; drobná periodická odchylka TDB−TT do 2 ms se zanedbává. Při budoucí změně přestupných sekund je třeba upravit `utcToTdbSeconds` v generátoru. Model nezahrnuje všechny známé drobné nepravidelné satelity. Licence textur a podrobnosti zdrojů jsou v [assets/CREDITS.md](assets/CREDITS.md) i v průvodci.

## Aktualizace astronomických dat

Je potřeba Node.js 22 nebo novější pouze pro aktualizaci, nikoli pro spuštění webu:

```sh
node scripts/update-ephemeris.cjs
node --test tests/ephemeris.test.cjs tests/ephemeris-data.test.cjs
```

Generátor posílá požadavky postupně, kontroluje verzi API a obsah odpovědí, při chybě čeká před opakováním a publikuje nový soubor až po úspěšném stažení všech 49 těles. Rozpracované lokální stažení lze zopakovat: úspěšné požadavky téhož dne zůstávají v ignorované `.qa/horizons-cache/`. Prohlížeč načítá pouze místní JS soubor, takže data fungují také při otevření `index.html` přímo a žádný backend ani volání JPL z prohlížeče není potřeba.

## GitHub Pages

Workflow `.github/workflows/deploy.yml` stáhne nové efemeridy a nasadí web po pushi do `main` nebo `master`, ručně přes **Run workflow** a každé pondělí v 03:17 UTC. Plánovaný běh používá výchozí větev a GitHub jeho start může zpozdit. V repozitáři nastav **Settings → Pages → Source → GitHub Actions**. Workflow publikuje soubory webu, čerstvá astronomická data a místní textury. Data generovaná v Actions se publikují přímo, bez automatických commitů. Pokud aktualizace či kontrola selže, nasazení se zastaví a poslední zveřejněný web zůstane dostupný. GitHub může plánované workflow v neaktivním veřejném repozitáři po 60 dnech vypnout; lze ho znovu zapnout v Actions.
