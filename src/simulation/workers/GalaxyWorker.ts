/**
 * Web Worker for procedural Galaxy generation.
 * Offloads heavy mathematical calculations for star distributions.
 */

self.onmessage = (e: MessageEvent) => {
  const { config, starCount, coreCount, dustCount, nurseryCount } = e.data;

  // 1. Generate Disk Stars
  const starPos = new Float32Array(starCount * 3);
  const starCol = new Float32Array(starCount * 3);
  const starSiz = new Float32Array(starCount);
  const starProx = new Float32Array(starCount);

  const innerCol = { r: 1.0, g: 0.8, b: 0.53 }; // #ffcc88
  const outerCol = { r: 0.53, g: 0.8, b: 1.0 }; // #88ccff

  for (let i = 0; i < starCount; i++) {
    const i3 = i * 3;
    const radius = Math.random() * config.radius;
    const spinAngle = radius * config.spin;
    const branchAngle = ((i % config.branches) / config.branches) * Math.PI * 2;

    const randomX = Math.pow(Math.random(), config.randomnessPower) * (Math.random() < 0.5 ? 1 : -1) * config.randomness * radius;
    const randomZ = Math.pow(Math.random(), config.randomnessPower) * (Math.random() < 0.5 ? 1 : -1) * config.randomness * radius;
    const verticalDisp = (Math.random() - 0.5) * (0.8 / (radius + 1.0));

    starPos[i3] = Math.cos(branchAngle + spinAngle) * radius + randomX;
    starPos[i3 + 1] = verticalDisp;
    starPos[i3 + 2] = Math.sin(branchAngle + spinAngle) * radius + randomZ;

    const t = radius / config.radius;
    starCol[i3] = innerCol.r + (outerCol.r - innerCol.r) * t;
    starCol[i3+1] = innerCol.g + (outerCol.g - innerCol.g) * t;
    starCol[i3+2] = innerCol.b + (outerCol.b - innerCol.b) * t;
    
    starSiz[i] = 0.4 + Math.random() * 1.2;
    starProx[i] = 1.0 - (Math.abs(randomX) + Math.abs(randomZ)) / (config.randomness * radius);
  }

  // 2. Generate Bulge Stars
  const corePos = new Float32Array(coreCount * 3);
  const coreCol = new Float32Array(coreCount * 3);
  const coreSiz = new Float32Array(coreCount);
  for (let i = 0; i < coreCount; i++) {
    const i3 = i * 3;
    const r = Math.pow(Math.random(), 2.0) * config.coreRadius;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    corePos[i3] = r * Math.sin(phi) * Math.cos(theta);
    corePos[i3+1] = r * Math.sin(phi) * Math.sin(theta) * 0.6;
    corePos[i3+2] = r * Math.cos(phi);
    
    const mix = Math.random();
    coreCol[i3] = 1.0; coreCol[i3+1] = 0.95 - mix * 0.3; coreCol[i3+2] = 0.73 - mix * 0.5;
    coreSiz[i] = 0.8 + Math.random() * 1.5;
  }

  // Send back the results as Transferable Objects (very fast)
  self.postMessage({
    starPos, starCol, starSiz, starProx,
    corePos, coreCol, coreSiz
  }, [
    starPos.buffer, starCol.buffer, starSiz.buffer, starProx.buffer,
    corePos.buffer, coreCol.buffer, coreSiz.buffer
  ] as any);
};
