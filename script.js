// Game configuration and state variables
const DIFFICULTIES = {
  easy: {
    label: 'Easy',
    goalCans: 10,
    duration: 30,
    spawnRate: 700
  },
  normal: {
    label: 'Normal',
    goalCans: 15,
    duration: 30,
    spawnRate: 400
  },
  hard: {
    label: 'Hard',
    goalCans: 20,
    duration: 30,
    spawnRate: 300
  }
};
const OBSTACLE_CHANCE = 0.5;
const CONFETTI_COLORS = ['#ffc907', '#003b66', '#77a8bb', '#fed8c1', '#bf6c46', '#cbccd1'];
const MILESTONE_MESSAGES = [
  { id: 'quarter', progress: 0.25, message: 'Nice start! You are 25% there.' },
  { id: 'half', progress: 0.5, message: 'Halfway there!' },
  { id: 'three-quarters', progress: 0.75, message: 'Almost there! 75% complete.' },
  { id: 'goal', progress: 1, message: 'Victory! You delivered enough water to win.' }
];
let currentCans = 0;         // Current number of items collected
let gameActive = false;      // Tracks if game is currently running
let spawnInterval;          // Holds the interval for spawning items
let timerInterval;
let confettiTimeout;
let backgroundFlashTimeout;
let audioContext;
let selectedDifficulty = 'normal';
let activeGoalCans = DIFFICULTIES[selectedDifficulty].goalCans;
let timeLeft = DIFFICULTIES[selectedDifficulty].duration;
let obstacleMode = false;
const reachedMilestones = new Set();

function updateCounterDisplay() {
  document.getElementById('current-cans').textContent = currentCans;
}

function updateTimerDisplay() {
  document.getElementById('timer').textContent = timeLeft;
}

function updateGoalDisplay() {
  document.getElementById('goal-cans').textContent = activeGoalCans;
}

function updateInstructions() {
  const instruction = document.getElementById('game-instructions');
  const config = DIFFICULTIES[selectedDifficulty];
  instruction.textContent =
    config.label + ' mode: collect ' +
    config.goalCans +
    ' jugs in ' +
    config.duration +
    's. Turn on obstacles for an extra challenge.';
}

function applyDifficultySettings() {
  const config = DIFFICULTIES[selectedDifficulty];
  activeGoalCans = config.goalCans;
  timeLeft = config.duration;
  updateGoalDisplay();
  updateTimerDisplay();
  updateInstructions();
}

function getSpawnRate() {
  return DIFFICULTIES[selectedDifficulty].spawnRate;
}

function restartSpawnLoop() {
  clearInterval(spawnInterval);
  spawnInterval = setInterval(spawnWaterCan, getSpawnRate());
}

function flashStat(type) {
  const stats = document.querySelector('.stats');
  if (!stats) return;

  stats.classList.remove('flash-good', 'flash-bad');
  stats.classList.add(type === 'bad' ? 'flash-bad' : 'flash-good');

  setTimeout(function () {
    stats.classList.remove('flash-good', 'flash-bad');
  }, 220);
}

function clearConfetti() {
  clearTimeout(confettiTimeout);
  const existingLayer = document.querySelector('.confetti-layer');
  if (existingLayer) {
    existingLayer.remove();
  }
}

function launchConfetti() {
  clearConfetti();

  const layer = document.createElement('div');
  layer.className = 'confetti-layer';

  for (let i = 0; i < 120; i++) {
    const piece = document.createElement('span');
    piece.className = 'confetti-piece';
    piece.style.left = Math.random() * 100 + 'vw';
    piece.style.backgroundColor = CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)];
    piece.style.animationDelay = Math.random() * 0.35 + 's';
    piece.style.animationDuration = 1.8 + Math.random() * 1.4 + 's';
    piece.style.opacity = (0.75 + Math.random() * 0.25).toFixed(2);
    piece.style.transform = 'translateY(-12vh) rotate(' + Math.random() * 360 + 'deg)';
    layer.appendChild(piece);
  }

  document.body.appendChild(layer);

  confettiTimeout = setTimeout(function () {
    layer.remove();
  }, 3800);
}

function flashBackgroundBlue() {
  clearTimeout(backgroundFlashTimeout);
  document.body.classList.add('flash-blue-bg');
  backgroundFlashTimeout = setTimeout(function () {
    document.body.classList.remove('flash-blue-bg');
  }, 1000);
}

function playJugPing() {
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return;

  if (!audioContext) {
    audioContext = new AudioCtx();
  }

  if (audioContext.state === 'suspended') {
    audioContext.resume();
  }

  const now = audioContext.currentTime;
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(880, now);
  oscillator.frequency.exponentialRampToValueAtTime(1320, now + 0.08);

  gainNode.gain.setValueAtTime(0.0001, now);
  gainNode.gain.exponentialRampToValueAtTime(0.16, now + 0.01);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.14);

  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);

  oscillator.start(now);
  oscillator.stop(now + 0.14);
}

function startTimer() {
  clearInterval(timerInterval);
  timerInterval = setInterval(function () {
    if (!gameActive) return;
    timeLeft -= 1;
    updateTimerDisplay();

    if (timeLeft <= 0) {
      setFeedback('Time is up! Try again and beat your score.', true);
      endGame();
    }
  }, 1000);
}

function setFeedback(message, isWarning) {
  const feedback = document.getElementById('achievements');
  feedback.textContent = message;
  feedback.classList.toggle('warning', Boolean(isWarning));
}

