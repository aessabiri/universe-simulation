# 🛠️ Mission Mechanics

## 1. The Seeker HUD (Cockpit)
- **First-Person Perspective:** The screen is framed by a tech-inspired overlay, grounding the user in the role of a traveler within a ship or probe.
- **Projected UI:** The planet info panels are projected into 2D screen space but are mathematically tethered to 3D world coordinates, creating a "Mixed Reality" feel.

## 2. The Spectrometer (Analysis)
- **Chemical Detection:** The system reads the `scanData` from each planet mesh.
  - **O2 (Oxygen):** Crucial for advanced life.
  - **H2O (Water):** Essential solvent for biochemical reactions.
  - **C (Carbon):** The backbone of life as we know it.
- **Habitability Score:** A weighted algorithm `(O2 * 2 + H2O) / 2.5` determines the percentage shown on the HUD. Only planets > 50% are suitable for seeding.

## 3. GPU-Driven Evolution
- **The Shader Engine:** When a seed is deployed, the `evolution` uniform in the Earth shader begins a transition.
- **Phase Mapping:**
  - `0.0 - 0.4`: Hadean (Lava convection, meteor impacts).
  - `0.4 - 0.7`: Archean/Proterozoic (Oceans form, followed by global ice).
  - `0.7 - 1.0`: Modern (Fractal biomes, green vegetation, oxygen-rich atmosphere).

## 4. The Cosmic Background
- **Dynamic Depth:** 80+ massive procedural nebulas and 3,000 galaxy clusters fill the void, ensuring the universe looks rich regardless of the zoom level.
- **Twinkle Shaders:** Every star shimmer is calculated on the GPU to maintain 60 FPS performance despite having over 100,000 active points across stages.
