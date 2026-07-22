import { motion } from 'framer-motion';
import { ArrowRight, Code2, Bot, Layers, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function LandingPage() {
  return (
    <div className="w-full flex-1 flex flex-col items-center mt-12 mb-24">
      
      {/* Hero Section */}
      <div className="text-center max-w-3xl px-4 py-16">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-600 font-semibold mb-6">
          <Sparkles size={16} /> <span className="text-sm">V2.0 is Live &mdash; Smarter Assessments</span>
        </div>
        
        <h1 className="text-5xl sm:text-6xl font-black text-gray-900 tracking-tight leading-tight mb-6">
          AI-Powered Frontend <br className="hidden sm:block"/> Assessment Platform
        </h1>
        
        <p className="text-lg text-gray-600 mb-10 max-w-2xl mx-auto leading-relaxed">
          Create, execute, and analyze full-stack UI challenges in an isolated sandbox. 
          Powered by Puppeteer diff engines and generative AI layout feedback.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Link 
            to="/student"
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3.5 rounded-xl font-bold shadow-sm shadow-emerald-600/20 transition-all hover:-translate-y-0.5"
          >
            Start Practice Workspace <ArrowRight size={18} />
          </Link>
          <Link 
            to="/trainer"
            className="flex items-center gap-2 bg-white hover:bg-gray-50 text-gray-700 px-8 py-3.5 rounded-xl font-bold shadow-sm border border-gray-200 transition-all hover:-translate-y-0.5"
          >
            Trainer Analytics
          </Link>
        </div>
      </div>

      {/* Concept Architecture Preview Section */}
      <div className="w-full max-w-5xl px-6 mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col">
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mb-4">
            <Layers size={24} />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Multi-Viewport Testing</h3>
          <p className="text-gray-500 text-sm flex-1 leading-relaxed">
            Specify precise breakpoints. Our automated puppeteer sandbox captures actual layouts across dynamically resized Chrome containers.
          </p>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col">
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center mb-4">
            <Code2 size={24} />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Pixelmatch Diff Engine</h3>
          <p className="text-gray-500 text-sm flex-1 leading-relaxed">
            Byte-by-byte baseline comparison generates highly accurate heatmaps indicating structural and stylistic deviation.
          </p>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col">
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center mb-4">
            <Bot size={24} />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">AI Diagnostic Hints</h3>
          <p className="text-gray-500 text-sm flex-1 leading-relaxed">
            Integrates failed DOM assertions and CSS heuristic checks into real-time LLM suggestions for the student's next iteraton.
          </p>
        </div>
      </div>

    </div>
  );
}

