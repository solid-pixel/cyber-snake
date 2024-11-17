const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('scoreValue');
const restartButton = document.querySelector('.restart-button');
const nicknameModal = document.getElementById('nicknameModal');
const nicknameInput = document.getElementById('nicknameInput');
const startGameBtn = document.getElementById('startGameBtn');
const playerNameDisplay = document.getElementById('playerName');
const gameElements = document.getElementById('gameElements');
const highScoresTable = document.getElementById('highScoresTable');

// API endpoints
const API_URL = window.location.hostname === 'localhost' 
    ? 'http://localhost:3000/api'
    : 'https://cybersnake-server.onrender.com/api';

// Set canvas size
canvas.width = 400;
canvas.height = 400;

// Game constants
const GRID_SIZE = 20;
const SNAKE_COLOR = '#0ff';
const FOOD_COLOR = '#f0f';
const GAME_SPEED = 100;
const MAX_HIGH_SCORES = 10;

// Game variables
let snake = [];
let food = {};
let direction = 'right';
let score = 0;
let gameLoop;
let playerName = '';
let playerPassword = '';

// Load high scores from API
async function fetchHighScores() {
    try {
        const response = await fetch(`${API_URL}/scores`);
        const scores = await response.json();
        displayHighScores(scores);
    } catch (error) {
        console.error('Error fetching scores:', error);
    }
}

// Submit new score to API
async function submitScore(name, score) {
    try {
        const response = await fetch(`${API_URL}/scores`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                name, 
                score,
                password: playerPassword 
            }),
        });
        
        if (response.ok) {
            fetchHighScores(); // Refresh the scores display
        }
    } catch (error) {
        console.error('Error submitting score:', error);
    }
}

// Initialize nickname input
nicknameInput.focus();

// Add password input and error message elements
const passwordInput = document.createElement('input');
passwordInput.type = 'password';
passwordInput.id = 'passwordInput';
passwordInput.placeholder = 'ENTER PASSWORD';
passwordInput.maxLength = 20;
nicknameModal.querySelector('.modal-content').insertBefore(passwordInput, startGameBtn);

const errorMessage = document.createElement('div');
errorMessage.className = 'error-message';
errorMessage.style.display = 'none';
nicknameModal.querySelector('.modal-content').insertBefore(errorMessage, startGameBtn);

let nameCheckTimeout;
let isCheckingName = false;
let lastCheckedName = '';
let isNameAvailable = false;
let currentPassword = '';

// Check for saved credentials
const savedName = localStorage.getItem('playerName');
const savedPassword = localStorage.getItem('playerPassword');
if (savedName && savedPassword) {
    nicknameInput.value = savedName;
    passwordInput.value = savedPassword;
    checkNameAvailability(savedName, savedPassword);
}

async function checkNameAvailability(name, password) {
    if (!name || !password) return false;
    try {
        const response = await fetch(`${API_URL}/check-name`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ name, password }),
        });
        const data = await response.json();
        
        if (data.error) {
            console.error('Server error:', data.error);
            return false;
        }
        
        lastCheckedName = name;
        currentPassword = password;
        isNameAvailable = data.available || data.authenticated;
        return data.available || data.authenticated;
    } catch (error) {
        console.error('Error checking name:', error);
        return false;
    }
}

function updateStartButton(available, authenticated) {
    if (available || authenticated) {
        startGameBtn.style.display = 'block';
        startGameBtn.disabled = false;
        errorMessage.style.display = 'none';
    } else {
        startGameBtn.style.display = 'none';
        errorMessage.textContent = authenticated === false ? 'INCORRECT PASSWORD' : 'NAME ALREADY TAKEN';
        errorMessage.style.display = 'block';
    }
}

