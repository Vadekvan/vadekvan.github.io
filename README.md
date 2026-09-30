# ASTRA — Vesmír na dosah

Interaktivní vesmírná observatoř v češtině. Čisté HTML, CSS a JavaScript, bez závislostí a buildu. Planety jsou procedurálně vykreslené na Canvasu; nepotřebují externí obrázky. Google Fonts jsou volitelné, při nedostupnosti se použije systémový font.

## Spuštění

Otevři `index.html` v moderním prohlížeči, nebo v této složce spusť vlastní statický HTTP server.

## Ovládání

- Pohyb myši: paralaxa hvězd a planet.
- Kliknutí do prázdné scény: roj meteorů.
- Kliknutí na planetu nebo její tlačítko: přiblížení a informace.
- Kolečko myši nebo gesto dvěma prsty: přiblížení a oddálení.
- Spodní panel: pozastavení, zobrazení orbit, zvuková atmosféra a obnovení pohledu.
- Escape: návrat do výchozího pohledu nebo zavření průvodce.

Rozložení se přizpůsobuje mobilům. Planety a všechny ovládací prvky lze vybrat klávesnicí. Při systémové preferenci omezeného pohybu začíná animace pozastavená. Zvuk se spouští jen na vyžádání. Neaktivní karta pozastaví vykreslování i zvuk.

Jde o uměleckou vizualizaci: rozměry, vzdálenosti, orbity a povrch planet nejsou astronomickou simulací.

## GitHub Pages

Workflow `.github/workflows/deploy.yml` automaticky nasadí web po pushi do `main` nebo `master`; lze ho spustit také ručně. V repozitáři nastav **Settings → Pages → Source → GitHub Actions**. Workflow publikuje pouze čtyři soubory webu, bez zdrojů repozitáře a dokumentace.
