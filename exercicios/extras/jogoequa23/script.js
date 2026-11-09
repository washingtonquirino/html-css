// --- ESTADO DO JOGO ---
let currentLevel = 1;
let score = 0;
let isAnimating = false;
let animationFrameId = null;

// Toggles Visuais
let showHeightCounter = false;
let showRuler = true;

// Estado de fogo e partículas
let fireParticles = [];
let targetOnFire = false;

// Parâmetros da função quadrática: y = ax^2 + bx + c
let params = {
  a: -0.5,
  b: 5.0,
  c: 0.0
};

// Distâncias fixas por nível (em metros)
const distanciasPorNivel = [10, 16, 22, 28, 35];
let targetX = distanciasPorNivel[0];

// --- ELEMENTOS DO DOM ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const inputA = document.getElementById('input-a');
const inputB = document.getElementById('input-b');
const inputC = document.getElementById('input-c');

const valA = document.getElementById('val-a');
const valB = document.getElementById('val-b');
const valC = document.getElementById('val-c');

const equationDisplay = document.getElementById('equation-display');
const levelDisplay = document.getElementById('level-display');
const scoreDisplay = document.getElementById('score-display');
const feedbackDisplay = document.getElementById('feedback');
const btnLaunch = document.getElementById('btn-launch');

const btnToggleHeight = document.getElementById('btn-toggle-height');
const btnToggleRuler = document.getElementById('btn-toggle-ruler');

// --- CÁLCULOS MATEMÁTICOS ---

function getQuadraticY(x, a, b, c) {
  return a * x * x + b * x + c;
}

function solveQuadratic(a, b, c) {
  const delta = b * b - 4 * a * c;
  if (delta < 0) return { delta, x1: null, x2: null };
  
  const x1 = (-b + Math.sqrt(delta)) / (2 * a);
  const x2 = (-b - Math.sqrt(delta)) / (2 * a);
  return { delta, x1, x2 };
}

// --- ATUALIZAÇÃO DA INTERFACE ---

function updateControls() {
  params.a = parseFloat(inputA.value);
  params.b = parseFloat(inputB.value);
  params.c = parseFloat(inputC.value);

  valA.textContent = params.a.toFixed(2);
  valB.textContent = params.b.toFixed(2);
  valC.textContent = params.c.toFixed(2);

  const signB = params.b >= 0 ? '+' : '';
  const signC = params.c >= 0 ? '+' : '';
  
  equationDisplay.textContent = `y = ${params.a.toFixed(2)}x² ${signB} ${params.b.toFixed(2)}x ${signC} ${params.c.toFixed(2)}`;

  if (!isAnimating) {
    drawStaticScene();
  }
}

btnToggleHeight.addEventListener('click', () => {
  showHeightCounter = !showHeightCounter;
  btnToggleHeight.textContent = `Indicador Altura (Y): ${showHeightCounter ? 'ON' : 'OFF'}`;
  btnToggleHeight.classList.toggle('active', showHeightCounter);
  btnToggleHeight.setAttribute('aria-pressed', showHeightCounter);

  if (!isAnimating) drawStaticScene();
});

btnToggleRuler.addEventListener('click', () => {
  showRuler = !showRuler;
  btnToggleRuler.textContent = `Régua Distância (X): ${showRuler ? 'ON' : 'OFF'}`;
  btnToggleRuler.classList.toggle('active', showRuler);
  btnToggleRuler.setAttribute('aria-pressed', showRuler);

  if (!isAnimating) drawStaticScene();
});

// --- DESENHO DO PLANO DE FUNDO (CENÁRIO ILUSTRADO) ---

const SCALE = 16;
const ORIGIN_X = 50;

function getOriginY() {
  return canvas.height - 50;
}

