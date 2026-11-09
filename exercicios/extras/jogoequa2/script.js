// --- ESTADO DO JOGO ---
let currentLevel = 1;
let score = 0;
let isAnimating = false;
let animationFrameId = null;

// Parâmetros da função quadrática: y = ax^2 + bx + c
let params = {
  a: -1.0,
  b: 0.0,
  c: 1.0
};

// Alvo atual em metros
let targetX = 10;

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

// --- CÁLCULOS MATEMÁTICOS ---

// Retorna o valor de y para um dado x: f(x) = ax^2 + bx + c
function getQuadraticY(x, a, b, c) {
  return a * x * x + b * x + c;
}

// Executa o cálculo da fórmula de Bhaskara
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

  valA.textContent = params.a.toFixed(1);
  valB.textContent = params.b.toFixed(1);
  valC.textContent = params.c.toFixed(1);

  const signB = params.b >= 0 ? '+' : '';
  const signC = params.c >= 0 ? '+' : '';
  equationDisplay.textContent = `y = ${params.a.toFixed(1)}x² ${signB} ${params.b.toFixed(1)}x ${signC} ${params.c.toFixed(1)}`;

  if (!isAnimating) {
    drawStaticScene();
  }
}

// --- RENDERIZAÇÃO DO CANVAS ---

const SCALE = 12; // 1 metro no jogo = 12 pixels no canvas
const ORIGIN_X = 40;

function getOriginY() {
  return canvas.height - 40;
}

function drawStaticScene() {
  const originY = getOriginY();
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Desenha o Chão
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(0, originY, canvas.width, canvas.height - originY);

  // Linha do solo
  ctx.strokeStyle = '#475569';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, originY);
  ctx.lineTo(canvas.width, originY);
  ctx.stroke();

  // Desenha o Avatar (Lançador)
  ctx.fillStyle = '#6366f1';
  ctx.fillRect(ORIGIN_X - 15, originY - 30, 15, 30);

  // Desenha o Alvo
  const targetPixelX = ORIGIN_X + targetX * SCALE;
  ctx.fillStyle = '#ef4444';
  ctx.beginPath();
  ctx.arc(targetPixelX, originY - 8, 12, 0, Math.PI * 2);
  ctx.fill();

  // Centro do alvo
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(targetPixelX, originY - 8, 5, 0, Math.PI * 2);
  ctx.fill();
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

    // Desenha a trajetória/projétil
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.arc(pixelX, pixelY, 6, 0, Math.PI * 2);
    ctx.fill();

    currentX += 0.15;

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

  // Ajusta a posição do alvo dinamicamente para o próximo nível
  targetX = 8 + currentLevel * 4;

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