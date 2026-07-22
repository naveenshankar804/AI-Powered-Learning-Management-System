import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Activity,
  ArrowRight,
  BarChart3,
  BookOpen,
  Brain,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Cpu,
  FileVideo,
  Flame,
  Gauge,
  GraduationCap,
  Lock,
  Medal,
  Sparkles,
  Target,
  TerminalSquare,
  Trophy
} from 'lucide-react';
import { readUserProfile } from '../utils/userProfile';

const TRANSITION = { duration: 0.24, ease: [0.85, 0, 0.15, 1] };

function formatShortDate(value) {
  if (!value) return 'Just now';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Just now';
  return new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short' }).format(date);
}

function getLatestRun(submission) {
  const runs = Array.isArray(submission?.EvaluationRuns) ? submission.EvaluationRuns : [];
  return runs.slice().sort((a, b) => Number(b?.id || 0) - Number(a?.id || 0))[0] || null;
}

function getQuestionTitle(submission, questions) {
  return (
    submission?.Question?.title ||
    questions.find((question) => Number(question?.id) === Number(submission?.question_id))?.title ||
    'Untitled challenge'
  );
}

function getBestMismatch(submissions) {
  let best = null;

  for (const submission of submissions) {
    const run = getLatestRun(submission);
    const artifacts = Array.isArray(run?.visual_artifacts) ? run.visual_artifacts : [];
    const desktop = artifacts.find((artifact) => String(artifact?.viewport || '').toLowerCase() === 'desktop') || artifacts[0];
    const mismatch = Number(desktop?.diffPercent);

    if (!Number.isFinite(mismatch)) continue;
    if (best == null || mismatch < best) best = mismatch;
  }

  return best;
}

function buildBadges({ submissionsCount, streak, completedCount, totalQuestions, bestScore, bestMismatch }) {
  const halfTrackTarget = Math.min(Math.max(totalQuestions, 1), Math.max(1, Math.ceil(Math.max(totalQuestions, 1) / 2)));
  const precisionUnlocked = bestScore >= 90 || (bestMismatch != null && bestMismatch <= 1);

  return [
    {
      id: 'first-launch',
      label: 'First Launch',
      description: 'Send your first submission through the engine.',
      icon: Sparkles,
      unlocked: submissionsCount > 0,
      progress: Math.min(submissionsCount, 1),
      target: 1,
      tone: 'emerald',
      caption: submissionsCount > 0 ? 'Unlocked' : 'Complete 1 submission'
    },
    {
      id: 'streak-spark',
      label: 'Streak Spark',
      description: 'Keep a three-day learning streak alive.',
      icon: Flame,
      unlocked: streak >= 3,
      progress: Math.min(streak, 3),
      target: 3,
      tone: 'amber',
      caption: streak >= 3 ? `${streak} day streak` : `${Math.min(streak, 3)}/3 days`
    },
    {
      id: 'precision-pass',
      label: 'Precision Pass',
      description: 'Hit a sharp score or a near-perfect visual match.',
      icon: Target,
      unlocked: precisionUnlocked,
      progress: precisionUnlocked ? 1 : Math.min(bestScore / 90, 1),
      target: 1,
      tone: 'sky',
      caption: precisionUnlocked
        ? bestMismatch != null && bestMismatch <= 1
          ? `${bestMismatch.toFixed(2)}% mismatch`
          : `${bestScore}% score`
        : 'Reach 90+ or under 1% mismatch'
    },
    {
      id: 'pathfinder',
      label: 'Pathfinder',
      description: 'Clear the first half of your track.',
      icon: Medal,
      unlocked: completedCount >= halfTrackTarget,
      progress: Math.min(completedCount, halfTrackTarget),
      target: halfTrackTarget,
      tone: 'slate',
      caption: completedCount >= halfTrackTarget
        ? `${completedCount} modules complete`
        : `${completedCount}/${halfTrackTarget} modules`
    }
  ];
}

function getToneClasses(tone, unlocked = true) {
  if (tone === 'amber') {
    return unlocked ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-amber-100 bg-white text-amber-300';
  }
  if (tone === 'sky') {
    return unlocked ? 'border-sky-200 bg-sky-50 text-sky-700' : 'border-sky-100 bg-white text-sky-300';
  }
  if (tone === 'slate') {
    return unlocked ? 'border-slate-200 bg-slate-100 text-slate-700' : 'border-slate-100 bg-white text-slate-300';
  }
  return unlocked ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-emerald-100 bg-white text-emerald-300';
}