function drawBackground(originY) {
  // 1. Gradiente do Céu (Entardecer)
  const skyGradient = ctx.createLinearGradient(0, 0, 0, originY);
  skyGradient.addColorStop(0, '#0f172a');
  skyGradient.addColorStop(0.5, '#1e1b4b');
  skyGradient.addColorStop(1, '#311b92');
  ctx.fillStyle = skyGradient;
  ctx.fillRect(0, 0, canvas.width, originY);

  // 2. Sol / Lua de fundo
  ctx.fillStyle = 'rgba(253, 224, 71, 0.15)';
  ctx.beginPath();
  ctx.arc(700, 80, 50, 0, Math.PI * 2);
  ctx.fill();

  // 3. Montanhas ao fundo
  ctx.fillStyle = '#1e1b4b';
  ctx.beginPath();
  ctx.moveTo(0, originY);
  ctx.lineTo(120, originY - 90);
  ctx.lineTo(250, originY);
  ctx.lineTo(400, originY - 130);
  ctx.lineTo(580, originY);
  ctx.lineTo(720, originY - 70);
  ctx.lineTo(canvas.width, originY);
  ctx.fill();

  // 4. Gramado estilizado (Solo)
  const grassGradient = ctx.createLinearGradient(0, originY, 0, canvas.height);
  grassGradient.addColorStop(0, '#0e5729');
  grassGradient.addColorStop(1, '#0a7e23');
  ctx.fillStyle = grassGradient;
  ctx.fillRect(0, originY, canvas.width, canvas.height - originY);
}

function drawRuler(originY) {
  if (!showRuler) return;

  ctx.strokeStyle = '#0528ed';
  ctx.fillStyle = '#0a0a0a';
  ctx.font = 'bold 12px monospace';
  ctx.textAlign = 'center';
  ctx.lineWidth = 1;

  const maxMeters = Math.floor((canvas.width - ORIGIN_X) / SCALE);

  for (let m = 0; m <= maxMeters; m += 5) {
    const xPos = ORIGIN_X + m * SCALE;

    ctx.beginPath();
    ctx.moveTo(xPos, originY);
    ctx.lineTo(xPos, originY + (m % 10 === 0 ? 12 : 8));
    ctx.stroke();

    ctx.fillText(`${m}m`, xPos, originY + 24);
  }
}

