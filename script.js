// Game configuration and state variables
const GOAL_CANS = 15;        // Total items needed to collect
const MILESTONES = [5, 10, 15];
const GAME_DURATION = 40;
const OBSTACLE_CHANCE = 0.5;
const BASE_SPAWN_RATE = 650;
const CONFETTI_COLORS = ['#ffc907', '#003b66', '#77a8bb', '#fed8c1', '#bf6c46', '#cbccd1'];
let currentCans = 0;         // Current number of items collected
let gameActive = false;      // Tracks if game is currently running
let spawnInterval;          // Holds the interval for spawning items
let timerInterval;
let confettiTimeout;
let timeLeft = GAME_DURATION;
let obstacleMode = false;
const reachedMilestones = new Set();

function updateCounterDisplay() {
  document.getElementById('current-cans').textContent = currentCans;
}

function updateTimerDisplay() {
  document.getElementById('timer').textContent = timeLeft;
}

function getSpawnRate() {
  return BASE_SPAWN_RATE;
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
  MILESTONES.forEach(function (milestone) {
    if (currentCans >= milestone && !reachedMilestones.has(milestone)) {
      reachedMilestones.add(milestone);
      if (milestone === GOAL_CANS) {
        setFeedback('Victory! You delivered enough water to win.', false);
      } else {
        setFeedback('Milestone reached: ' + milestone + ' jugs collected!', false);
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

// Spawns a new item in a random grid cell
function spawnWaterCan() {
  if (!gameActive) return; // Stop if the game is not active
  const cells = document.querySelectorAll('.grid-cell');
  
  // Clear all cells before spawning a new water can
  cells.forEach(cell => (cell.innerHTML = ''));

  // Select a random cell from the grid to place the water can
  const randomCell = cells[Math.floor(Math.random() * cells.length)];
  const spawnObstacle = obstacleMode && Math.random() < OBSTACLE_CHANCE;

  // Use a template literal to create the wrapper and water-can element
  randomCell.innerHTML = `
    <div class="water-can-wrapper">
      <div class="${spawnObstacle ? 'obstacle' : 'water-can'}">${spawnObstacle ? '!' : ''}</div>
    </div>
  `;
}

// Initializes and starts a new game
function startGame() {
  if (gameActive) return; // Prevent starting a new game if one is already active
  gameActive = true;
  clearConfetti();
  obstacleMode = document.getElementById('obstacles-enabled').checked;
  currentCans = 0;
  timeLeft = GAME_DURATION;
  reachedMilestones.clear();
  updateCounterDisplay();
  updateTimerDisplay();
  setFeedback(obstacleMode ? 'Obstacle mode enabled. Watch out for hazards.' : 'Game on! Click water jugs to collect them.', false);
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
  currentCans = 0;
  timeLeft = GAME_DURATION;
  reachedMilestones.clear();
  updateCounterDisplay();
  updateTimerDisplay();
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
    clickedCell.innerHTML = '';
    return;
  }

  const canInCell = clickedCell.querySelector('.water-can');
  if (!canInCell) return;

  currentCans += 1;
  updateCounterDisplay();
  setFeedback('Great catch! Keep going.', false);
  flashStat('good');
  checkMilestones();
  clickedCell.innerHTML = '';

  if (currentCans >= GOAL_CANS) {
    launchConfetti();
    endGame();
  }
});

// Set up click handler for the start button
document.getElementById('start-game').addEventListener('click', startGame);
document.getElementById('reset-game').addEventListener('click', resetGame);
