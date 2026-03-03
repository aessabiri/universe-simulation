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
    <div id="sub-controls" style="display: none; margin-top: 10px;">
      <!-- Planet focus buttons will be injected here -->
    </div>
    <div id="description">The Singularity expands...</div>
  </div>
`;

const container = document.querySelector<HTMLDivElement>('#canvas-container')!;
const manager = new SimulationManager(container);
manager.animate(0);

const subControls = document.getElementById('sub-controls')!;

function hideSubControls() {
  subControls.style.display = 'none';
}

function showSolarSystemControls() {
  subControls.style.display = 'flex';
  subControls.style.justifyContent = 'center';
  subControls.style.gap = '5px';
  subControls.style.flexWrap = 'wrap';
  subControls.style.marginBottom = '10px';
  
  const planets = ['Sun', 'Mercury', 'Venus', 'Earth', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune'];
  subControls.innerHTML = planets.map((p, i) => 
    `<button class="planet-btn" data-index="${i - 1}">${p}</button>`
  ).join('');

  document.querySelectorAll('.planet-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const idx = parseInt((e.target as HTMLButtonElement).dataset.index!);
      manager.focusOnIndex(idx === -1 ? null : idx);
    });
  });
}

// UI Event Listeners
document.getElementById('btn-bigbang')?.addEventListener('click', () => {
  manager.setEpoch(Epoch.BIG_BANG);
  hideSubControls();
  document.getElementById('description')!.innerText = 'The Singularity expands into space-time.';
});

document.getElementById('btn-plasma')?.addEventListener('click', () => {
  manager.setEpoch(Epoch.PLASMA);
  hideSubControls();
  document.getElementById('description')!.innerText = 'Quark-Gluon Plasma: A hot soup of fundamental particles.';
});

document.getElementById('btn-stellardawn')?.addEventListener('click', () => {
  manager.setEpoch(Epoch.STELLAR_DAWN);
  hideSubControls();
  document.getElementById('description')!.innerText = 'Stellar Dawn: The universe cools, and the first massive stars ignite.';
});

document.getElementById('btn-galaxy')?.addEventListener('click', () => {
  manager.setEpoch(Epoch.GALAXY_FORMATION);
  hideSubControls();
  document.getElementById('description')!.innerText = 'Gravity pulls matter into cosmic filaments and galaxies.';
});

document.getElementById('btn-solar')?.addEventListener('click', () => {
  manager.setEpoch(Epoch.SOLAR_SYSTEM);
  showSolarSystemControls();
  document.getElementById('description')!.innerText = 'A Protoplanetary Disk forms around a young Sun.';
});

document.getElementById('btn-earth')?.addEventListener('click', () => {
  manager.setEpoch(Epoch.EARTH);
  hideSubControls();
  document.getElementById('description')!.innerText = 'Earth forms, cools, and becomes a cradle for life.';
});