async function validateInput() {
    const name = nicknameInput.value.trim();
    const password = passwordInput.value.trim();
    
    if (!name || !password) {
        startGameBtn.style.display = 'none';
        return;
    }

    isCheckingName = true;
    errorMessage.style.display = 'none';
    startGameBtn.style.display = 'none';

    try {
        const response = await fetch(`${API_URL}/check-name`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ name, password }),
        });
        const data = await response.json();
        
        if (name === nicknameInput.value.trim() && password === passwordInput.value.trim()) {
            if (data.error) {
                errorMessage.textContent = data.error;
                errorMessage.style.display = 'block';
                startGameBtn.style.display = 'none';
            } else {
                updateStartButton(data.available, data.authenticated);
            }
        }
    } catch (error) {
        console.error('Error validating input:', error);
        errorMessage.textContent = 'CONNECTION ERROR';
        errorMessage.style.display = 'block';
        startGameBtn.style.display = 'none';
    } finally {
        isCheckingName = false;
    }
}

startGameBtn.addEventListener('click', async () => {
    const name = nicknameInput.value.trim();
    const password = passwordInput.value.trim();
    
    if (!name || !password) {
        errorMessage.textContent = 'NAME AND PASSWORD REQUIRED';
        errorMessage.style.display = 'block';
        return;
    }
    
    if (isCheckingName) {
        errorMessage.textContent = 'PLEASE WAIT...';
        errorMessage.style.display = 'block';
        return;
    }

    // Show loading state
    startGameBtn.disabled = true;
    errorMessage.textContent = 'AUTHENTICATING...';
    errorMessage.style.display = 'block';
    
    try {
        // Final verification
        const response = await fetch(`${API_URL}/check-name`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ name, password }),
        });
        const data = await response.json();

        if (data.error) {
            errorMessage.textContent = data.error;
            errorMessage.style.display = 'block';
            startGameBtn.style.display = 'none';
            return;
        }

        if (!data.available && !data.authenticated) {
            errorMessage.textContent = 'VERIFICATION FAILED';
            errorMessage.style.display = 'block';
            startGameBtn.style.display = 'none';
            return;
        }
        
        // Save credentials
        localStorage.setItem('playerName', name);
        localStorage.setItem('playerPassword', password);
        
        // Start the game
        playerName = name;
        playerPassword = password;
        nicknameModal.style.display = 'none';
        gameElements.style.display = 'block';
        playerNameDisplay.textContent = playerName;
        initGame();
    } catch (error) {
        console.error('Error starting game:', error);
        errorMessage.textContent = 'CONNECTION ERROR';
        errorMessage.style.display = 'block';
        startGameBtn.disabled = false;
    }
});

nicknameInput.addEventListener('input', () => {
    if (nameCheckTimeout) clearTimeout(nameCheckTimeout);
    startGameBtn.style.display = 'none';
    errorMessage.style.display = 'none';
    nameCheckTimeout = setTimeout(validateInput, 500);
});

passwordInput.addEventListener('input', () => {
    if (nameCheckTimeout) clearTimeout(nameCheckTimeout);
    startGameBtn.style.display = 'none';
    errorMessage.style.display = 'none';
    nameCheckTimeout = setTimeout(validateInput, 500);
});

nicknameInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        passwordInput.focus();
    }
});

passwordInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && startGameBtn.style.display === 'block' && !startGameBtn.disabled && !isCheckingName) {
        startGameBtn.click();
    }
});

function displayHighScores(scores) {
    highScoresTable.innerHTML = '';
    
    // Create header row
    const headerRow = document.createElement('div');
    headerRow.className = 'score-row';
    headerRow.innerHTML = `
        <div class="score-cell">RANK</div>
        <div class="score-cell">RUNNER</div>
        <div class="score-cell">SCORE</div>
        <div class="score-cell">DATE</div>
    `;
    highScoresTable.appendChild(headerRow);
    
    // Add score rows
    scores.forEach((score, index) => {
        const row = document.createElement('div');
        row.className = 'score-row';
        const date = new Date(score.date).toLocaleDateString();
        row.innerHTML = `
            <div class="score-cell">${index + 1}</div>
            <div class="score-cell">${score.name}</div>
            <div class="score-cell">${score.score}</div>
            <div class="score-cell">${date}</div>
        `;
        highScoresTable.appendChild(row);
    });
}

