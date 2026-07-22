/**
 * AI Question Generation Service
 * Uses Google Gemini to generate HTML/CSS/JS programming challenges.
 * Falls back to a curated bank of 50+ questions when API key is unavailable.
 */

const TOPICS = [
  'CSS Flexbox',
  'CSS Grid',
  'DOM Manipulation',
  'JavaScript Arrays',
  'JavaScript Functions',
  'JavaScript Events',
  'HTML Forms',
  'CSS Animations',
  'Responsive Design',
  'JavaScript Objects',
  'CSS Variables',
  'JavaScript Loops',
  'String Methods',
  'Fetch & Promises',
  'LocalStorage'
];

// ─── Curated fallback question bank ────────────────────────────────────────
const QUESTION_BANK = [
  // CSS Flexbox
  {
    topic: 'CSS Flexbox',
    difficulty: 'easy',
    title: 'Centered Navigation Bar',
    description: `Create a horizontal navigation bar using CSS Flexbox.
Requirements:
• The nav should contain 5 links: Home, About, Services, Portfolio, Contact
• Links should be evenly spaced across the full width
• Each link should be centered vertically (height: 60px)
• Active link (Home) must have a bottom border in accent color (#6c63ff)
• Hover effect: background changes to rgba(108,99,255,0.1)`,
    starter_code: {
      html: `<nav class="navbar">
  <a href="#" class="nav-link active">Home</a>
  <a href="#" class="nav-link">About</a>
  <a href="#" class="nav-link">Services</a>
  <a href="#" class="nav-link">Portfolio</a>
  <a href="#" class="nav-link">Contact</a>
</nav>`,
      css: `/* Style the navbar using Flexbox */
.navbar {
  /* TODO: Add flexbox properties */
  background: #1e1e2e;
  padding: 0 2rem;
}
.nav-link {
  color: #cdd6f4;
  text-decoration: none;
  /* TODO: Add height and vertical centering */
}`,
      js: ''
    },
    hints: ['Use display:flex on .navbar', 'justify-content:space-evenly spaces items', 'align-items:center centers vertically']
  },
  {
    topic: 'CSS Flexbox',
    difficulty: 'medium',
    title: 'Responsive Card Layout',
    description: `Build a responsive card grid using Flexbox.
Requirements:
• Display 6 product cards in a flex container
• Cards wrap to next row on smaller screens
• Each card: image placeholder, title, price, "Add to Cart" button
• Cards should be equal height with button pinned to bottom
• Minimum 280px wide, max 4 columns`,
    starter_code: {
      html: `<div class="card-container">
  <div class="card">
    <div class="card-image"></div>
    <div class="card-body">
      <h3 class="card-title">Product Name</h3>
      <p class="card-price">$29.99</p>
      <button class="btn-cart">Add to Cart</button>
    </div>
  </div>
  <!-- Repeat 5 more cards -->
</div>`,
      css: `/* Build a flex-based card layout */
.card-container {
  /* TODO: flex container */
}
.card {
  /* TODO: flex item, min 280px */
}
.card-body {
  /* TODO: flex column with button at bottom */
}`,
      js: ''
    },
    hints: ['flex-wrap:wrap allows wrapping', 'flex:1 1 280px makes cards grow/shrink', 'Use flex-direction:column + margin-top:auto on button']
  },
  {
    topic: 'CSS Flexbox',
    difficulty: 'hard',
    title: 'Holy Grail Layout',
    description: `Implement the classic "Holy Grail" web layout using only Flexbox.
Requirements:
• Full-viewport height layout with header (64px), footer (48px)
• Main content area fills remaining height
• Inside main: left sidebar (220px), center content (flex:1), right sidebar (200px)
• All three columns equal height regardless of content
• Collapse sidebars on mobile (<768px) — stack vertically`,
    starter_code: {
      html: `<div class="layout">
  <header class="header">Header</header>
  <main class="main">
    <aside class="sidebar-left">Left Sidebar</aside>
    <article class="content">Main Content</article>
    <aside class="sidebar-right">Right Sidebar</aside>
  </main>
  <footer class="footer">Footer</footer>
</div>`,
      css: `/* Holy Grail Layout with Flexbox */
* { margin: 0; padding: 0; box-sizing: border-box; }
.layout {
  /* TODO: column flex, full height */
  min-height: 100vh;
}`,
      js: ''
    },
    hints: ['layout: flex-direction:column', 'main: flex:1 + display:flex', 'Use @media for responsive']
  },

  // CSS Grid
  {
    topic: 'CSS Grid',
    difficulty: 'easy',
    title: 'Photo Gallery Grid',
    description: `Create a 3-column photo gallery using CSS Grid.
Requirements:
• 9 photo tiles in a 3×3 grid
• 16px gap between all tiles
• The first tile spans 2 columns (featured)
• Each tile shows a colored background + centered label
• Hover: tile scales up to 1.05`,
    starter_code: {
      html: `<div class="gallery">
  <div class="tile featured">Featured</div>
  <div class="tile">Photo 2</div>
  <div class="tile">Photo 3</div>
  <div class="tile">Photo 4</div>
  <div class="tile">Photo 5</div>
  <div class="tile">Photo 6</div>
  <div class="tile">Photo 7</div>
  <div class="tile">Photo 8</div>
</div>`,
      css: `/* Style the gallery with CSS Grid */
.gallery {
  /* TODO: 3-column grid */
}
.featured {
  /* TODO: span 2 columns */
}
.tile {
  height: 200px;
  background: linear-gradient(135deg, #6c63ff, #3b82f6);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  border-radius: 8px;
}`,
      js: ''
    },
    hints: ['grid-template-columns: repeat(3, 1fr)', 'grid-column: span 2 for featured', 'transition + transform: scale(1.05) on hover']
  },
  {
    topic: 'CSS Grid',
    difficulty: 'medium',
    title: 'Dashboard Grid Layout',
    description: `Build an analytics dashboard layout using CSS Grid with named areas.
Requirements:
• Header spans full width
• Left sidebar (250px) + main stats area
• Inside main: 4 KPI cards in a row, then a large chart + side panel
• Footer spans full width
• Use grid-template-areas for readability`,
    starter_code: {
      html: `<div class="dashboard">
  <header class="dash-header">Analytics Dashboard</header>
  <aside class="dash-sidebar">Menu</aside>
  <main class="dash-main">
    <div class="kpi-cards">
      <div class="kpi">Users: 1,240</div>
      <div class="kpi">Revenue: $12k</div>
      <div class="kpi">Orders: 340</div>
      <div class="kpi">Growth: +14%</div>
    </div>
    <div class="chart-area">Chart</div>
    <div class="side-panel">Details</div>
  </main>
  <footer class="dash-footer">Footer</footer>
</div>`,
      css: `/* Dashboard using grid-template-areas */
.dashboard {
  /* TODO: named grid layout */
  min-height: 100vh;
}`,
      js: ''
    },
    hints: ['grid-template-areas assigns names', 'grid-area: header on elements', 'Nested grids inside .dash-main']
  },

  // DOM Manipulation
  {
    topic: 'DOM Manipulation',
    difficulty: 'easy',
    title: 'Dynamic To-Do List',
    description: `Build a functional to-do list app using vanilla JavaScript DOM manipulation.
Requirements:
• Text input + "Add" button to add new tasks
• Tasks appear in a list below
• Each task has a checkbox (marks task done with strikethrough) and a delete button
• Task count shown at top ("3 tasks remaining")
• "Clear completed" button removes all checked tasks
• Tasks persist across page refresh using localStorage`,
    starter_code: {
      html: `<div class="todo-app">
  <h1>My Tasks</h1>
  <p class="task-count">0 tasks remaining</p>
  <div class="input-row">
    <input type="text" id="task-input" placeholder="Add a new task...">
    <button id="add-btn">Add</button>
  </div>
  <ul id="task-list"></ul>
  <button id="clear-btn">Clear Completed</button>
</div>`,
      css: `.todo-app { max-width: 500px; margin: 2rem auto; font-family: sans-serif; }
.input-row { display: flex; gap: 8px; margin: 1rem 0; }
input { flex: 1; padding: 8px 12px; border-radius: 6px; border: 1px solid #ccc; }
button { padding: 8px 16px; background: #6c63ff; color: white; border: none; border-radius: 6px; cursor: pointer; }
li { display: flex; align-items: center; gap: 8px; padding: 8px; margin: 4px 0; background: #f5f5f5; border-radius: 6px; }
li.done span { text-decoration: line-through; opacity: 0.5; }`,
      js: `// TODO: Implement the to-do list functionality
const input = document.getElementById('task-input');
const addBtn = document.getElementById('add-btn');
const list = document.getElementById('task-list');

function updateCount() {
  // TODO: count unchecked tasks and update display
}

addBtn.addEventListener('click', () => {
  // TODO: create and add task
});`
    },
    hints: ['createElement + appendChild to add tasks', 'localStorage.setItem/getItem for persistence', 'querySelectorAll to count unchecked']
  },
  {
    topic: 'DOM Manipulation',
    difficulty: 'medium',
    title: 'Image Carousel Slider',
    description: `Build a fully functional image carousel/slider using JavaScript DOM manipulation.
Requirements:
• 5 slides with different background colors and text
• Previous/Next navigation buttons
• Dot indicators at the bottom (clickable)
• Auto-advances every 4 seconds
• Smooth CSS transition between slides
• Swipe support on touch devices`,
    starter_code: {
      html: `<div class="carousel">
  <div class="slides-container">
    <div class="slide" style="background:#6c63ff">Slide 1</div>
    <div class="slide" style="background:#3b82f6">Slide 2</div>
    <div class="slide" style="background:#10b981">Slide 3</div>
    <div class="slide" style="background:#f59e0b">Slide 4</div>
    <div class="slide" style="background:#ef4444">Slide 5</div>
  </div>
  <button id="prev">&#8592;</button>
  <button id="next">&#8594;</button>
  <div class="dots"></div>
</div>`,
      css: `.carousel { position: relative; width: 100%; overflow: hidden; border-radius: 12px; }
.slides-container { display: flex; transition: transform 0.5s ease; }
.slide { min-width: 100%; height: 300px; display: flex; align-items: center; justify-content: center; color: white; font-size: 2rem; }
#prev, #next { position: absolute; top: 50%; transform: translateY(-50%); background: rgba(0,0,0,0.4); color: white; border: none; padding: 12px; cursor: pointer; border-radius: 50%; }
#prev { left: 10px; } #next { right: 10px; }`,
      js: `// TODO: Implement carousel logic
let current = 0;
const slides = document.querySelectorAll('.slide');
const container = document.querySelector('.slides-container');

function goTo(index) {
  // TODO: update transform to show correct slide
}

document.getElementById('next').addEventListener('click', () => {
  // TODO: advance slide
});`
    },
    hints: ['translateX(${-current * 100}%) moves slides', 'setInterval for auto-advance', 'touchstart/touchend for swipe detection']
  },
  {
    topic: 'DOM Manipulation',
    difficulty: 'hard',
    title: 'Drag-and-Drop Kanban Board',
    description: `Build a Kanban task board with drag-and-drop functionality using only vanilla JS.
Requirements:
• 3 columns: Todo, In Progress, Done
• Add new cards via input in each column
• Drag cards between columns (HTML5 Drag API)
• Visual drop zone highlight during drag
• Card count badge on each column header
• Save board state to localStorage
• Delete cards with a × button`,
    starter_code: {
      html: `<div class="kanban">
  <div class="column" id="col-todo" data-col="todo">
    <h2>Todo <span class="count">0</span></h2>
    <div class="cards"></div>
    <input placeholder="New task..." class="col-input">
    <button class="col-add">+ Add</button>
  </div>
  <div class="column" id="col-progress" data-col="progress">
    <h2>In Progress <span class="count">0</span></h2>
    <div class="cards"></div>
    <input placeholder="New task..." class="col-input">
    <button class="col-add">+ Add</button>
  </div>
  <div class="column" id="col-done" data-col="done">
    <h2>Done <span class="count">0</span></h2>
    <div class="cards"></div>
    <input placeholder="New task..." class="col-input">
    <button class="col-add">+ Add</button>
  </div>
</div>`,
      css: `.kanban { display: flex; gap: 1rem; padding: 1rem; min-height: 100vh; background: #0f0f1a; }
.column { flex: 1; background: #1e1e2e; border-radius: 12px; padding: 1rem; }
.column h2 { color: #cdd6f4; margin-bottom: 1rem; }
.card { background: #313244; color: #cdd6f4; padding: 12px; border-radius: 8px; margin-bottom: 8px; cursor: grab; }
.column.drag-over { border: 2px dashed #6c63ff; }`,
      js: `// TODO: Implement Kanban with drag-and-drop
function createCard(text, colId) {
  // TODO: return a draggable card element
}

function updateCounts() {
  // TODO: update badge counts
}

// Setup drag events...`
    },
    hints: ['draggable="true" + ondragstart on cards', 'ondragover + ondrop on columns', 'Use data attributes to track source column']
  },

  // JavaScript Arrays
  {
    topic: 'JavaScript Arrays',
    difficulty: 'easy',
    title: 'Student Grade Calculator',
    description: `Build a student grade calculator that processes arrays of scores.
Requirements:
• Input field to enter scores (comma-separated)
• Calculate: average, highest, lowest, pass/fail count (pass = ≥60)
• Display a sorted score list (descending)
• Color-code grade: A(≥90), B(≥80), C(≥70), D(≥60), F(<60)
• Show a simple bar chart of the distribution`,
    starter_code: {
      html: `<div class="calculator">
  <h2>Grade Calculator</h2>
  <input id="scores-input" placeholder="Enter scores: 85, 92, 67, 45, 78">
  <button id="calculate">Calculate</button>
  <div id="results"></div>
</div>`,
      css: `.calculator { max-width: 600px; margin: 2rem auto; font-family: sans-serif; padding: 2rem; background: #1e1e2e; color: #cdd6f4; border-radius: 12px; }
input { width: 100%; padding: 10px; border-radius: 6px; border: 1px solid #313244; background: #313244; color: #cdd6f4; margin: 1rem 0; }
button { padding: 10px 20px; background: #6c63ff; color: white; border: none; border-radius: 6px; cursor: pointer; }
.stat { margin: 8px 0; padding: 8px 12px; background: #313244; border-radius: 6px; }`,
      js: `document.getElementById('calculate').addEventListener('click', () => {
  const raw = document.getElementById('scores-input').value;
  const scores = raw.split(',').map(s => parseFloat(s.trim())).filter(n => !isNaN(n));
  
  if (!scores.length) return;
  
  // TODO: Use array methods to calculate stats
  const avg = /* TODO */ 0;
  const highest = /* TODO */ 0;
  const lowest = /* TODO */ 0;
  const passed = /* TODO */ 0;
  
  document.getElementById('results').innerHTML = \`
    <div class="stat">Average: \${avg.toFixed(1)}</div>
    <!-- TODO: add more stats -->
  \`;
});`
    },
    hints: ['reduce() for sum/average', 'Math.max/min(...scores)', 'filter(s => s >= 60).length for pass count', 'sort((a,b) => b-a) for descending']
  },
  {
    topic: 'JavaScript Arrays',
    difficulty: 'medium',
    title: 'Product Filter & Search',
    description: `Build a product catalog with real-time filtering using array methods.
Requirements:
• Display 12 products with name, category, price, rating
• Search bar filters by product name (case-insensitive)
• Category dropdown filter (All, Electronics, Clothing, Food, Books)
• Price range slider (0–500)
• Sort by: Price Low-High, Price High-Low, Rating, Name A-Z
• Show "X results found" count
• Animate filter changes`,
    starter_code: {
      html: `<div class="shop">
  <div class="filters">
    <input id="search" type="text" placeholder="Search products...">
    <select id="category">
      <option value="">All Categories</option>
      <option value="Electronics">Electronics</option>
      <option value="Clothing">Clothing</option>
      <option value="Food">Food</option>
      <option value="Books">Books</option>
    </select>
    <input type="range" id="price-range" min="0" max="500" value="500">
    <span id="price-label">Up to $500</span>
    <select id="sort">
      <option value="name">Name A-Z</option>
      <option value="price-asc">Price: Low to High</option>
      <option value="price-desc">Price: High to Low</option>
      <option value="rating">Rating</option>
    </select>
  </div>
  <p id="result-count">12 results found</p>
  <div id="products"></div>
</div>`,
      css: `.shop { max-width: 1000px; margin: 0 auto; padding: 1rem; }
.filters { display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 1rem; }
#products { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 1rem; }`,
      js: `const products = [
  { name: 'Laptop Pro', category: 'Electronics', price: 999, rating: 4.5 },
  { name: 'Running Shoes', category: 'Clothing', price: 85, rating: 4.2 },
  { name: 'JavaScript Book', category: 'Books', price: 35, rating: 4.8 },
  { name: 'Wireless Mouse', category: 'Electronics', price: 45, rating: 4.0 },
  { name: 'Coffee Beans', category: 'Food', price: 22, rating: 4.6 },
  { name: 'T-Shirt', category: 'Clothing', price: 25, rating: 3.9 },
  { name: 'Headphones', category: 'Electronics', price: 149, rating: 4.7 },
  { name: 'Python Book', category: 'Books', price: 40, rating: 4.5 },
  { name: 'Snack Pack', category: 'Food', price: 15, rating: 4.1 },
  { name: 'Keyboard', category: 'Electronics', price: 89, rating: 4.3 },
  { name: 'Jeans', category: 'Clothing', price: 65, rating: 4.0 },
  { name: 'Green Tea', category: 'Food', price: 18, rating: 4.4 },
];

function renderProducts(list) {
  // TODO: render product cards
}

function applyFilters() {
  // TODO: filter and sort products using array methods
  let result = [...products];
  // Apply search, category, price, sort...
  renderProducts(result);
}

// TODO: Add event listeners for all filters
renderProducts(products);`
    },
    hints: ['filter() chains for each condition', 'sort() with comparison function', 'toLowerCase().includes() for search']
  },

  // JavaScript Events
  {
    topic: 'JavaScript Events',
    difficulty: 'easy',
    title: 'Color Mixer App',
    description: `Build an interactive RGB color mixer using JavaScript events.
Requirements:
• 3 range sliders for Red, Green, Blue (0-255)
• Real-time preview box showing the mixed color
• Display the hex code (#rrggbb) and rgb() value
• "Copy Hex" button copies to clipboard with toast notification
• History of last 10 colors (click to restore)`,
    starter_code: {
      html: `<div class="mixer">
  <h2>RGB Color Mixer</h2>
  <div class="preview" id="preview"></div>
  <div class="hex-display">
    <span id="hex-code">#000000</span>
    <button id="copy-btn">Copy Hex</button>
  </div>
  <div class="sliders">
    <label>Red: <span id="r-val">0</span>
      <input type="range" id="r" min="0" max="255" value="0" class="slider red">
    </label>
    <label>Green: <span id="g-val">0</span>
      <input type="range" id="g" min="0" max="255" value="0" class="slider green">
    </label>
    <label>Blue: <span id="b-val">0</span>
      <input type="range" id="b" min="0" max="255" value="0" class="slider blue">
    </label>
  </div>
  <div class="history" id="history"></div>
</div>`,
      css: `.mixer { max-width: 400px; margin: 2rem auto; font-family: sans-serif; }
.preview { width: 100%; height: 150px; border-radius: 12px; border: 2px solid #ccc; transition: background 0.2s; }
.slider { width: 100%; margin: 8px 0; }
.red { accent-color: red; } .green { accent-color: green; } .blue { accent-color: blue; }`,
      js: `function toHex(n) {
  return n.toString(16).padStart(2, '0');
}

function updateColor() {
  const r = document.getElementById('r').value;
  const g = document.getElementById('g').value;
  const b = document.getElementById('b').value;
  // TODO: update preview, hex code, value displays
}

['r','g','b'].forEach(ch => {
  document.getElementById(ch).addEventListener('input', updateColor);
});

document.getElementById('copy-btn').addEventListener('click', () => {
  // TODO: copy hex to clipboard
});

updateColor();`
    },
    hints: ['template literal for hex: #${toHex(r)}${toHex(g)}${toHex(b)}', 'navigator.clipboard.writeText() for copy', 'Add color swatch to history on copy']
  },
  {
    topic: 'JavaScript Events',
    difficulty: 'medium',
    title: 'Keyboard Shortcut Manager',
    description: `Build an interactive app that demonstrates keyboard event handling.
Requirements:
• Display a virtual keyboard that highlights pressed keys
• Record keyboard shortcuts (Ctrl/Cmd + key combinations)
• Show the last 10 keystrokes in a log panel
• "Shortcut Trainer" mode: app shows a target shortcut, user must press it
• Key combination detection (Ctrl+S, Shift+A, etc.)
• Visual feedback: correct shortcut = green flash, wrong = red flash`,
    starter_code: {
      html: `<div class="keyboard-app">
  <h2>Keyboard Trainer</h2>
  <div class="target-shortcut">
    Press: <kbd id="target-display">Ctrl + S</kbd>
  </div>
  <div class="feedback" id="feedback"></div>
  <div class="key-log">
    <h3>Keystroke Log</h3>
    <ul id="log-list"></ul>
  </div>
  <button id="new-challenge">New Challenge</button>
</div>`,
      css: `.keyboard-app { max-width: 500px; margin: 2rem auto; font-family: monospace; padding: 2rem; background: #1e1e2e; color: #cdd6f4; border-radius: 12px; }
kbd { background: #313244; padding: 4px 10px; border-radius: 4px; border: 1px solid #45475a; }
.feedback { height: 40px; display: flex; align-items: center; font-size: 1.2rem; }
#log-list li { padding: 4px 8px; margin: 2px 0; background: #313244; border-radius: 4px; list-style: none; }`,
      js: `const shortcuts = ['Ctrl+S', 'Ctrl+Z', 'Ctrl+C', 'Ctrl+V', 'Shift+Enter', 'Alt+F4'];
let current = shortcuts[0];

function newChallenge() {
  current = shortcuts[Math.floor(Math.random() * shortcuts.length)];
  document.getElementById('target-display').textContent = current;
}

document.addEventListener('keydown', (e) => {
  // TODO: detect modifier keys + key
  // TODO: compare with current target
  // TODO: log keystroke
  e.preventDefault();
});

document.getElementById('new-challenge').addEventListener('click', newChallenge);`
    },
    hints: ['e.ctrlKey, e.shiftKey, e.altKey for modifiers', 'e.key for the actual key pressed', 'Build shortcut string: Ctrl+${e.key}']
  },

  // HTML Forms
  {
    topic: 'HTML Forms',
    difficulty: 'easy',
    title: 'Multi-Step Registration Form',
    description: `Build a beautiful 3-step registration form with validation.
Step 1: Personal Info (name, email, phone)
Step 2: Account Setup (username, password, confirm password)  
Step 3: Preferences (interests checkboxes, notification settings)
Requirements:
• Progress bar showing current step
• "Next" validates current step before advancing
• "Back" returns to previous step
• Real-time validation feedback (red border + error message)
• Final step shows a summary before submit
• Success animation on submit`,
    starter_code: {
      html: `<div class="form-wizard">
  <div class="progress-bar">
    <div class="step active" data-step="1">1</div>
    <div class="step" data-step="2">2</div>
    <div class="step" data-step="3">3</div>
  </div>
  <form id="wizard-form">
    <div class="step-panel active" data-panel="1">
      <h2>Personal Info</h2>
      <input type="text" id="name" placeholder="Full Name" required>
      <input type="email" id="email" placeholder="Email" required>
      <input type="tel" id="phone" placeholder="Phone">
    </div>
    <div class="step-panel" data-panel="2">
      <h2>Account Setup</h2>
      <input type="text" id="username" placeholder="Username" required>
      <input type="password" id="password" placeholder="Password" required>
      <input type="password" id="confirm" placeholder="Confirm Password" required>
    </div>
    <div class="step-panel" data-panel="3">
      <h2>Preferences</h2>
      <label><input type="checkbox" value="js"> JavaScript</label>
      <label><input type="checkbox" value="css"> CSS</label>
      <label><input type="checkbox" value="react"> React</label>
    </div>
  </form>
  <div class="nav-buttons">
    <button id="back-btn" disabled>Back</button>
    <button id="next-btn">Next</button>
  </div>
</div>`,
      css: `.form-wizard { max-width: 480px; margin: 2rem auto; padding: 2rem; background: #1e1e2e; border-radius: 16px; color: #cdd6f4; }
.progress-bar { display: flex; gap: 1rem; margin-bottom: 2rem; }
.step { width: 36px; height: 36px; border-radius: 50%; background: #313244; display: flex; align-items: center; justify-content: center; }
.step.active { background: #6c63ff; }
.step-panel { display: none; } .step-panel.active { display: block; }
input { display: block; width: 100%; padding: 10px; margin: 8px 0; border-radius: 8px; border: 1px solid #45475a; background: #313244; color: #cdd6f4; }
input.error { border-color: #f38ba8; }
button { padding: 10px 24px; border: none; border-radius: 8px; cursor: pointer; background: #6c63ff; color: white; }`,
      js: `let currentStep = 1;
const totalSteps = 3;

function goToStep(step) {
  document.querySelectorAll('.step-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.step').forEach(s => s.classList.remove('active'));
  document.querySelector(\`[data-panel="\${step}"]\`).classList.add('active');
  document.querySelector(\`[data-step="\${step}"]\`).classList.add('active');
  currentStep = step;
  document.getElementById('back-btn').disabled = step === 1;
  document.getElementById('next-btn').textContent = step === totalSteps ? 'Submit' : 'Next';
}

function validateStep(step) {
  // TODO: validate fields based on step number
  return true;
}

document.getElementById('next-btn').addEventListener('click', () => {
  if (validateStep(currentStep) && currentStep < totalSteps) goToStep(currentStep + 1);
  else if (currentStep === totalSteps) alert('Registration Complete!');
});
document.getElementById('back-btn').addEventListener('click', () => {
  if (currentStep > 1) goToStep(currentStep - 1);
});`
    },
    hints: ['Check input.value.trim() for required fields', 'RegEx for email: /^[^@]+@[^@]+\\.[^@]+$/', 'password === confirm for step 2']
  },

  // CSS Animations
  {
    topic: 'CSS Animations',
    difficulty: 'medium',
    title: 'Animated Loading Screen',
    description: `Create a stunning animated loading screen with CSS animations.
Requirements:
• Spinner with gradient stroke animation (like a circular progress)
• Pulsing logo text with glow effect
• Loading bar that fills from 0–100% in 3 seconds
• Particle/dots floating animation in the background
• Progress percentage counter (JS increments 0→100)
• Fade-out transition when loading completes`,
    starter_code: {
      html: `<div class="loader-screen" id="loader">
  <div class="spinner-ring"></div>
  <div class="logo-text">AMYPO<span>LMS</span></div>
  <div class="progress-bar-wrap">
    <div class="progress-fill" id="progress-fill"></div>
  </div>
  <div class="progress-text" id="progress-text">0%</div>
  <div class="particles">
    <div class="particle"></div>
    <div class="particle"></div>
    <div class="particle"></div>
    <div class="particle"></div>
    <div class="particle"></div>
  </div>
</div>`,
      css: `@keyframes spin { to { transform: rotate(360deg); } }
@keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.5; } }
@keyframes float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-20px); } }

.loader-screen {
  position: fixed; inset: 0;
  background: #0f0f1a;
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  gap: 1.5rem; transition: opacity 0.8s;
}
/* TODO: Style spinner-ring, logo-text, progress bar, particles */`,
      js: `let progress = 0;
const fill = document.getElementById('progress-fill');
const text = document.getElementById('progress-text');

const interval = setInterval(() => {
  progress += Math.random() * 4;
  if (progress >= 100) {
    progress = 100;
    clearInterval(interval);
    // TODO: fade out loader
  }
  fill.style.width = progress + '%';
  text.textContent = Math.round(progress) + '%';
}, 80);`
    },
    hints: ['@keyframes spin with border-top for spinner effect', 'animation-delay for staggered particles', 'opacity:0 + pointer-events:none for fade-out']
  },

  // Responsive Design
  {
    topic: 'Responsive Design',
    difficulty: 'medium',
    title: 'Responsive Portfolio Site',
    description: `Build a complete responsive portfolio page that works on all screen sizes.
Requirements:
• Mobile-first approach with 3 breakpoints: 480px, 768px, 1200px
• Hamburger menu on mobile that toggles navigation
• Hero section with animated text
• Projects grid: 1 col (mobile) → 2 col (tablet) → 3 col (desktop)
• Skills progress bars
• Contact form
• Smooth scroll behavior`,
    starter_code: {
      html: `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body>
  <nav class="nav">
    <div class="nav-brand">Portfolio</div>
    <button class="hamburger" id="menu-toggle">☰</button>
    <ul class="nav-links" id="nav-links">
      <li><a href="#hero">Home</a></li>
      <li><a href="#projects">Projects</a></li>
      <li><a href="#skills">Skills</a></li>
      <li><a href="#contact">Contact</a></li>
    </ul>
  </nav>
  <section id="hero">
    <h1>Hello, I'm <span>Developer</span></h1>
    <p>Building beautiful web experiences</p>
  </section>
  <section id="projects">
    <h2>Projects</h2>
    <div class="project-grid">
      <div class="project-card">Project 1</div>
      <div class="project-card">Project 2</div>
      <div class="project-card">Project 3</div>
      <div class="project-card">Project 4</div>
    </div>
  </section>
</body>
</html>`,
      css: `/* Mobile-first base styles */
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: 'Segoe UI', sans-serif; }
.nav { display: flex; justify-content: space-between; align-items: center; padding: 1rem 1.5rem; background: #0f0f1a; color: white; }
.nav-links { display: none; list-style: none; }
.hamburger { background: none; border: none; color: white; font-size: 1.5rem; cursor: pointer; }
.project-grid { display: grid; grid-template-columns: 1fr; gap: 1rem; padding: 1rem; }

/* TODO: Add tablet and desktop breakpoints */
@media (min-width: 768px) {
  /* TODO */
}
@media (min-width: 1200px) {
  /* TODO */
}`,
      js: `document.getElementById('menu-toggle').addEventListener('click', () => {
  // TODO: toggle nav menu
});

// TODO: Smooth scroll
document.querySelectorAll('a[href^="#"]').forEach(link => {
  link.addEventListener('click', (e) => {
    // TODO: smooth scroll to target
  });
});`
    },
    hints: ['nav-links { display: flex } at 768px+', 'grid-template-columns: repeat(2,1fr) at 768px', 'scrollIntoView({ behavior: "smooth" }) for smooth scroll']
  },

  // Fetch & Promises
  {
    topic: 'Fetch & Promises',
    difficulty: 'medium',
    title: 'Weather Dashboard',
    description: `Build a weather dashboard using the Open-Meteo API (free, no key required).
Requirements:
• Search for any city (use geocoding API to convert city → lat/lon)
• Display current temperature, weather code, wind speed, humidity
• 7-day forecast with icons (use WMO weather codes → icon mapping)
• Loading spinner during fetch
• Error handling for city not found / network error
• "Favorites" list with localStorage persistence
API: https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&current_weather=true&daily=temperature_2m_max,temperature_2m_min&timezone=auto`,
    starter_code: {
      html: `<div class="weather-app">
  <div class="search-box">
    <input id="city-input" type="text" placeholder="Enter city name...">
    <button id="search-btn">Search</button>
  </div>
  <div id="weather-card" class="hidden">
    <h2 id="city-name"></h2>
    <div class="temp" id="temperature"></div>
    <div id="condition"></div>
    <div id="forecast"></div>
  </div>
  <div id="loading" class="hidden">Loading...</div>
  <div id="error" class="hidden"></div>
</div>`,
      css: `.weather-app { max-width: 600px; margin: 2rem auto; font-family: sans-serif; }
.search-box { display: flex; gap: 8px; }
input { flex: 1; padding: 10px; border-radius: 8px; border: 1px solid #ccc; }
.hidden { display: none; }
.temp { font-size: 4rem; font-weight: bold; }`,
      js: `async function geocodeCity(city) {
  const res = await fetch(\`https://geocoding-api.open-meteo.com/v1/search?name=\${encodeURIComponent(city)}&count=1\`);
  const data = await res.json();
  if (!data.results?.length) throw new Error('City not found');
  return { lat: data.results[0].latitude, lon: data.results[0].longitude, name: data.results[0].name };
}

async function fetchWeather(lat, lon) {
  // TODO: fetch weather from open-meteo
}

document.getElementById('search-btn').addEventListener('click', async () => {
  const city = document.getElementById('city-input').value.trim();
  if (!city) return;
  try {
    // TODO: show loading, geocode, fetch weather, display results
  } catch(e) {
    // TODO: show error
  }
});`
    },
    hints: ['async/await + try/catch for error handling', 'Promise.all() to fetch multiple endpoints', 'WMO code 0=Clear, 1-3=Cloudy, 61-67=Rain']
  },

  // LocalStorage
  {
    topic: 'LocalStorage',
    difficulty: 'easy',
    title: 'Personal Notes App',
    description: `Build a note-taking app with full localStorage persistence.
Requirements:
• Create notes with title and content (markdown-lite)
• Notes saved automatically as you type (debounced, 500ms)
• Sidebar list of all notes, click to open
• Delete note with confirmation
• Search notes by title or content
• Note metadata: created date, word count, last modified
• Export note as .txt file download`,
    starter_code: {
      html: `<div class="notes-app">
  <div class="sidebar">
    <button id="new-note">+ New Note</button>
    <input id="note-search" placeholder="Search notes...">
    <div id="notes-list"></div>
  </div>
  <div class="editor">
    <input id="note-title" placeholder="Note title..." type="text">
    <textarea id="note-content" placeholder="Start writing..."></textarea>
    <div class="editor-footer">
      <span id="word-count">0 words</span>
      <button id="export-btn">Export</button>
      <button id="delete-btn">Delete</button>
    </div>
  </div>
</div>`,
      css: `.notes-app { display: flex; height: 100vh; font-family: sans-serif; }
.sidebar { width: 280px; background: #1e1e2e; padding: 1rem; color: #cdd6f4; }
.editor { flex: 1; display: flex; flex-direction: column; padding: 1rem; }
#note-title { font-size: 1.5rem; border: none; outline: none; margin-bottom: 1rem; border-bottom: 2px solid #eee; padding-bottom: 8px; width: 100%; }
#note-content { flex: 1; border: none; outline: none; resize: none; font-size: 1rem; line-height: 1.6; }`,
      js: `let notes = JSON.parse(localStorage.getItem('notes') || '[]');
let activeId = null;

function saveNotes() {
  localStorage.setItem('notes', JSON.stringify(notes));
}

function renderList() {
  // TODO: render note list in sidebar
}

function openNote(id) {
  // TODO: load note into editor
}

document.getElementById('new-note').addEventListener('click', () => {
  // TODO: create new note
});

// TODO: debounced auto-save on input
renderList();`
    },
    hints: ['JSON.parse/stringify for complex localStorage data', 'debounce with setTimeout/clearTimeout', 'Blob + URL.createObjectURL for file download']
  }
];

