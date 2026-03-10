import './style.css';
import { SimulationManager, Epoch } from './simulation/SimulationManager';

const app = document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML = `
  <div id="canvas-container"></div>
  
  <!-- SHIP COCKPIT OVERLAY -->
  <div id="cockpit-hud">
    <div class="hud-corner top-left"></div>
    <div class="hud-corner top-right"></div>
    <div class="hud-corner bottom-left"></div>
    <div class="hud-corner bottom-right"></div>
    <div id="scanning-reticle" style="display: none;">
      <div class="reticle-line"></div>
      <div class="reticle-circle"></div>
    </div>
  </div>

  <!-- TOP TIMELINE -->
  <div id="timeline-hud">
    <div class="timeline-track">
      <div id="timeline-progress"></div>
      <div class="epoch-marker active" style="left: 0%" data-epoch="BIG_BANG" title="0s"></div>
      <div class="epoch-marker" style="left: 15%" data-epoch="PLASMA" title="1ms"></div>
      <div class="epoch-marker" style="left: 35%" data-epoch="STELLAR_DAWN" title="100My"></div>
      <div class="epoch-marker" style="left: 55%" data-epoch="GALAXY_FORMATION" title="1By"></div>
      <div class="epoch-marker" style="left: 75%" data-epoch="SOLAR_SYSTEM" title="9By"></div>
      <div class="epoch-marker" style="left: 95%" data-epoch="EARTH" title="13.8By"></div>
    </div>
    <div id="timeline-label">MISSION STATUS: SEARCHING FOR HABITABLE WORLD</div>
  </div>

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

  <div id="info-hud">
    <div id="info-header">
      <span id="epoch-tag">MISSION DATA</span>
      <h2 id="epoch-name">The Big Bang</h2>
    </div>
    <div id="info-body">
      <p id="epoch-desc">Space, time, and matter erupt from a singularity. The universe expands faster than light during cosmic inflation.</p>
    </div>
    
    <div id="scanner-hud" style="display: none;">
      <div class="scanner-header">ATMOSPHERIC SPECTROMETER</div>
      <div class="scan-bar"><div id="scan-o2" class="scan-fill" style="width: 0%"></div><span>O2</span></div>
      <div class="scan-bar"><div id="scan-h2o" class="scan-fill" style="width: 0%"></div><span>H2O</span></div>
      <div class="scan-bar"><div id="scan-c" class="scan-fill" style="width: 0%"></div><span>CARBON</span></div>
      <div id="habitability-score">ANALYZING...</div>
      <button id="btn-deploy-seed" style="display: none;">DEPLOY BIOLOGICAL SEED</button>
    </div>

    <div id="info-stats">
      <div class="stat-item">
        <span class="stat-label">COSMIC TIME</span>
        <span id="stat-time" class="stat-value">T + 0s</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">CORE TEMP</span>
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

const epochInfo: Record<string, any> = {
  BIG_BANG: { name: "The Big Bang", time: "T + 0 Seconds", temp: "10^32 Kelvin", desc: "Space, time, and matter erupt from a singularity. The universe expands faster than light during cosmic inflation." },
  PLASMA: { name: "Quark-Gluon Plasma", time: "T + 1 Microsecond", temp: "10^13 Kelvin", desc: "A chaotic, ultra-hot soup of fundamental particles. Protons and neutrons haven't even formed yet." },
  STELLAR_DAWN: { name: "Stellar Dawn", time: "T + 100 Million Years", temp: "60 Kelvin", desc: "Gravity pulls primordial gas together to ignite the very first stars, ending the Cosmic Dark Ages." },
  GALAXY_FORMATION: { name: "Galaxy Formation", time: "T + 1 Billion Years", temp: "20 Kelvin", desc: "Gigantic clusters of stars and gas collapse into the majestic spiral and elliptical structures we see today." },
  SOLAR_SYSTEM: { name: "The Solar System", time: "T + 9 Billion Years", temp: "2.7 Kelvin", desc: "A cloud of dust and gas collapses around a young star—our Sun—forming a protoplanetary disk." },
  EARTH: { name: "Planet Earth", time: "T + 13.8 Billion Years", temp: "288 Kelvin", desc: "Our home world. Witness the results of your successful biological seeding." }
};

const progress = document.getElementById('timeline-progress')!;
const epochName = document.getElementById('epoch-name')!;
const epochDesc = document.getElementById('epoch-desc')!;
const statTime = document.getElementById('stat-time')!;
const statTemp = document.getElementById('stat-temp')!;
const subControls = document.getElementById('sub-controls')!;
const planetMenu = document.getElementById('planet-menu')!;
const menuHeader = document.getElementById('menu-header')!;
const popup = document.getElementById('planet-popup')!;
const desc = document.getElementById('description')!;

const scannerHud = document.getElementById('scanner-hud')!;
const scanningReticle = document.getElementById('scanning-reticle')!;
const scanO2 = document.getElementById('scan-o2')!;
const scanH2O = document.getElementById('scan-h2o')!;
const scanC = document.getElementById('scan-c')!;
const habScore = document.getElementById('habitability-score')!;
const btnDeploy = document.getElementById('btn-deploy-seed')!;

function updateHUD(key: string) {
    const info = epochInfo[key];
    epochName.innerText = info.name;
    epochDesc.innerText = info.desc;
    statTime.innerText = info.time;
    statTemp.innerText = info.temp;
}

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
  scannerHud.style.display = 'none';
  scanningReticle.style.display = 'none';
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

            // TRIGGER SCANNER HUD
            scannerHud.style.display = 'block';
            scanningReticle.style.display = 'block';
            scanO2.style.width = `${planetData.scanData.o2}%`;
            scanH2O.style.width = `${planetData.scanData.h2o}%`;
            scanC.style.width = `${planetData.scanData.carbon}%`;
            const score = Math.round((planetData.scanData.o2 * 2 + planetData.scanData.h2o) / 2.5);
            habScore.innerText = `HABITABILITY: ${score}%`;
            habScore.style.color = score > 50 ? '#00ff88' : '#ff4444';
            btnDeploy.style.display = (planetData.name === 'Earth' && score > 50) ? 'block' : 'none';
        }
      } else {
        popup.style.display = 'none';
        scannerHud.style.display = 'none';
        scanningReticle.style.display = 'none';
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

function syncEpoch(key: string, pWidth: string) {
    progress.style.width = pWidth;
    document.querySelectorAll('.epoch-marker').forEach(m => {
        m.classList.toggle('active', (m as HTMLElement).dataset.epoch === key);
    });
    manager.setEpoch((Epoch as any)[key]);
    updateHUD(key);
    if (key === 'SOLAR_SYSTEM') showSolarSystemControls();
    else if (key === 'EARTH') showEarthControls();
    else hideSubControls();
}

document.querySelectorAll('.epoch-marker').forEach(marker => {
    marker.addEventListener('click', (e) => {
        const el = e.target as HTMLElement;
        syncEpoch(el.dataset.epoch!, el.style.left);
    });
});

document.getElementById('btn-bigbang')?.addEventListener('click', () => { syncEpoch('BIG_BANG', '0%'); desc.innerText = 'The Singularity expands into space-time.'; });
document.getElementById('btn-plasma')?.addEventListener('click', () => { syncEpoch('PLASMA', '15%'); desc.innerText = 'Quark-Gluon Plasma: A hot soup of fundamental particles.'; });
document.getElementById('btn-stellardawn')?.addEventListener('click', () => { syncEpoch('STELLAR_DAWN', '35%'); desc.innerText = 'Stellar Dawn: The first massive stars ignite.'; });
document.getElementById('btn-galaxy')?.addEventListener('click', () => { syncEpoch('GALAXY_FORMATION', '55%'); desc.innerText = 'Gravity pulls matter into galaxies.'; });
document.getElementById('btn-solar')?.addEventListener('click', () => { syncEpoch('SOLAR_SYSTEM', '75%'); desc.innerText = 'Sun and protoplanetary disk form.'; });
document.getElementById('btn-earth')?.addEventListener('click', () => { syncEpoch('EARTH', '95%'); desc.innerText = 'Blue marble teeming with life.'; });

btnDeploy.addEventListener('click', () => {
    alert("SEED DEPLOYED. KICKSTARTING EVOLUTION...");
    syncEpoch('EARTH', '95%');
    showEarthControls();
});