function initGame() {
    // Initialize snake
    snake = [
        { x: 5, y: 5 },
        { x: 4, y: 5 },
        { x: 3, y: 5 }
    ];
    
    // Reset score
    score = 0;
    scoreElement.textContent = score;
    
    // Set initial direction
    direction = 'right';
    
    // Place initial food
    spawnFood();
    
    // Clear any existing game loop
    if (gameLoop) clearInterval(gameLoop);
    
    // Start game loop
    gameLoop = setInterval(gameStep, GAME_SPEED);
}

function spawnFood() {
    food = {
        x: Math.floor(Math.random() * (canvas.width / GRID_SIZE)),
        y: Math.floor(Math.random() * (canvas.height / GRID_SIZE))
    };
    // Make sure food doesn't spawn on snake
    while (snake.some(segment => segment.x === food.x && segment.y === food.y)) {
        food = {
            x: Math.floor(Math.random() * (canvas.width / GRID_SIZE)),
            y: Math.floor(Math.random() * (canvas.height / GRID_SIZE))
        };
    }
}

function gameStep() {
    // Create new head based on direction
    const head = { ...snake[0] };
    switch (direction) {
        case 'up': head.y--; break;
        case 'down': head.y++; break;
        case 'left': head.x--; break;
        case 'right': head.x++; break;
    }
    
    // Check for collisions
    if (isCollision(head)) {
        gameOver();
        return;
    }
    
    // Add new head
    snake.unshift(head);
    
    // Check if snake ate food
    if (head.x === food.x && head.y === food.y) {
        score += 10;
        scoreElement.textContent = score;
        spawnFood();
    } else {
        // Remove tail if no food eaten
        snake.pop();
    }
    
    // Draw everything
    render();
}

function isCollision(head) {
    // Wall collision
    if (head.x < 0 || head.x >= canvas.width / GRID_SIZE ||
        head.y < 0 || head.y >= canvas.height / GRID_SIZE) {
        return true;
    }
    
    // Self collision
    return snake.some(segment => segment.x === head.x && segment.y === head.y);
}

function gameOver() {
    clearInterval(gameLoop);
    submitScore(playerName, score);
    
    ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.fillStyle = '#f0f';
    ctx.font = '30px "Share Tech Mono"';
    ctx.textAlign = 'center';
    ctx.fillText('GAME OVER', canvas.width / 2, canvas.height / 2);
    ctx.fillText(`SCORE: ${score}`, canvas.width / 2, canvas.height / 2 + 40);
}

function render() {
    // Clear canvas
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw snake with glow effect
    ctx.shadowBlur = 10;
    ctx.shadowColor = SNAKE_COLOR;
    ctx.fillStyle = SNAKE_COLOR;
    snake.forEach(segment => {
        ctx.fillRect(segment.x * GRID_SIZE, segment.y * GRID_SIZE, GRID_SIZE - 2, GRID_SIZE - 2);
    });
    
    // Draw food with glow effect
    ctx.shadowBlur = 15;
    ctx.shadowColor = FOOD_COLOR;
    ctx.fillStyle = FOOD_COLOR;
    ctx.fillRect(food.x * GRID_SIZE, food.y * GRID_SIZE, GRID_SIZE - 2, GRID_SIZE - 2);
    
    // Reset shadow
    ctx.shadowBlur = 0;
}

// Event listeners
document.addEventListener('keydown', (e) => {
    switch (e.key) {
        case 'ArrowUp':
            if (direction !== 'down') direction = 'up';
            break;
        case 'ArrowDown':
            if (direction !== 'up') direction = 'down';
            break;
        case 'ArrowLeft':
            if (direction !== 'right') direction = 'left';
            break;
        case 'ArrowRight':
            if (direction !== 'left') direction = 'right';
            break;
    }
});

restartButton.addEventListener('click', initGame);

// Initial high scores fetch
fetchHighScores();
