import './style.css';
import { SimulationManager, Epoch } from './simulation/SimulationManager';

const app = document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML = `
  <div id="canvas-container"></div>
  
  <div id="ui-overlay">
    <div id="info-panel">
      <h1 id="epoch-title">Big Bang</h1>
      <p id="epoch-time">T + 0 Seconds</p>
      <p id="epoch-description">The universe begins as a singularity, expanding rapidly in an event known as inflation.</p>
    </div>

    <div id="timeline-container">
      <input type="range" id="timeline-slider" min="0" max="100" value="0" step="0.1">
      <div id="timeline-labels">
        <span>Big Bang</span>
        <span>Stars</span>
        <span>Galaxies</span>
        <span>Solar System</span>
        <span>Earth Today</span>
      </div>
    </div>

    <div id="sub-controls"></div>
  </div>
`;

const container = document.querySelector<HTMLDivElement>('#canvas-container')!;
const manager = new SimulationManager(container);
manager.animate(0);

// Initialize Audio on first interaction (Browser requirement)
const initAudioOnce = () => {
  manager.initAudio();
  window.removeEventListener('click', initAudioOnce);
  window.removeEventListener('touchstart', initAudioOnce);
};
window.addEventListener('click', initAudioOnce);
window.addEventListener('touchstart', initAudioOnce);

const slider = document.getElementById('timeline-slider') as HTMLInputElement;
const title = document.getElementById('epoch-title')!;
const timeLabel = document.getElementById('epoch-time')!;
const desc = document.getElementById('epoch-description')!;
const subControls = document.getElementById('sub-controls')!;

const epochData = [
  { 
    threshold: 0, 
    epoch: Epoch.BIG_BANG, 
    title: "The Big Bang", 
    time: "T + 0 Seconds", 
    desc: "Space, time, and matter erupt from a singularity. The universe expands faster than light during cosmic inflation."
  },
  { 
    threshold: 15, 
    epoch: Epoch.PLASMA, 
    title: "Quark-Gluon Plasma", 
    time: "T + 1 Microsecond", 
    desc: "A chaotic, ultra-hot soup of fundamental particles. Protons and neutrons haven't even formed yet."
  },
  { 
    threshold: 30, 
    epoch: Epoch.STELLAR_DAWN, 
    title: "Stellar Dawn", 
    time: "T + 100 Million Years", 
    desc: "Gravity pulls primordial gas together to ignite the very first stars, ending the Cosmic Dark Ages."
  },
  { 
    threshold: 50, 
    epoch: Epoch.GALAXY_FORMATION, 
    title: "Galaxy Formation", 
    time: "T + 1 Billion Years", 
    desc: "Gigantic clusters of stars and gas collapse into the majestic spiral and elliptical structures we see today."
  },
  { 
    threshold: 75, 
    epoch: Epoch.SOLAR_SYSTEM, 
    title: "The Solar System", 
    time: "T + 9 Billion Years", 
    desc: "A cloud of dust and gas collapses around a young star—our Sun—forming a protoplanetary disk."
  },
  { 
    threshold: 90, 
    epoch: Epoch.EARTH, 
    title: "Planet Earth", 
    time: "T + 13.8 Billion Years", 
    desc: "From a molten rock to a blue marble. Scrub to the end to watch the planet evolve and cool."
  }
];

let currentEpochIndex = -1;

slider.addEventListener('input', () => {
  const val = parseFloat(slider.value);
  
  // Find correct epoch
  let activeIndex = 0;
  for(let i = epochData.length - 1; i >= 0; i--) {
    if (val >= epochData[i].threshold) {
      activeIndex = i;
      break;
    }
  }

  if (activeIndex !== currentEpochIndex) {
    currentEpochIndex = activeIndex;
    const data = epochData[activeIndex];
    
    manager.setEpoch(data.epoch);
    title.innerText = data.title;
    timeLabel.innerText = data.time;
    desc.innerText = data.desc;

    // Handle Solar System sub-controls
    if (data.epoch === Epoch.SOLAR_SYSTEM) {
      showSolarSystemControls();
    } else {
      subControls.style.display = 'none';
    }
  }
});

function showSolarSystemControls() {
  subControls.style.display = 'flex';
  subControls.style.justifyContent = 'center';
  subControls.style.gap = '5px';
  subControls.style.flexWrap = 'wrap';
  subControls.style.marginTop = '15px';
  
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
