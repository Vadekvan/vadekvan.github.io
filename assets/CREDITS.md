# Surface textures

The files in `textures/` were created by **Solar System Scope / INOVE** and are distributed under **Creative Commons Attribution 4.0 International (CC BY 4.0)**.

- Source and downloads: https://www.solarsystemscope.com/textures/
- License: https://creativecommons.org/licenses/by/4.0/
- Downloaded: 2026-09-30

Original files: `2k_sun.jpg`, `2k_mercury.jpg`, `2k_venus_atmosphere.jpg`, `2k_earth_daymap.jpg`, `2k_mars.jpg`, `2k_jupiter.jpg`, `2k_saturn.jpg`, `2k_uranus.jpg`, `2k_neptune.jpg`, `2k_moon.jpg`.

Files are stored with shorter names without modifying the source images. At runtime ASTRA projects them onto spherical discs, adds directional lighting, adds approximate clouds to Earth when pixel sampling is available, and brightens the Sun. Other moons use approximate procedural surface maps, not photographs of those moons. Ring geometry is drawn procedurally.

# Astronomical data

Planet descriptions and dimensions: https://science.nasa.gov/solar-system/planets/

Moon dimensions: https://ssd.jpl.nasa.gov/sats/phys_par/

Moon average orbital elements and periods: https://ssd.jpl.nasa.gov/sats/elem/

The model includes 41 selected satellites with measured mean radii in the JPL physical parameter table. It does not claim to include every known irregular satellite. Body diameters always share one linear scale. The Jupiter, Saturn, Uranus and Neptune sphere silhouettes have approximate polar flattening.

Dated orbital elements in `data/ephemeris-data.js`: **NASA/JPL Horizons**, https://ssd.jpl.nasa.gov/horizons/ and https://ssd-api.jpl.nasa.gov/doc/horizons.html . Generated with `scripts/update-ephemeris.cjs`; the file records its retrieval date, API versions, coordinate frame and time scale.

Planet centers are relative to the Sun's center; satellite centers are relative to their planet's center. Elements use the ICRF J2000 ecliptic plane, kilometers, degrees and TDB days. Snapshots are spaced one day for planets and six hours for satellites. Between epochs the browser propagates each adjacent osculating ellipse and blends their Cartesian positions; this is an approximation to the Horizons trajectory, not a full gravitational integration. Beyond the sampled range, the nearest endpoint's ellipse is extrapolated and the UI explicitly labels the result as an approximate prediction. Fallback illustrative orbits are used only when the dataset is missing or invalid.

The display is a fixed oblique view of that coordinate frame, not the view of the sky from Earth. Overview mode compresses each orbit's distance but retains its 3D orientation and eccentric shape; true-distance mode uses a single kilometer scale. Ring orientations, surface rotation, decorative asteroids and meteor effects are illustrative. UTC is converted to TDB using the contemporary 69.184-second TT−UTC offset (TDB−TT is below two milliseconds); future leap seconds would require updating this offset.
