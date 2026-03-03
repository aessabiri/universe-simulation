# 🌌 Universe Simulation: Big Bang to Earth

An interactive, high-fidelity 3D cosmic journey built with **Three.js**, **TypeScript**, and **GLSL Shaders**. This simulation allows users to traverse 13.8 billion years of cosmic history, from the initial singularity to the evolution of a habitable Earth.

## 🚀 Experience the Cosmos
The simulation is divided into key cosmic epochs, each with unique procedural visuals and physical behaviors:

- **The Big Bang:** Experience the rapid expansion of space-time from a singularity.
- **Quark-Gluon Plasma:** Navigate the ultra-hot, chaotic soup of fundamental particles.
- **Stellar Dawn:** Watch the first massive stars ignite within iridescent, multi-colored nebulas.
- **Galaxy Formation:** Explore majestic spiral galaxies with dense bulges and dark dust lanes.
- **Solar System:** A complete model of our planetary neighborhood with dynamic orbits and a focus system.
- **Planet Earth:** Witness the cooling of a molten Hadean rock into a lush, blue marble with dynamic clouds and atmospheric scattering.

---

## 🛠️ Technical Masterpiece

### 🎨 Visual Engineering
- **GPU-Accelerated Shaders:** Real-time Earth evolution and cloud movement powered by GLSL Simplex Noise.
- **Cinematic Pipeline:** Integrated `UnrealBloomPass` for realistic light emission and glows.
- **Twinkle Star System:** Custom GPU shaders for realistic, distance-based stellar shimmering.
- **Advanced Post-Processing:** High-performance tone mapping and volumetric-style nebulae.

### ⚙️ Performance & Architecture
- **Instanced Rendering:** Thousands of unique 3D asteroids rendered with nearly zero CPU overhead using `InstancedMesh`.
- **Zero-Asset Loading:** 100% of textures and geometries are generated procedurally on-the-fly.
- **Robust Memory Management:** Recursive garbage collection ensures stable performance during long sessions by explicitly disposing of GPU resources.
- **State-Driven Timeline:** A centralized `SimulationManager` manages seamless transitions between 13.8 billion years of history.

### 🎵 Immersive Soundscape
- **Procedural Audio:** A deep-space ambient drone generated via the **Web Audio API**, reacting dynamically to the simulation's intensity.

---

## 💻 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher)
- [npm](https://www.npmjs.com/)

### Installation
```bash
git clone https://github.com/aessabiri/universe-simulation.git
cd universe-simulation
npm install
```

### Development
```bash
npm run dev
```

### Controls
- **Timeline Slider:** Scrub through 13.8 billion years of cosmic history.
- **Left Click + Drag:** Rotate view.
- **Scroll:** Zoom in/out (dynamically restricted per stage).
- **Planet Buttons:** In Solar System mode, click to lock camera focus on specific planets.

---

## 📖 Future Roadmap
See [PLAN.md](./PLAN.md) for upcoming features and optimization strategies.

## 🤖 AI Interaction Mandates
See [GEMINI.md](./GEMINI.md) for the foundational instructions used to develop this project.