function StatPill({ icon: Icon, label, value, tone }) {
  return (
    <div className={`rounded-[1.4rem] border px-4 py-3 ${getToneClasses(tone)}`}>
      <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.18em]">
        <Icon size={14} />
        {label}
      </div>
      <div className="mt-2 text-xl font-black tracking-tight">{value}</div>
    </div>
  );
}

function ToolCard({ to, icon: Icon, eyebrow, title, metric, description }) {
  return (
    <Link
      to={to}
      className="group rounded-[2rem] border border-gray-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.05)] transition-all hover:-translate-y-1 hover:border-emerald-200 hover:shadow-[0_18px_44px_rgba(16,185,129,0.12)]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-50 text-gray-700 transition-colors group-hover:bg-emerald-50 group-hover:text-emerald-700">
          <Icon size={22} />
        </div>
        <ArrowRight className="mt-1 text-gray-300 transition-colors group-hover:text-emerald-600" size={18} />
      </div>

      <p className="mt-5 text-[11px] font-black uppercase tracking-[0.18em] text-gray-400">{eyebrow}</p>
      <h3 className="mt-2 text-xl font-black tracking-tight text-gray-900">{title}</h3>
      <p className="mt-3 text-3xl font-black tracking-tight text-gray-900">{metric}</p>
      <p className="mt-3 text-sm leading-6 text-gray-500">{description}</p>

      <div className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-emerald-700">
        Open panel <ChevronRight size={16} />
      </div>
    </Link>
  );
}

