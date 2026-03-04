import './style.css';
import { SimulationManager, Epoch } from './simulation/SimulationManager';

const app = document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML = `
  <div id="canvas-container"></div>
  <div id="ui">
    <h1>Cosmic Journey</h1>
    <div class="controls">
      <button id="btn-bigbang">Big Bang</button>
      <button id="btn-plasma">Plasma</button>
      <button id="btn-stellardawn">First Stars</button>
      <button id="btn-galaxy">Galaxy</button>
      <button id="btn-solar">Solar System</button>
      <button id="btn-earth">Earth</button>
    </div>
    <div id="description">The Singularity expands into space-time.</div>
  </div>
  <div id="planet-menu" style="display: none;">
    <div class="menu-header">Celestial Bodies</div>
    <div id="sub-controls"></div>
  </div>
  <div id="planet-popup" style="display: none;">
    <h2 id="popup-title"></h2>
    <p id="popup-info"></p>
  </div>
`;

const container = document.querySelector<HTMLDivElement>('#canvas-container')!;
const manager = new SimulationManager(container);

const subControls = document.getElementById('sub-controls')!;
const planetMenu = document.getElementById('planet-menu')!;
const popup = document.getElementById('planet-popup')!;
const popupTitle = document.getElementById('popup-title')!;
const popupInfo = document.getElementById('popup-info')!;
const desc = document.getElementById('description')!;

// Consolidated UI update logic hooked into manager's single loop
manager.onUpdate(() => {
  if (popup.style.display === 'block') {
    const stage = manager.getCurrentStage();
    if (stage) {
      const target = stage.getFocusTarget();
      if (target) {
        const screenPos = manager.getProjectedPosition(target);
        popup.style.left = `${screenPos.x + 20}px`;
        popup.style.top = `${screenPos.y - 50}px`;
      }
    }
  }
});

// Start the one and only loop
manager.animate(0);

const initAudioOnce = () => {
  manager.initAudio();
  window.removeEventListener('click', initAudioOnce);
};
window.addEventListener('click', initAudioOnce);

function hideSubControls() {
  planetMenu.style.display = 'none';
  popup.style.display = 'none';
}

function showSolarSystemControls() {
  planetMenu.style.display = 'block';
  subControls.innerHTML = ''; 
  const planets = ['Sun', 'Mercury', 'Venus', 'Earth', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune'];
  subControls.innerHTML = planets.map((p, i) => `<button class="planet-btn" data-index="${i - 1}">${p}</button>`).join('');
  document.querySelectorAll('.planet-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.planet-btn').forEach(b => b.classList.remove('active'));
      const targetBtn = e.target as HTMLButtonElement;
      targetBtn.classList.add('active');
      const idx = parseInt(targetBtn.dataset.index!);
      manager.focusOnIndex(idx === -1 ? null : idx);
      if (idx !== -1) {
        const stage = manager.getCurrentStage() as any;
        if (stage && stage.planets) {
            const planetData = stage.planets[idx];
            popupTitle.innerText = planetData.name;
            popupInfo.innerText = planetData.info;
            popup.style.display = 'block';
        }
      } else {
        popup.style.display = 'none';
      }
    });
  });
}

document.getElementById('btn-bigbang')?.addEventListener('click', () => {
  manager.setEpoch(Epoch.BIG_BANG); hideSubControls(); desc.innerText = 'The Singularity expands into space-time.';
});
document.getElementById('btn-plasma')?.addEventListener('click', () => {
  manager.setEpoch(Epoch.PLASMA); hideSubControls(); desc.innerText = 'Quark-Gluon Plasma: A hot soup of fundamental particles.';
});
document.getElementById('btn-stellardawn')?.addEventListener('click', () => {
  manager.setEpoch(Epoch.STELLAR_DAWN); hideSubControls(); desc.innerText = 'Stellar Dawn: The first massive stars ignite inside iridescent nebulas.';
});
document.getElementById('btn-galaxy')?.addEventListener('click', () => {
  manager.setEpoch(Epoch.GALAXY_FORMATION); hideSubControls(); desc.innerText = 'Gravity pulls matter into cosmic filaments and galaxies.';
});
document.getElementById('btn-solar')?.addEventListener('click', () => {
  manager.setEpoch(Epoch.SOLAR_SYSTEM); showSolarSystemControls(); desc.innerText = 'A Protoplanetary Disk forms around a young Sun.';
});
document.getElementById('btn-earth')?.addEventListener('click', () => {
  manager.setEpoch(Epoch.EARTH); hideSubControls(); desc.innerText = 'Earth: A lush, blue marble with dynamic clouds and a protective atmosphere.';
});