function checkMilestones() {
  MILESTONE_MESSAGES.forEach(function (milestone) {
    const threshold = Math.max(1, Math.ceil(activeGoalCans * milestone.progress));

    // Trigger each milestone once when the player reaches its threshold.
    if (currentCans >= threshold && !reachedMilestones.has(milestone.id)) {
      reachedMilestones.add(milestone.id);
      if (milestone.id === 'goal') {
        setFeedback(milestone.message, false);
      } else {
        setFeedback(milestone.message + ' (' + currentCans + '/' + activeGoalCans + ')', false);
      }
    }
  });
}

// Creates the 3x3 game grid where items will appear
function createGrid() {
  const grid = document.querySelector('.game-grid');
  grid.innerHTML = ''; // Clear any existing grid cells
  for (let i = 0; i < 9; i++) {
    const cell = document.createElement('div');
    cell.className = 'grid-cell'; // Each cell represents a grid square
    grid.appendChild(cell);
  }
}

// Ensure the grid is created when the page loads
createGrid();

function removeItemFromCell(cell, removalClass) {
  const wrapper = cell.querySelector('.water-can-wrapper');
  if (!wrapper) return;

  wrapper.classList.add(removalClass);
  setTimeout(function () {
    if (wrapper.parentElement === cell) {
      wrapper.remove();
    }
  }, 180);
}

function showImpact(cell, isWarning) {
  const impact = document.createElement('span');
  impact.className = 'impact-pop ' + (isWarning ? 'bad' : 'good');
  cell.appendChild(impact);

  setTimeout(function () {
    impact.remove();
  }, 220);
}

// Spawns a new item in a random grid cell
function spawnWaterCan() {
  if (!gameActive) return; // Stop if the game is not active
  const cells = document.querySelectorAll('.grid-cell');
  
  // Clear all cells before spawning a new water can
  cells.forEach(function (cell) {
    const existingWrapper = cell.querySelector('.water-can-wrapper');
    if (existingWrapper) {
      existingWrapper.remove();
    }
  });

  // Select a random cell from the grid to place the water can
  const randomCell = cells[Math.floor(Math.random() * cells.length)];
  const spawnObstacle = obstacleMode && Math.random() < OBSTACLE_CHANCE;

  const wrapper = document.createElement('div');
  wrapper.className = 'water-can-wrapper';

  const item = document.createElement('div');
  item.className = spawnObstacle ? 'obstacle' : 'water-can';
  if (spawnObstacle) {
    item.textContent = '!';
  }

  wrapper.appendChild(item);
  randomCell.appendChild(wrapper);
}

// Initializes and starts a new game
function startGame() {
  if (gameActive) return; // Prevent starting a new game if one is already active
  gameActive = true;
  clearConfetti();
  selectedDifficulty = document.getElementById('difficulty-level').value;
  obstacleMode = document.getElementById('obstacles-enabled').checked;
  activeGoalCans = DIFFICULTIES[selectedDifficulty].goalCans;
  currentCans = 0;
  timeLeft = DIFFICULTIES[selectedDifficulty].duration;
  reachedMilestones.clear();
  updateCounterDisplay();
  updateGoalDisplay();
  updateTimerDisplay();
  setFeedback(
    (obstacleMode ? 'Obstacle mode enabled. ' : '') +
      DIFFICULTIES[selectedDifficulty].label +
      ' mode started. Reach ' +
      activeGoalCans +
      ' jugs.',
    false
  );
  createGrid(); // Set up the game grid
  spawnWaterCan();
  restartSpawnLoop();
  startTimer();
}

function endGame() {
  gameActive = false; // Mark the game as inactive
  clearInterval(spawnInterval); // Stop spawning water cans
  clearInterval(timerInterval);
}

function resetGame() {
  endGame();
  clearConfetti();
  selectedDifficulty = document.getElementById('difficulty-level').value;
  applyDifficultySettings();
  currentCans = 0;
  reachedMilestones.clear();
  updateCounterDisplay();
  setFeedback('Game reset. Press Start Game to play.', false);
  createGrid();

  const stats = document.querySelector('.stats');
  if (stats) {
    stats.classList.remove('flash-good', 'flash-bad');
  }
}

document.querySelector('.game-grid').addEventListener('click', function (event) {
  if (!gameActive) return;

  const clickedCell = event.target.closest('.grid-cell');
  if (!clickedCell) return;

  const obstacleInCell = clickedCell.querySelector('.obstacle');
  if (obstacleInCell) {
    currentCans = Math.max(0, currentCans - 1);
    updateCounterDisplay();
    setFeedback('Obstacle hit! You lost 1 jug.', true);
    flashStat('bad');
    removeItemFromCell(clickedCell, 'item-removed-bad');
    showImpact(clickedCell, true);
    return;
  }

  const canInCell = clickedCell.querySelector('.water-can');
  if (!canInCell) return;

  currentCans += 1;
  updateCounterDisplay();
  playJugPing();
  flashBackgroundBlue();
  setFeedback('Great catch! Keep going.', false);
  flashStat('good');
  checkMilestones();
  removeItemFromCell(clickedCell, 'item-removed-good');
  showImpact(clickedCell, false);

  if (currentCans >= activeGoalCans) {
    launchConfetti();
    endGame();
  }
});

document.getElementById('difficulty-level').addEventListener('change', function (event) {
  selectedDifficulty = event.target.value;
  if (!gameActive) {
    applyDifficultySettings();
  }
});

// Set up click handler for the start button
document.getElementById('start-game').addEventListener('click', startGame);
document.getElementById('reset-game').addEventListener('click', resetGame);

applyDifficultySettings();