export default function Dashboard() {
  const [profile, setProfile] = useState(() => readUserProfile());
  const [user, setUser] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const userId = useMemo(() => {
    try {
      return window.localStorage.getItem('amypo_user_id') || '1';
    } catch (_) {
      return '1';
    }
  }, []);

  useEffect(() => {
    const onProfileChange = (event) => {
      setProfile(event?.detail?.profile || readUserProfile());
    };

    window.addEventListener('amypo-user-profile-change', onProfileChange);
    return () => window.removeEventListener('amypo-user-profile-change', onProfileChange);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadDashboard() {
      setLoading(true);
      setError('');

      try {
        const [userRes, questionsRes, submissionsRes] = await Promise.all([
          fetch(`/api/users/${encodeURIComponent(String(userId))}`),
          fetch('/api/questions'),
          fetch(`/api/submissions?student_id=${encodeURIComponent(String(userId))}&limit=200`)
        ]);

        const [userJson, questionsJson, submissionsJson] = await Promise.all([
          userRes.json().catch(() => ({})),
          questionsRes.json().catch(() => ({})),
          submissionsRes.json().catch(() => ([]))
        ]);

        if (cancelled) return;

        setUser(userRes.ok ? userJson : null);
        setQuestions(Array.isArray(questionsJson?.questions) ? questionsJson.questions : []);
        setSubmissions(Array.isArray(submissionsJson) ? submissionsJson : (Array.isArray(submissionsJson?.items) ? submissionsJson.items : []));

        if (!userRes.ok && userJson?.error) {
          setError(userJson.error);
        }
      } catch (err) {
        if (!cancelled) setError(err?.message || 'Could not load dashboard data.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadDashboard();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const dashboard = useMemo(() => {
    const orderedQuestions = questions
      .slice()
      .sort((a, b) => Number(a?.order_index ?? a?.id ?? 0) - Number(b?.order_index ?? b?.id ?? 0));

    const orderedSubmissions = submissions
      .slice()
      .sort((a, b) => new Date(b?.created_at || 0).getTime() - new Date(a?.created_at || 0).getTime());

    const completedIds = new Set(
      orderedSubmissions
        .filter((submission) => String(submission?.status || '').toLowerCase() === 'completed')
        .map((submission) => Number(submission?.question_id))
        .filter(Boolean)
    );

    const totalQuestions = orderedQuestions.length;
    const completedCount = completedIds.size;
    const progressPercent = totalQuestions > 0 ? Math.round((completedCount / totalQuestions) * 100) : 0;
    const nextQuestion = orderedQuestions.find((question) => !completedIds.has(Number(question?.id))) || orderedQuestions[orderedQuestions.length - 1] || null;
    const latestSubmission = orderedSubmissions[0] || null;
    const latestScore = latestSubmission ? Math.round(Number(latestSubmission?.total_score || 0)) : 0;

    const completedScores = orderedSubmissions
      .filter((submission) => String(submission?.status || '').toLowerCase() === 'completed')
      .map((submission) => Number(submission?.total_score || 0))
      .filter((score) => Number.isFinite(score));

    const avgScore = completedScores.length > 0
      ? Math.round(completedScores.reduce((sum, score) => sum + score, 0) / completedScores.length)
      : 0;

    const bestScore = completedScores.length > 0 ? Math.max(...completedScores) : 0;
    const bestMismatch = getBestMismatch(orderedSubmissions);
    const streak = Number(user?.current_streak || 0);
    const badges = buildBadges({
      submissionsCount: orderedSubmissions.length,
      streak,
      completedCount,
      totalQuestions,
      bestScore,
      bestMismatch
    });

    let encouragement = 'Open the workspace and keep building.';
    if (totalQuestions > 0 && completedCount >= totalQuestions) {
      encouragement = 'You cleared the current track. Replay a challenge or refine visual quality to keep raising the bar.';
    } else if (orderedSubmissions.length === 0) {
      encouragement = 'Start your first challenge and this console will begin tracking momentum, badges, and progress.';
    } else if (streak >= 3 && nextQuestion?.title) {
      encouragement = `Your streak is doing real work. Finish ${nextQuestion.title} today to keep the chain alive.`;
    } else if (latestScore >= 85 && nextQuestion?.title) {
      encouragement = `Strong work lately. ${nextQuestion.title} is a smart next step while your momentum is still warm.`;
    } else if (nextQuestion?.title) {
      encouragement = `One clean completion unlocks the next part of the path. ${nextQuestion.title} is ready when you are.`;
    }

    const level =
      totalQuestions > 0 && completedCount >= totalQuestions
        ? 'Track Complete'
        : progressPercent >= 70
          ? 'Shipping Mode'
          : progressPercent >= 35
            ? 'Builder Mode'
            : 'Foundation Mode';

    return {
      orderedQuestions,
      orderedSubmissions,
      totalQuestions,
      completedCount,
      progressPercent,
      nextQuestion,
      latestSubmission,
      latestScore,
      avgScore,
      bestScore,
      bestMismatch,
      streak,
      badges,
      unlockedBadges: badges.filter((badge) => badge.unlocked),
      nextBadge: badges.find((badge) => !badge.unlocked) || null,
      encouragement,
      level,
      firstName: String(profile?.name || user?.name || 'Builder').trim().split(/\s+/)[0] || 'Builder'
    };
  }, [profile, questions, submissions, user]);

  const resumeHref = dashboard.nextQuestion
    ? `/student?question=${encodeURIComponent(String(dashboard.nextQuestion.id))}`
    : '/student';

  const roadmapHref = dashboard.nextQuestion
    ? `/roadmap?question=${encodeURIComponent(String(dashboard.nextQuestion.id))}`
    : '/roadmap';

  const recentActivity = dashboard.orderedSubmissions.slice(0, 4);

  if (loading) {
    return (
      <div className="flex w-full flex-1 flex-col gap-6 pb-12">
        <div className="grid gap-6 xl:grid-cols-[1.55fr_0.95fr]">
          <div className="h-[320px] animate-pulse rounded-[2.75rem] bg-gray-100" />
          <div className="grid gap-4 sm:grid-cols-3 xl:grid-cols-1">
            <div className="h-[96px] animate-pulse rounded-[1.75rem] bg-gray-100" />
            <div className="h-[96px] animate-pulse rounded-[1.75rem] bg-gray-100" />
            <div className="h-[96px] animate-pulse rounded-[1.75rem] bg-gray-100" />
          </div>
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="h-[220px] animate-pulse rounded-[2rem] bg-gray-100" />
          <div className="h-[220px] animate-pulse rounded-[2rem] bg-gray-100" />
          <div className="h-[220px] animate-pulse rounded-[2rem] bg-gray-100" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-1 flex-col gap-6 pb-12">
      {error && (
        <div className="rounded-[1.5rem] border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800">
          Dashboard loaded with partial data. {error}
        </div>
      )}

      <section className="grid gap-6 xl:grid-cols-[1.55fr_0.95fr]">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={TRANSITION}
          className="relative overflow-hidden rounded-[2.75rem] border border-gray-200 bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.16),_transparent_34%),linear-gradient(180deg,_rgba(255,255,255,1),_rgba(247,250,249,1))] p-8 shadow-[0_22px_60px_rgba(15,23,42,0.08)]"
        >
          <div className="absolute right-[-8%] top-[-18%] h-56 w-56 rounded-full bg-emerald-100/70 blur-3xl" />
          <div className="absolute bottom-[-24%] left-[-6%] h-52 w-52 rounded-full bg-slate-100 blur-3xl" />

          <div className="relative z-10">
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white/85 px-4 py-2 text-[11px] font-black uppercase tracking-[0.2em] text-emerald-700 shadow-sm">
                <GraduationCap size={14} />
                Learning Console
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white/75 px-4 py-2 text-[11px] font-black uppercase tracking-[0.2em] text-gray-500 shadow-sm">
                <CheckCircle2 size={14} />
                {dashboard.completedCount}/{dashboard.totalQuestions || 0} modules complete
              </span>
            </div>

            <div className="mt-6 grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
              <div>
                <h1 className="text-4xl font-black tracking-tight text-gray-950 md:text-[3.2rem]">
                  Welcome back, {dashboard.firstName}
                </h1>
                <p className="mt-3 max-w-2xl text-base leading-7 text-gray-600">
                  {dashboard.encouragement}
                </p>

                <div className="mt-7 rounded-[2rem] border border-white/70 bg-white/82 p-5 shadow-[0_14px_36px_rgba(15,23,42,0.06)] backdrop-blur-sm">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="text-[11px] font-black uppercase tracking-[0.2em] text-gray-400">Continue Learning</p>
                      <h2 className="mt-2 text-2xl font-black tracking-tight text-gray-950">
                        {dashboard.nextQuestion?.title || 'Your workspace is ready'}
                      </h2>
                      <p className="mt-2 max-w-xl text-sm leading-6 text-gray-500">
                        {dashboard.nextQuestion?.description || 'Open the workspace to continue practicing and improving your submissions.'}
                      </p>
                    </div>

                    <div className="rounded-[1.5rem] border border-emerald-100 bg-emerald-50 px-4 py-3 text-right">
                      <p className="text-[11px] font-black uppercase tracking-[0.2em] text-emerald-600">Track Progress</p>
                      <p className="mt-2 text-3xl font-black tracking-tight text-emerald-700">{dashboard.progressPercent}%</p>
                    </div>
                  </div>

                  <div className="mt-5 h-2 rounded-full bg-gray-100">
                    <div
                      className="h-full rounded-full bg-[linear-gradient(90deg,#10b981_0%,#34d399_100%)]"
                      style={{ width: `${Math.max(6, dashboard.progressPercent)}%` }}
                    />
                  </div>

                  <div className="mt-5 flex flex-wrap gap-3">
                    <Link
                      to={resumeHref}
                      className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-700"
                    >
                      Resume Workspace
                      <ArrowRight size={16} />
                    </Link>
                    <Link
                      to={roadmapHref}
                      className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-5 py-3 text-sm font-bold text-gray-700 transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700"
                    >
                      View Roadmap
                      <ChevronRight size={16} />
                    </Link>
                  </div>
                </div>
              </div>

              <div className="grid gap-3">
                <StatPill icon={Flame} label="Current streak" value={`${dashboard.streak} days`} tone="amber" />
                <StatPill icon={Gauge} label="Average score" value={`${dashboard.avgScore}%`} tone="sky" />
                <StatPill icon={Trophy} label="Current level" value={dashboard.level} tone="slate" />
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...TRANSITION, delay: 0.04 }}
          className="grid gap-4 sm:grid-cols-3 xl:grid-cols-1"
        >
          <div className="rounded-[1.9rem] border border-orange-200 bg-[linear-gradient(180deg,_#fff7ed,_#ffffff)] p-5 shadow-[0_14px_36px_rgba(249,115,22,0.08)]">
            <div className="flex items-start justify-between gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-500 text-white shadow-lg shadow-orange-200">
                <Flame size={22} fill="white" />
              </div>
              <span className="rounded-full bg-white px-3 py-1 text-[11px] font-black uppercase tracking-[0.2em] text-orange-500">
                Momentum
              </span>
            </div>
            <div className="mt-5 text-3xl font-black tracking-tight text-orange-600">{dashboard.streak} Days</div>
            <p className="mt-2 text-sm leading-6 text-orange-900/70">
              Keep a submission habit alive today to preserve the run.
            </p>
          </div>

          <div className="rounded-[1.9rem] border border-gray-200 bg-white p-5 shadow-[0_14px_36px_rgba(15,23,42,0.06)]">
            <div className="flex items-start justify-between gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
                <Target size={22} />
              </div>
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-black uppercase tracking-[0.2em] text-emerald-600">
                Next badge
              </span>
            </div>
            <div className="mt-5 text-lg font-black tracking-tight text-gray-950">
              {dashboard.nextBadge?.label || 'All badges earned'}
            </div>
            <p className="mt-2 text-sm leading-6 text-gray-500">
              {dashboard.nextBadge?.caption || 'Your profile is fully decorated. Keep sharpening the quality bar.'}
            </p>
            {dashboard.nextBadge && (
              <div className="mt-4 h-2 rounded-full bg-gray-100">
                <div
                  className="h-full rounded-full bg-[linear-gradient(90deg,#10b981_0%,#34d399_100%)]"
                  style={{
                    width: `${Math.max(
                      8,
                      Math.round(((dashboard.nextBadge.progress || 0) / Math.max(dashboard.nextBadge.target || 1, 1)) * 100)
                    )}%`
                  }}
                />
              </div>
            )}
          </div>

          <div className="rounded-[1.9rem] border border-gray-200 bg-white p-5 shadow-[0_14px_36px_rgba(15,23,42,0.06)]">
            <div className="flex items-start justify-between gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                <Medal size={22} />
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-black uppercase tracking-[0.2em] text-slate-600">
                Achievements
              </span>
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              {dashboard.badges.map((badge) => {
                const Icon = badge.icon;
                return (
                  <div
                    key={badge.id}
                    className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-bold ${getToneClasses(badge.tone, badge.unlocked)}`}
                  >
                    <Icon size={14} />
                    {badge.label}
                  </div>
                );
              })}
            </div>
            <p className="mt-4 text-sm leading-6 text-gray-500">
              {dashboard.unlockedBadges.length} of {dashboard.badges.length} progress badges are active on this profile.
            </p>
          </div>
        </motion.div>
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <ToolCard
          to={resumeHref}
          icon={TerminalSquare}
          eyebrow="Practice Workspace"
          title={dashboard.nextQuestion?.title || 'Open Workspace'}
          metric={dashboard.nextQuestion ? `Q${dashboard.nextQuestion.id}` : 'Ready'}
          description={
            dashboard.latestSubmission
              ? `Last touched ${getQuestionTitle(dashboard.latestSubmission, dashboard.orderedQuestions)}. Continue with the right question loaded in the workspace.`
              : 'Open the coding workspace and start your first challenge.'
          }
        />

        <ToolCard
          to="/submissions"
          icon={FileVideo}
          eyebrow="Submission Review"
          title={dashboard.latestSubmission ? getQuestionTitle(dashboard.latestSubmission, dashboard.orderedQuestions) : 'No submissions yet'}
          metric={dashboard.latestSubmission ? `${dashboard.latestScore}%` : '0%'}
          description={
            dashboard.latestSubmission
              ? `${String(dashboard.latestSubmission.status || 'pending').replace(/^\w/, (char) => char.toUpperCase())} on ${formatShortDate(dashboard.latestSubmission.created_at)}. Reopen your reports and inspect the details.`
              : 'Your latest runs and reports will appear here once you evaluate a solution.'
          }
        />

        <ToolCard
          to="/analytics"
          icon={BarChart3}
          eyebrow="Performance Overview"
          title="Analytics Snapshot"
          metric={`${dashboard.avgScore}%`}
          description={
            dashboard.bestMismatch != null
              ? `Best visual mismatch so far: ${dashboard.bestMismatch.toFixed(2)}%. Use analytics to spot score trends and weak zones.`
              : 'Open analytics to inspect score distribution, failed tests, and visual drift patterns.'
          }
        />
      </section>

      {/* AI Feature Cards */}
      <section className="grid gap-6 lg:grid-cols-2">
        <Link
          to="/ai-mentor"
          className="group relative overflow-hidden rounded-[2rem] border border-purple-200/50 p-6 shadow-[0_12px_36px_rgba(108,99,255,0.1)] transition-all hover:-translate-y-1 hover:shadow-[0_20px_50px_rgba(108,99,255,0.2)]"
          style={{ background: 'linear-gradient(135deg, rgba(108,99,255,0.06) 0%, rgba(168,85,247,0.04) 100%)', borderColor: 'rgba(108,99,255,0.25)' }}
        >
          <div className="absolute right-[-10%] top-[-20%] h-48 w-48 rounded-full opacity-20" style={{ background: 'radial-gradient(circle, #6c63ff, transparent)' }} />
          <div className="relative z-10">
            <div className="flex items-start justify-between gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl" style={{ background: 'linear-gradient(135deg, #6c63ff, #a855f7)' }}>
                <Brain size={26} color="white" />
              </div>
              <div className="flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-[0.2em]" style={{ background: 'rgba(108,99,255,0.12)', color: '#6c63ff' }}>
                <Sparkles size={12} /> AI Powered
              </div>
            </div>
            <p className="mt-5 text-[11px] font-black uppercase tracking-[0.18em] text-purple-500">Student AI Mentor</p>
            <h3 className="mt-2 text-xl font-black tracking-tight" style={{ color: '#1e1a2e' }}>Your Personal AI Study Coach</h3>
            <p className="mt-3 text-sm leading-6 text-gray-600">Analyze your performance, get a daily study plan, AI-powered chat help, and personalized question recommendations based on your weak areas.</p>
            <div className="mt-5 inline-flex items-center gap-2 text-sm font-bold" style={{ color: '#6c63ff' }}>
              Open AI Mentor <ChevronRight size={16} />
            </div>
          </div>
        </Link>

        <Link
          to="/ai-questions"
          className="group relative overflow-hidden rounded-[2rem] border p-6 shadow-[0_12px_36px_rgba(168,85,247,0.08)] transition-all hover:-translate-y-1 hover:shadow-[0_20px_50px_rgba(168,85,247,0.18)]"
          style={{ background: 'linear-gradient(135deg, rgba(168,85,247,0.05) 0%, rgba(59,130,246,0.04) 100%)', borderColor: 'rgba(168,85,247,0.2)' }}
        >
          <div className="absolute right-[-10%] top-[-20%] h-48 w-48 rounded-full opacity-20" style={{ background: 'radial-gradient(circle, #a855f7, transparent)' }} />
          <div className="relative z-10">
            <div className="flex items-start justify-between gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl" style={{ background: 'linear-gradient(135deg, #a855f7, #3b82f6)' }}>
                <Sparkles size={26} color="white" />
              </div>
              <div className="flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-[0.2em]" style={{ background: 'rgba(168,85,247,0.12)', color: '#a855f7' }}>
                <Cpu size={12} /> Gemini AI
              </div>
            </div>
            <p className="mt-5 text-[11px] font-black uppercase tracking-[0.18em] text-purple-400">AI Question Generator</p>
            <h3 className="mt-2 text-xl font-black tracking-tight" style={{ color: '#1e1a2e' }}>Generate Programming Challenges</h3>
            <p className="mt-3 text-sm leading-6 text-gray-600">Select a topic and difficulty, and let Google Gemini AI generate fresh programming questions. One click to save them to the question bank.</p>
            <div className="mt-5 inline-flex items-center gap-2 text-sm font-bold" style={{ color: '#a855f7' }}>
              Generate Questions <ChevronRight size={16} />
            </div>
          </div>
        </Link>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...TRANSITION, delay: 0.08 }}
          className="rounded-[2.25rem] border border-gray-200 bg-white p-6 shadow-[0_16px_40px_rgba(15,23,42,0.06)]"
        >
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-gray-400">Achievement Wall</p>
              <h2 className="mt-2 text-2xl font-black tracking-tight text-gray-950">Earned progress badges</h2>
            </div>
            <Link
              to="/settings#profile"
              className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-bold text-gray-700 transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700"
            >
              Profile Settings
              <ChevronRight size={16} />
            </Link>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {dashboard.badges.map((badge) => {
              const Icon = badge.icon;
              const progressPercent = Math.round(((badge.progress || 0) / Math.max(badge.target || 1, 1)) * 100);

              return (
                <div
                  key={badge.id}
                  className={`rounded-[1.7rem] border p-5 ${getToneClasses(badge.tone, badge.unlocked)}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/70">
                      <Icon size={20} />
                    </div>
                    <span className="inline-flex items-center gap-1 rounded-full bg-white/80 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em]">
                      {badge.unlocked ? <CheckCircle2 size={12} /> : <Lock size={12} />}
                      {badge.unlocked ? 'Earned' : 'Locked'}
                    </span>
                  </div>

                  <h3 className="mt-5 text-lg font-black tracking-tight">{badge.label}</h3>
                  <p className="mt-2 text-sm leading-6 opacity-80">{badge.description}</p>
                  <p className="mt-3 text-sm font-bold opacity-90">{badge.caption}</p>

                  <div className="mt-4 h-2 rounded-full bg-white/70">
                    <div
                      className="h-full rounded-full bg-current"
                      style={{ width: `${Math.max(badge.unlocked ? 100 : 8, progressPercent)}%`, opacity: badge.unlocked ? 0.95 : 0.65 }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...TRANSITION, delay: 0.12 }}
          className="rounded-[2.25rem] border border-gray-200 bg-white p-6 shadow-[0_16px_40px_rgba(15,23,42,0.06)]"
        >
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-gray-400">Recent Activity</p>
              <h2 className="mt-2 text-2xl font-black tracking-tight text-gray-950">Your latest movement</h2>
            </div>
            <span className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-gray-500">
              <Activity size={13} />
              Live summary
            </span>
          </div>

          <div className="mt-6 space-y-3">
            {recentActivity.length > 0 ? (
              recentActivity.map((submission) => (
                <div
                  key={submission.id}
                  className="rounded-[1.5rem] border border-gray-100 bg-gray-50/70 px-4 py-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-black tracking-tight text-gray-900">
                        {getQuestionTitle(submission, dashboard.orderedQuestions)}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-3 text-xs font-semibold uppercase tracking-[0.16em] text-gray-400">
                        <span className="inline-flex items-center gap-1">
                          <Clock3 size={12} />
                          {formatShortDate(submission.created_at)}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <BookOpen size={12} />
                          {String(submission.status || 'pending')}
                        </span>
                      </div>
                    </div>

                    <div className="rounded-2xl bg-white px-3 py-2 text-right shadow-sm">
                      <div className="text-[11px] font-black uppercase tracking-[0.18em] text-gray-400">Score</div>
                      <div className="mt-1 text-lg font-black tracking-tight text-gray-900">
                        {Math.round(Number(submission?.total_score || 0))}%
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-[1.7rem] border border-dashed border-gray-200 bg-gray-50/60 px-5 py-10 text-center">
                <p className="text-lg font-black tracking-tight text-gray-900">No activity yet</p>
                <p className="mt-2 text-sm leading-6 text-gray-500">
                  Your latest submissions and improvements will start appearing here once you open the workspace.
                </p>
              </div>
            )}
          </div>

          <div className="mt-6 rounded-[1.7rem] border border-emerald-100 bg-emerald-50/70 px-4 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-600 text-white">
                <Sparkles size={18} />
              </div>
              <div>
                <p className="text-sm font-black tracking-tight text-emerald-900">Coach note</p>
                <p className="mt-1 text-sm leading-6 text-emerald-800/80">
                  {dashboard.nextQuestion
                    ? `Keep the flow simple: finish ${dashboard.nextQuestion.title} before branching out to another challenge.`
                    : 'Pick a previous challenge and refine the visual quality to keep the standards rising.'}
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </section>
    </div>
  );
}