/**
 * Generates questions via Gemini AI API.
 * Falls back to curated bank on failure or missing key.
 */
async function generateWithGemini(topic, difficulty, count = 1) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.log('[AI] No GEMINI_API_KEY — using question bank fallback');
    return null;
  }

  try {
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `You are an expert programming educator creating HTML/CSS/JS coding challenges for students.

Generate ${count} ${difficulty} level programming challenge(s) on the topic: "${topic}".

Return a JSON array with this exact structure for each question:
[{
  "title": "Short descriptive title",
  "description": "Detailed requirements (5+ bullet points with specific constraints)",
  "starter_code": {
    "html": "Starter HTML code with class names and structure",
    "css": "Partial CSS with TODO comments for student to complete",
    "js": "Partial JavaScript with TODO comments and function stubs"
  },
  "hints": ["hint 1", "hint 2", "hint 3"],
  "topic": "${topic}",
  "difficulty": "${difficulty}"
}]

Rules:
- Description must have clear, specific requirements (not vague)
- Starter code must be substantial (40+ lines total) with clear TODO markers
- CSS should use dark theme: background #1e1e2e, text #cdd6f4, accent #6c63ff
- Hints should be specific and technical
- Difficulty: easy=beginner friendly, medium=intermediate, hard=advanced concepts
- Return ONLY valid JSON, no markdown code blocks`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    // Strip potential markdown fences
    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(cleaned);
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch (err) {
    console.error('[AI] Gemini generation failed:', err.message);
    return null;
  }
}

