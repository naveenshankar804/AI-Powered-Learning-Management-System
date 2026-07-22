// This file is used to seed the database with demo data.
const { sequelize } = require('../src/models');
const { Question, TestSpec, Course, User } = require('../src/models');

async function seed() {
  await sequelize.authenticate();
  console.log('Database connection established successfully.');

  await sequelize.sync({ alter: true });
  console.log('Database synced.');

  // Ensure User 1 exists for streak demo
  let user1 = await User.findByPk('1');
  if (!user1) {
    user1 = await User.create({
      id: '1',
      name: 'Student Test',
      role: 'student',
      current_streak: 5,
      highest_streak: 12,
      last_activity_date: new Date()
    });
    console.log('Seed: Created test user with 5-day streak.');
  }

  // Ensure an Admin user exists for FR-8 replay evaluation actions.
  let adminUser = await User.findByPk('2');
  if (!adminUser) {
    adminUser = await User.create({
      id: '2',
      name: 'Admin Test',
      role: 'admin',
      current_streak: 0,
      highest_streak: 0,
      last_activity_date: new Date()
    });
    console.log('Seed: Created admin test user (id=2).');
  }

  // Ensure Course exists
  let course1 = await Course.findByPk(1);
  if (!course1) {
    course1 = await Course.create({
      id: 1,
      title: "Modern Frontend Fundamentals",
      description: "Master the core pillars of UI development: CSS Layouts, Responsive Design, and DOM Manipulation.",
      difficulty: "Beginner"
    });
    console.log('Seed: Created Fundamentals course Roadmap.');
  }

  const existingQuestion = await Question.findByPk(1);
  if (!existingQuestion) {
    await Question.create({
      id: 1,
      title: "Build a Social Profile Card",
      description: "Create a responsive social media profile card component. It should match the design specs precisely, including hover states and the follow button interaction.",
      allowed_libraries: [],
      course_id: 1,
      order_index: 0,
      constraints: [
        { type: 'css', property: 'display', value: ['flex', 'grid'], selector: '.card' }
      ],
      starter_code: {
        html: '<div class="card">\n  <!-- Add your code here -->\n</div>',
        css: '.card {\n  /* Add styles */\n}',
        js: '// No starter JS'
      }
    });
    console.log('Database seeded with demo question linked to roadmap.');
  } else if (!existingQuestion.course_id) {
     await existingQuestion.update({
       course_id: 1,
       constraints: [{ type: 'css', property: 'display', value: ['flex', 'grid'], selector: '.card' }]
     });
  }

  // Seed / ensure a TestSpec for Question 1
  const baselineBlock = {
    // "Expected" reference implementation used to generate expected screenshots for visual diff.
    html: `<div class="card">
<div class="meta">
  <h2 class="name">Profile</h2>
  <p class="tagline">Social profile card</p>
</div>
<button class="follow-btn" type="button">Follow</button>
</div>`,
    css: `:root { color-scheme: light; }
* { box-sizing: border-box; }
body {
margin: 0;
min-height: 100vh;
display: flex;
align-items: center;
justify-content: center;
background: #f3f4f6;
font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
}
.card {
display: flex;
align-items: center;
gap: 16px;
padding: 24px;
background: #ffffff;
border-radius: 12px;
box-shadow: 0 4px 16px rgba(0,0,0,0.10);
}
.name { margin: 0; font-size: 20px; line-height: 1.2; }
.tagline { margin: 4px 0 0; color: #6b7280; font-size: 14px; }
.follow-btn {
margin-left: auto;
border: 0;
border-radius: 10px;
padding: 10px 14px;
background: #4f46e5;
color: #fff;
font-weight: 700;
cursor: pointer;
transition: background-color .2s ease, transform .2s ease;
}
.follow-btn:hover { background: #4338ca; transform: translateY(-1px); }
@media (max-width: 480px) {
.card { width: calc(100vw - 32px); }
}`,
    js: `document.querySelector('.follow-btn')?.addEventListener('click', () => {\n  alert('Followed!');\n});`
  };

  const desiredSpec = {
    baseline: baselineBlock,
    viewports: [
      { name: 'desktop', width: 1366, height: 768 },
      { name: 'mobile', width: 390, height: 844 }
    ],
    rubric: { html: 20, css: 35, js: 35, visual: 10 },
    tests: {
      dom: [
        { id: 'card_exists', selector: '.card', assertion: 'exists', hint: 'Missing .card container' },
        { id: 'button_exists', selector: '.card button', assertion: 'exists', hint: 'Missing Follow button inside .card' },
        { id: 'alert_on_click', assertion: 'alertCalled', hint: 'Clicking the Follow button should trigger an alert()' }
      ],
      css: [
        { id: 'layout_flex_or_grid', selector: '.card', property: 'display', expected: ['flex', 'grid'], hint: 'Use Flexbox or Grid on .card (display:flex or display:grid)' },
        { id: 'center_display', selector: 'body', property: 'display', expected: ['flex', 'grid'], hint: 'Center the card: use flex/grid on body (or a wrapper)' },
        { id: 'center_justify', selector: 'body', property: 'justifyContent', expected: 'center', hint: 'Center horizontally: justify-content:center' },
        { id: 'center_align', selector: 'body', property: 'alignItems', expected: 'center', hint: 'Center vertically: align-items:center' },
        { id: 'button_hover_rule', testType: 'ruleExists', selectorContains: ':hover', hint: 'Add a hover state for the button (use :hover in CSS)' }
      ],
      interactions: [
        { action: 'hover', selector: '.card button', waitForVisible: true, delay: 100 },
        { action: 'click', selector: '.card button', waitForVisible: true, delay: 100 }
      ]
    }
  };

  const existingSpec = await TestSpec.findOne({ where: { question_id: 1 } });
  if (!existingSpec) {
    await TestSpec.create({ question_id: 1, spec_json: desiredSpec });
    console.log('Database seeded with demo TestSpec.');
  } else {
    const current = existingSpec.spec_json || {};
    // Only patch in baseline if missing, to avoid clobbering custom specs.
    if (!current.baseline) {
      await existingSpec.update({ spec_json: { ...current, baseline: desiredSpec.baseline } });
      console.log('Database updated with baseline expected code for TestSpec.');
    }
  }

  process.exit(0);
}

if (require.main === module) {
  seed();
}
