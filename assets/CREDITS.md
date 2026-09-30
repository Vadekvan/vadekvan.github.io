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

The model includes 41 selected satellites with measured mean radii in the JPL physical parameter table. It does not claim to include every known irregular satellite. Initial orbital phases are illustrative, not positions calculated for the current date. Orbital periods are accelerated uniformly; orbital distances are compressed in overview mode and proportional to physical distances in true-distance mode. Body diameters always share one linear scale. The Jupiter, Saturn, Uranus and Neptune sphere silhouettes also have approximate polar flattening.
