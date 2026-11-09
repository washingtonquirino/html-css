// --- ESTADO DO JOGO ---
let currentLevel = 1;
let score = 0;
let isAnimating = false;
let animationFrameId = null;

// Toggles Visuais
let showHeightCounter = false;
let showRuler = true;

// Parâmetros da função quadrática: y = ax^2 + bx + c
let params = {
  a: -0.50,
  b: 5.00,
  c: 0.00
};

// Distâncias fixas definidas por fase (em metros)
const distanciasPorNivel = [10, 16, 22, 28, 34, 40, 46, 52];
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

// Botão: Alternar Indicador de Altura
btnToggleHeight.addEventListener('click', () => {
  showHeightCounter = !showHeightCounter;
  btnToggleHeight.textContent = `Indicador de Altura (Y): ${showHeightCounter ? 'ON' : 'OFF'}`;
  btnToggleHeight.classList.toggle('active', showHeightCounter);
  btnToggleHeight.setAttribute('aria-pressed', showHeightCounter);

  if (!isAnimating) drawStaticScene();
});

// Botão: Alternar Régua de Distância
btnToggleRuler.addEventListener('click', () => {
  showRuler = !showRuler;
  btnToggleRuler.textContent = `Régua de Distância (X): ${showRuler ? 'ON' : 'OFF'}`;
  btnToggleRuler.classList.toggle('active', showRuler);
  btnToggleRuler.setAttribute('aria-pressed', showRuler);

  if (!isAnimating) drawStaticScene();
});

// --- RENDERIZAÇÃO DO CANVAS ---

const SCALE = 16; // Escala: 1 metro no jogo = 16 pixels no canvas
const ORIGIN_X = 50;

function getOriginY() {
  return canvas.height - 50;
}

// Desenha a Régua de Distância (Eixo X)
function drawRuler(originY) {
  if (!showRuler) return;

  ctx.strokeStyle = '#64748b';
  ctx.fillStyle = '#94a3b8';
  ctx.font = '10px monospace';
  ctx.textAlign = 'center';
  ctx.lineWidth = 1;

  const maxMeters = Math.floor((canvas.width - ORIGIN_X) / SCALE);

  for (let m = 0; m <= maxMeters; m += 2) {
    const xPos = ORIGIN_X + m * SCALE;

    // Marcador
    ctx.beginPath();
    ctx.moveTo(xPos, originY);
    ctx.lineTo(xPos, originY + (m % 10 === 0 ? 12 : 6));
    ctx.stroke();

    // Rótulo a cada 5 metros
    if (m % 5 === 0) {
      ctx.fillText(`${m}m`, xPos, originY + 24);
    }
  }
}

function drawStaticScene() {
  const originY = getOriginY();
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Desenha o Solo
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(0, originY, canvas.width, canvas.height - originY);

  // Linha do Eixo X
  ctx.strokeStyle = '#475569';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, originY);
  ctx.lineTo(canvas.width, originY);
  ctx.stroke();

  // Desenha a Régua
  drawRuler(originY);

  // Desenha o Avatar (Lançador)
  ctx.fillStyle = '#6366f1';
  ctx.fillRect(ORIGIN_X - 15, originY - 30, 15, 30);

  // Desenha o Alvo
  const targetPixelX = ORIGIN_X + targetX * SCALE;
  ctx.fillStyle = '#ef4444';
  ctx.beginPath();
  ctx.arc(targetPixelX, originY - 8, 12, 0, Math.PI * 2);
  ctx.fill();

  // Centro do Alvo
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(targetPixelX, originY - 8, 5, 0, Math.PI * 2);
  ctx.fill();

  // Etiqueta com a posição exata do alvo
  if (showRuler) {
    ctx.fillStyle = '#ef4444';
    ctx.font = 'bold 11px sans-serif';
    ctx.fillText(`Alvo: ${targetX}m`, targetPixelX, originY - 26);
  }
}

// --- ANIMAÇÃO DE LANÇAMENTO ---

function launchProjectile() {
  if (isAnimating) return;
  
  isAnimating = true;
  btnLaunch.disabled = true;
  feedbackDisplay.className = 'feedback-box';
  feedbackDisplay.textContent = '';

  let currentX = 0;
  const originY = getOriginY();

  function animate() {
    drawStaticScene();

    const mathY = getQuadraticY(currentX, params.a, params.b, params.c);
    const pixelX = ORIGIN_X + currentX * SCALE;
    const pixelY = originY - mathY * SCALE;

    // Linha vertical de projeção até o eixo X (se a régua estiver ligada)
    if (showRuler) {
      ctx.strokeStyle = 'rgba(245, 158, 11, 0.4)';
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(pixelX, pixelY);
      ctx.lineTo(pixelX, originY);
      ctx.stroke();
      ctx.setLineDash([]); // Reseta o estilo tracejado
    }

    // Desenha o Projétil
    ctx.fillStyle = '#0bf513';
    ctx.beginPath();
    ctx.arc(pixelX, pixelY, 6, 0, Math.PI * 2);
    ctx.fill();

    // Indicador de Altura (Y)
    if (showHeightCounter) {
      const displayY = Math.max(0, mathY).toFixed(1);
      
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(pixelX - 25, pixelY - 32, 50, 20, 4);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`y: ${displayY}m`, pixelX, pixelY - 18);
    }

    currentX += 0.1;

    // Colisão com o chão ou saída da tela
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

// --- AVALIAÇÃO DE RESULTADOS E PROGRESSÃO ---

function evaluateHit(finalX) {
  const hitDistance = Math.abs(finalX - targetX);
  const isHit = hitDistance <= 1.2;

  if (isHit) {
    score += 100;
    scoreDisplay.textContent = score;
    feedbackDisplay.className = 'feedback-box success';
    feedbackDisplay.textContent = 'Excelente! Você acertou o alvo ajustando a parábola!';

    setTimeout(() => {
      advanceLevel();
    }, 2000);
  } else {
    const { x1, x2 } = solveQuadratic(params.a, params.b, params.c);
    const positiveRoot = Math.max(x1 || 0, x2 || 0);
    
    feedbackDisplay.className = 'feedback-box error';
    feedbackDisplay.textContent = `O projétil atingiu o chão em x ≈ ${positiveRoot.toFixed(1)}m. O alvo está em ${targetX}m. Ajuste os parâmetros!`;
  }
}

function advanceLevel() {
  currentLevel++;
  levelDisplay.textContent = currentLevel;

  // Busca a distância na lista predefinida ou incrementa se exceder
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

// Inicializa a cena
updateControls();