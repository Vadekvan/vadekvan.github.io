# ASTRA — Vesmír na dosah

Interaktivní vesmírná observatoř v češtině. Čisté HTML, CSS a JavaScript, bez závislostí a buildu. Obsahuje Slunce, všech osm planet a 41 vybraných hlavních a menších měsíců. Povrchy Slunce, planet a Měsíce používají místní textury Solar System Scope / INOVE. Ostatní měsíce mají přibližné procedurální povrchy. Google Fonts jsou volitelné, při nedostupnosti se použije systémový font.

## Spuštění

Otevři `index.html` v moderním prohlížeči, nebo v této složce spusť vlastní statický HTTP server.

## Ovládání

- Pohyb myši: paralaxa hvězd a planet.
- Kliknutí do prázdné scény: roj meteorů.
- Kliknutí na planetu nebo její tlačítko: přiblížení a informace.
- Tlačítka měsíců v detailu planety: přiblížení jednotlivých měsíců, návrat k jejich planetě.
- Přepínač vzdáleností: přehled se zkrácenými drahami, nebo skutečné měřítko vzdáleností i průměrů.
- Přepínač měsíců: zobrazení nebo skrytí satelitů a jejich drah.
- Kolečko myši nebo gesto dvěma prsty: přiblížení a oddálení.
- Spodní panel: pozastavení, zobrazení orbit, zvuková atmosféra a obnovení pohledu.
- Tlačítko s hodinami a aktuální rychlostí vedle pauzy: nastavení tempa. Posuvník má 12 kroků od skutečného času přes minuty, hodiny a dny až po 100 let za sekundu. Rychlé předvolby nabízejí skutečný čas, 1 hodinu/s, výchozí 2 dny/s a 1 rok/s. Funguje také klávesnicí (šipky, Home, End).
- Pauza si zvolenou rychlost zapamatuje. Změna rychlosti během pauzy animaci nespustí; po spuštění pokračuje novým tempem. Obnovení pohledu tempo nemění. Escape zavře panel rychlosti bez změny pohledu.
- Escape: návrat do výchozího pohledu nebo zavření průvodce.

Rozložení se přizpůsobuje mobilům. Planety a všechny ovládací prvky lze vybrat klávesnicí. Při systémové preferenci omezeného pohybu začíná animace pozastavená. Zvuk se spouští jen na vyžádání. Neaktivní karta pozastaví vykreslování i zvuk.

Průměry těles vždy sdílejí skutečné lineární měřítko: Slunce má přibližně 109krát větší průměr než Země. Přehled zkracuje vzdálenosti planet i měsíců, aby šla soustava prozkoumat. Režim skutečných vzdáleností používá stejný převod kilometrů na pixely pro rozměry i dráhy; jednotlivá tělesa jsou proto v celkovém pohledu velmi drobná.

Planety obíhají po elipsách s přibližnou skutečnou excentricitou a řešením Keplerovy rovnice. Tempo je nastavitelné; výchozí jsou dva simulační dny za sekundu. Všechny oběhy se zrychlují společně, takže jejich vzájemné poměry zůstávají zachované. Meteory, blikání hvězd a kamera mají vlastní čas, aby rychlé tempo soustavy nezpůsobovalo prudké blikání a neměnilo ovládání. Měsíce obíhají kolem svých planet; Triton a Phoebe retrográdně. Osvětlení a denní/noční strana se řídí směrem ke Slunci, Uran má výrazně nakloněné prstence a plynní obři zploštělé póly. Pás asteroidů leží mezi Marsem a Jupiterem.

Počáteční fáze orbit jsou ilustrativní, nejde o efemeridy k aktuálnímu datu ani o gravitační simulaci. Dráhy měsíců jsou kruhovou aproximací a jejich sklon je zjednodušený. Model nezahrnuje všechny známé drobné nepravidelné satelity. Licence textur a odkazy na NASA/JPL jsou v [assets/CREDITS.md](assets/CREDITS.md) i v průvodci přímo na webu.

## GitHub Pages

Workflow `.github/workflows/deploy.yml` automaticky nasadí web po pushi do `main` nebo `master`; lze ho spustit také ručně. V repozitáři nastav **Settings → Pages → Source → GitHub Actions**. Workflow publikuje soubory webu, astronomická data a místní textury včetně licenčních informací.
