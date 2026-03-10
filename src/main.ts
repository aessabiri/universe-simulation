import './style.css';
import { SimulationManager, Epoch } from './simulation/SimulationManager';

const app = document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML = `
  <div id="canvas-container"></div>
  
  <!-- NEW TOP TIMELINE -->
  <div id="timeline-hud">
    <div class="timeline-track">
      <div id="timeline-progress"></div>
      <div class="epoch-marker" style="left: 0%" data-epoch="BIG_BANG" title="0s"></div>
      <div class="epoch-marker" style="left: 15%" data-epoch="PLASMA" title="1ms"></div>
      <div class="epoch-marker" style="left: 35%" data-epoch="STELLAR_DAWN" title="100My"></div>
      <div class="epoch-marker" style="left: 55%" data-epoch="GALAXY_FORMATION" title="1By"></div>
      <div class="epoch-marker" style="left: 75%" data-epoch="SOLAR_SYSTEM" title="9By"></div>
      <div class="epoch-marker" style="left: 95%" data-epoch="EARTH" title="13.8By"></div>
    </div>
    <div id="timeline-label">13.8 Billion Years of Cosmic History</div>
  </div>

  <!-- NEW INFO PANEL -->
  <div id="info-hud">
    <div id="info-header">
      <span id="epoch-tag">EPOCH</span>
      <h2 id="epoch-name">Big Bang</h2>
    </div>
    <div id="info-body">
      <p id="epoch-desc">The universe begins as a singularity, expanding rapidly in an event known as inflation.</p>
    </div>
    <div id="info-stats">
      <div class="stat-item">
        <span class="stat-label">TIME</span>
        <span id="stat-time" class="stat-value">T + 0s</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">TEMP</span>
        <span id="stat-temp" class="stat-value">10^32 K</span>
      </div>
    </div>
  </div>

  <div id="planet-menu" style="display: none;">
    <div id="menu-header" class="menu-header">Celestial Bodies</div>
    <div id="sub-controls"></div>
  </div>

  <div id="planet-popup" style="display: none;">
    <h2 id="popup-title"></h2>
    <p id="popup-info"></p>
    <div class="stat-row"><strong>Composition:</strong> <span id="popup-comp"></span></div>
    <div class="stat-row"><strong>Temperature:</strong> <span id="popup-temp"></span></div>
    <div class="stat-row"><strong>Atmosphere:</strong> <span id="popup-atmo"></span></div>
  </div>
`;

const container = document.querySelector<HTMLDivElement>('#canvas-container')!;
const manager = new SimulationManager(container);

// Epoch Content Database
const epochInfo: Record<string, any> = {
  BIG_BANG: {
    name: "The Big Bang",
    time: "T + 0 Seconds",
    temp: "10^32 Kelvin",
    desc: "Space, time, and matter erupt from a singularity. The universe expands faster than light during cosmic inflation."
  },
  PLASMA: {
    name: "Quark-Gluon Plasma",
    time: "T + 1 Microsecond",
    temp: "10^13 Kelvin",
    desc: "A chaotic, ultra-hot soup of fundamental particles. Protons and neutrons haven't even formed yet."
  },
  STELLAR_DAWN: {
    name: "Stellar Dawn",
    time: "T + 100 Million Years",
    temp: "60 Kelvin",
    desc: "Gravity pulls primordial gas together to ignite the very first stars, ending the Cosmic Dark Ages."
  },
  GALAXY_FORMATION: {
    name: "Galaxy Formation",
    time: "T + 1 Billion Years",
    temp: "20 Kelvin",
    desc: "Gigantic clusters of stars and gas collapse into the majestic spiral and elliptical structures we see today."
  },
  SOLAR_SYSTEM: {
    name: "The Solar System",
    time: "T + 9 Billion Years",
    temp: "2.7 Kelvin (Avg)",
    desc: "A cloud of dust and gas collapses around a young star—our Sun—forming a protoplanetary disk."
  },
  EARTH: {
    name: "Planet Earth",
    time: "T + 13.8 Billion Years",
    temp: "288 Kelvin",
    desc: "Our home planet today. A lush blue marble teeming with complex life and a protective atmosphere."
  }
};

const progress = document.getElementById('timeline-progress')!;
const epochName = document.getElementById('epoch-name')!;
const epochDesc = document.getElementById('epoch-desc')!;
const statTime = document.getElementById('stat-time')!;
const statTemp = document.getElementById('stat-temp')!;
const popup = document.getElementById('planet-popup')!;
const subControls = document.getElementById('sub-controls')!;
const planetMenu = document.getElementById('planet-menu')!;
const menuHeader = document.getElementById('menu-header')!;

function updateHUD(key: string) {
    const info = epochInfo[key];
    epochName.innerText = info.name;
    epochDesc.innerText = info.desc;
    statTime.innerText = info.time;
    statTemp.innerText = info.temp;
    
    // Animate HUD
    const hud = document.getElementById('info-hud')!;
    hud.classList.remove('hud-pulse');
    void hud.offsetWidth; // Trigger reflow
    hud.classList.add('hud-pulse');
}

// Timeline Markers
document.querySelectorAll('.epoch-marker').forEach(marker => {
    marker.addEventListener('click', (e) => {
        const el = e.target as HTMLElement;
        
        // Update active marker state
        document.querySelectorAll('.epoch-marker').forEach(m => m.classList.remove('active'));
        el.classList.add('active');

        const key = el.dataset.epoch!;
        progress.style.width = el.style.left;
        manager.setEpoch((Epoch as any)[key]);
        updateHUD(key);
        
        // Contextual Controls
        if (key === 'SOLAR_SYSTEM') showSolarSystemControls();
        else if (key === 'EARTH') showEarthControls();
        else hideSubControls();
    });
});

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
  menuHeader.innerText = 'Celestial Bodies';
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
            document.getElementById('popup-title')!.innerText = planetData.name;
            document.getElementById('popup-info')!.innerText = planetData.info;
            document.getElementById('popup-comp')!.innerText = planetData.composition;
            document.getElementById('popup-temp')!.innerText = planetData.temperature;
            document.getElementById('popup-atmo')!.innerText = planetData.atmosphere;
            popup.style.display = 'block';
        }
      } else {
        popup.style.display = 'none';
      }
    });
  });
}

function showEarthControls() {
  planetMenu.style.display = 'block';
  menuHeader.innerText = 'Earth Eras';
  subControls.innerHTML = '';
  const eras = [
    { name: 'Hadean (Lava)', val: 0.0 },
    { name: 'Archean (Water)', val: 0.4 },
    { name: 'Proterozoic (Ice)', val: 0.7 },
    { name: 'Modern (Life)', val: 1.0 }
  ];
  subControls.innerHTML = eras.map(era => `<button class="era-btn" data-val="${era.val}">${era.name}</button>`).join('');
  const btns = document.querySelectorAll('.era-btn');
  btns[btns.length - 1].classList.add('active');
  btns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.era-btn').forEach(b => b.classList.remove('active'));
      const targetBtn = e.target as HTMLButtonElement;
      targetBtn.classList.add('active');
      manager.setEarthStage(parseFloat(targetBtn.dataset.val!));
    });
  });
}