function drawCannon(originY) {
  const cannonBaseY = originY - (params.c * SCALE);
  
  // Suporte da base
  ctx.fillStyle = '#334155';
  ctx.beginPath();
  ctx.arc(ORIGIN_X - 10, cannonBaseY, 14, Math.PI, 0);
  ctx.fill();

  // Roda do canhão
  ctx.fillStyle = '#0f172a';
  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(ORIGIN_X - 10, cannonBaseY, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Tubo do Canhão
  const angle = -Math.atan(params.b / 2);
  ctx.save();
  ctx.translate(ORIGIN_X - 10, cannonBaseY - 5);
  ctx.rotate(angle);

  ctx.fillStyle = '#475569';
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 2;
  ctx.fillRect(0, -6, 32, 12);
  ctx.strokeRect(0, -6, 32, 12);

  ctx.fillStyle = '#1e293b';
  ctx.fillRect(30, -8, 4, 16);
  ctx.restore();
}

function drawTargetFire(targetPixelX, originY) {
  if (!targetOnFire) return;

  for (let i = 0; i < 5; i++) {
    const offsetX = (Math.random() - 0.5) * 20;
    const offsetY = -Math.random() * 25;
    const radius = Math.random() * 6 + 2;

    ctx.fillStyle = Math.random() > 0.5 ? '#f97316' : '#ef4444';
    ctx.beginPath();
    ctx.arc(targetPixelX + offsetX, originY - 10 + offsetY, radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawStaticScene() {
  const originY = getOriginY();
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Desenha o cenário de fundo
  drawBackground(originY);

  // Linha do chão
  ctx.strokeStyle = '#2d22c5';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, originY);
  ctx.lineTo(canvas.width, originY);
  ctx.stroke();

  // Régua de Distância
  drawRuler(originY);

  // Canhão
  drawCannon(originY);

  // Alvo
  const targetPixelX = ORIGIN_X + targetX * SCALE;
  ctx.fillStyle = '#ef4444';
  ctx.beginPath();
  ctx.arc(targetPixelX, originY - 8, 12, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(targetPixelX, originY - 8, 5, 0, Math.PI * 2);
  ctx.fill();

  drawTargetFire(targetPixelX, originY);

  if (showRuler) {
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 11px sans-serif';
    ctx.fillText(`Alvo: ${targetX.toFixed(2)}m`, targetPixelX, originY - 26);
  }
}

// --- PARTÍCULAS DE FOGO DO PROJÉTIL ---

function createFireParticles(x, y) {
  for (let i = 0; i < 4; i++) {
    fireParticles.push({
      x: x + (Math.random() - 0.5) * 6,
      y: y + (Math.random() - 0.5) * 6,
      vx: (Math.random() - 0.8) * 1.5,
      vy: (Math.random() - 0.5) * 1.5,
      radius: Math.random() * 5 + 3,
      life: 1.0,
      color: Math.random() > 0.3 ? '#f97316' : '#eab308'
    });
  }
}

function updateAndDrawParticles() {
  for (let i = fireParticles.length - 1; i >= 0; i--) {
    const p = fireParticles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.life -= 0.05;
    p.radius *= 0.92;

    if (p.life <= 0 || p.radius < 0.5) {
      fireParticles.splice(i, 1);
      continue;
    }

    ctx.fillStyle = p.color;
    ctx.globalAlpha = p.life;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1.0;
  }
}

// --- ANIMAÇÃO DE LANÇAMENTO ---

function launchProjectile() {
  if (isAnimating) return;
  
  isAnimating = true;
  targetOnFire = false;
  btnLaunch.disabled = true;
  feedbackDisplay.className = 'feedback-box';
  feedbackDisplay.textContent = '';
  fireParticles = [];

  let currentX = 0;
  const originY = getOriginY();

  function animate() {
    drawStaticScene();

    const mathY = getQuadraticY(currentX, params.a, params.b, params.c);
    const pixelX = ORIGIN_X + currentX * SCALE;
    const pixelY = originY - mathY * SCALE;

    createFireParticles(pixelX, pixelY);
    updateAndDrawParticles();

    if (showRuler) {
      ctx.strokeStyle = 'rgba(250, 204, 21, 0.6)';
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(pixelX, pixelY);
      ctx.lineTo(pixelX, originY);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Bola de Canhão
    ctx.fillStyle = '#0f172a';
    ctx.strokeStyle = '#f97316';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(pixelX, pixelY, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Indicador de Altura
    if (showHeightCounter) {
      const displayY = Math.max(0, mathY).toFixed(2);
      
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(pixelX - 30, pixelY - 32, 60, 20, 4);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`y: ${displayY}m`, pixelX, pixelY - 18);
    }

    currentX += 0.05;

    if (pixelY >= originY && currentX > 0.1 || pixelX > canvas.width) {
      isAnimating = false;
      btnLaunch.disabled = false;
      evaluateHit(currentX);
      return;
    }

    animationFrameId = requestAnimationFrame(animate);
  }

  animate();
}

// --- AVALIAÇÃO DE RESULTADOS ---

function evaluateHit(finalX) {
  const hitDistance = Math.abs(finalX - targetX);
  const isHit = hitDistance <= 1.2;

  if (isHit) {
    score += 100;
    scoreDisplay.textContent = score;
    targetOnFire = true;

    feedbackDisplay.className = 'feedback-box success';
    feedbackDisplay.textContent = 'FOGO NO ALVO! Você acertou em cheio ajustando a parábola!';

    let fireDuration = 0;
    const fireInterval = setInterval(() => {
      drawStaticScene();
      fireDuration++;
      if (fireDuration > 30) {
        clearInterval(fireInterval);
        advanceLevel();
      }
    }, 50);

  } else {
    const { x1, x2 } = solveQuadratic(params.a, params.b, params.c);
    const positiveRoot = Math.max(x1 || 0, x2 || 0);
    
    feedbackDisplay.className = 'feedback-box error';
    feedbackDisplay.textContent = `O projétil atingiu o chão em x ≈ ${positiveRoot.toFixed(2)}m. O alvo está em ${targetX.toFixed(2)}m. Ajuste os parâmetros!`;
  }
}

function advanceLevel() {
  currentLevel++;
  levelDisplay.textContent = currentLevel;
  targetOnFire = false;

  targetX = distanciasPorNivel[currentLevel - 1] || (targetX + 6);

  feedbackDisplay.className = 'feedback-box';
  feedbackDisplay.textContent = '';
  drawStaticScene();
}

// --- EVENTOS E INICIALIZAÇÃO ---

inputA.addEventListener('input', updateControls);
inputB.addEventListener('input', updateControls);
inputC.addEventListener('input', updateControls);
btnLaunch.addEventListener('click', launchProjectile);

updateControls();