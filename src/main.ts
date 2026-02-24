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
      <button id="btn-galaxy">Galaxy</button>
      <button id="btn-solar">Solar System</button>
      <button id="btn-earth">Earth</button>
    </div>
    <div id="description">The Singularity expands...</div>
  </div>
`;

const container = document.querySelector<HTMLDivElement>('#canvas-container')!;
const manager = new SimulationManager(container);
manager.animate(0);

// UI Event Listeners
document.getElementById('btn-bigbang')?.addEventListener('click', () => {
  manager.setEpoch(Epoch.BIG_BANG);
  document.getElementById('description')!.innerText = 'The Singularity expands into space-time.';
});

document.getElementById('btn-plasma')?.addEventListener('click', () => {
  manager.setEpoch(Epoch.PLASMA);
  document.getElementById('description')!.innerText = 'Quark-Gluon Plasma: A hot soup of fundamental particles.';
});

document.getElementById('btn-galaxy')?.addEventListener('click', () => {
  manager.setEpoch(Epoch.GALAXY_FORMATION);
  document.getElementById('description')!.innerText = 'Gravity pulls matter into cosmic filaments and galaxies.';
});

document.getElementById('btn-solar')?.addEventListener('click', () => {
  manager.setEpoch(Epoch.SOLAR_SYSTEM);
  document.getElementById('description')!.innerText = 'A Protoplanetary Disk forms around a young Sun.';
});

document.getElementById('btn-earth')?.addEventListener('click', () => {
  manager.setEpoch(Epoch.EARTH);
  document.getElementById('description')!.innerText = 'Earth forms, cools, and becomes a cradle for life.';
});