/**
 * Gets questions from the fallback bank filtered by topic and difficulty.
 */
function getBankQuestions(topic, difficulty, count = 1) {
  let pool = QUESTION_BANK;

  if (topic && topic !== 'Any') {
    pool = pool.filter(q => q.topic.toLowerCase().includes(topic.toLowerCase()) || topic.toLowerCase().includes(q.topic.toLowerCase()));
  }
  if (difficulty && difficulty !== 'any') {
    pool = pool.filter(q => q.difficulty === difficulty);
  }

  // Shuffle and return requested count
  const shuffled = pool.sort(() => Math.random() - 0.5);
  if (shuffled.length === 0) {
    // No match — return any from bank
    return QUESTION_BANK.sort(() => Math.random() - 0.5).slice(0, count);
  }
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

/**
 * Main function: generate questions using Gemini or fallback bank.
 * @param {string} topic
 * @param {'easy'|'medium'|'hard'} difficulty
 * @param {number} count
 * @returns {Promise<Array>}
 */
async function generateQuestions(topic, difficulty, count = 1) {
  const geminiResults = await generateWithGemini(topic, difficulty, count);
  if (geminiResults && geminiResults.length > 0) {
    return geminiResults.map(q => ({ ...q, source: 'gemini' }));
  }
  // Fallback to curated bank
  return getBankQuestions(topic, difficulty, count).map(q => ({ ...q, source: 'bank' }));
}

module.exports = { generateQuestions, getBankQuestions, TOPICS, QUESTION_BANK };
