const { Sequelize } = require('sequelize');
const { Question, TestSpec, Baseline, Submission, EvaluationRun, WhitelistDomain } = require('../src/models');
const { enqueueEvaluation } = require('../src/services/queueService');

async function runDemo() {
  console.log('🔄 Init Hackathon Demo...');
  
  try {
    // 1. Clear existing generic data
    await Submission.destroy({ where: {} });
    await EvaluationRun.destroy({ where: {} });
    await Question.destroy({ where: {} });
    await Baseline.destroy({ where: {} });
    await WhitelistDomain.destroy({ where: {} });

    // 2. Add whitelist domains
    await WhitelistDomain.create({ domain: 'cdn.tailwindcss.com' });
    console.log('✅ Allowed Tailwind via CDN.');

    // 3. Create a Demo Question
    const q1 = await Question.create({
      id: "00000000-0000-0000-0000-000000000001",
      title: "Build a Responsive Card with Tailwind",
      description: "Create a card with an image, title, and button. Must use flexbox and tailwind classes.",
      allowed_libraries: ["https://cdn.tailwindcss.com"]
    });

    const testSpecJson = {
      viewports: [
        { name: "desktop", width: 1366, height: 768 },
        { name: "mobile", width: 390, height: 844 }
      ],
      rubric: { html: 20, css: 35, js: 35, visual: 10 },
      tests: {
        dom: [
          { selector: ".card", testType: "exists", assertion: true, marks: 5 },
          { selector: "button", testType: "count", expectedCount: 1, marks: 5 }
        ]
      }
    };

    await TestSpec.create({
      question_id: q1.id,
      spec_json: testSpecJson
    });

    console.log('✅ Created Demo Question and Spec.');

    // 4. Submit a Mock Student Submission
    const sub1 = await Submission.create({
      question_id: q1.id,
      student_id: "student_demo",
      status: "pending",
      html_content: `<div class="card p-4 shadow-lg rounded-xl flex flex-col items-center justify-center bg-white"><h2 class="text-xl font-bold">Demo Card</h2><button class="bg-blue-500 text-white px-4 py-2 mt-4 rounded hover:bg-blue-600 transition">Click Me</button></div>`,
      css_content: `body { background: #f3f4f6; display: flex; align-items: center; justify-content: center; height: 100vh; }`,
      js_content: `document.querySelector('button').addEventListener('click', () => alert('Hello Demo!'));`
    });

    console.log(`✅ Student Submission Staged. Sending to Evaluation Queue... ID: ${sub1.id}`);
    
    // 5. Enqueue Job
    await enqueueEvaluation(sub1.id);
    console.log('🚀 Job Enqueued. The evaluation worker should process it now!');
    console.log('');
    console.log('=================================');
    console.log('🎉 HACKATHON DEMO READY');
    console.log('Open your browser to:');
    console.log('1. http://localhost:5173 (Student Dashboard)');
    console.log('2. Observe the Live SSE Event stream in the UI!');
    console.log('=================================');
    
    process.exit(0);

  } catch (error) {
    console.error('❌ Demo seeding failed:', error);
    process.exit(1);
  }
}

runDemo();
