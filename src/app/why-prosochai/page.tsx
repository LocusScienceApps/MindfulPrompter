import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Why Prosochai?',
  description: 'The story behind Prosochai — why it was built and the research and traditions that ground it.',
};

export default function WhyProsochai() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top nav */}
      <nav className="sticky top-0 z-10 border-b border-gray-200 bg-white/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-6 py-3">
          <Link
            href="/"
            className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-indigo-600 transition-colors"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/logo.png" alt="" className="h-5 w-auto" />
            ← Back to app
          </Link>
          <span className="text-sm font-medium text-gray-400">Why Prosochai?</span>
        </div>
      </nav>

      {/* Content */}
      <main className="mx-auto max-w-2xl px-6 py-12 space-y-8">
        <h1 className="text-3xl font-bold text-gray-900">Why Prosochai?</h1>

        <Section>
          <p>
            I built Prosochai because I have a hard time managing my attention in two distinct ways.
          </p>
          <p>
            Sometimes I get so absorbed in work that hours pass without me noticing. The work matters — but I lose track of time completely, and I miss what's happening around me. A doorbell. An upcoming meeting.
          </p>
          <p>
            At other times, I fail to get into the work in the first place. I sit down to do something important and two hours later I still haven't started. Instead I'm reading the news or writing emails that didn't need to be written.
          </p>
          <p>
            I have a PhD in psychology and human development with a focus on behavioral decision making. I've done two ten-day silent Vipassana retreats. I <em>know</em> a lot about the value of mindfulness and intentionality. I also know that knowing isn't enough.
          </p>
          <p>
            What I needed was simple: something that would interrupt me at regular intervals and ask, <em>Is this still what you mean to be doing?</em> Just a question. Not with judgment or guilt, but not so briefly that I could brush it aside and slip back into what I did not consciously want to be doing.
          </p>
          <p>
            So I built it for myself: scheduled prompts that appear at intervals I choose and make me stop and reflect before continuing. That is the heart of Prosochai.
          </p>
          <p>
            There is also a Pomodoro timer in the app. It is there because time-boxed work sessions often help for the same reason the prompts help: they give attention some structure. You can use either one by itself, or combine them, with the app fitting the prompts into the rhythm of work sessions and breaks.
          </p>
        </Section>

        <Divider />

        <Section>
          <H2>Why this name</H2>
          <p>
            <em>Prosoche</em> (προσοχή) is an ancient Greek word: the Stoic practice of self-attention. Not just concentration, but the ongoing effort to notice what you are doing, what is pulling you, and whether your actions still match your values.
          </p>
          <p>
            I didn't call the app <em>Prosoche</em>, the singular, because the app works through repeated, small prompts that bring you back again and again. <em>Prosochai</em>, the plural, felt right for that rhythm: not a single act of attention, but a practice renewed many times a day. Pronounced <em>pro-so-KAI</em>.
          </p>
          <p>
            The problem was never simply that I needed to focus harder. Often I was already focusing hard. The real question was whether I was here on purpose.
          </p>
          <p>
            That is what I wanted the app to do. Not optimize me. Just help me come back.
          </p>
        </Section>

        <Divider />

        <Section>
          <H2>What is actually happening when it works</H2>
          <p>When Prosochai works, it does a few simple things.</p>

          <p>
            <Strong>It interrupts drift.</Strong> Research on mind-wandering suggests that our attention wanders far more than we think, and usually not in ways that make us happier or clearer. A brief interruption can be enough to break that spell.
          </p>
          <p>
            <Strong>It creates a mindfulness bell.</Strong> In Buddhist practice, sometimes all it takes is a sound or a pause to return to the present moment. Prosochai's prompts are built in that spirit.
          </p>
          <p>
            <Strong>It helps with time blindness and over-absorption.</Strong> This is one reason it may resonate with people who struggle with ADHD, hyperfocus, or simply losing track of time. When the internal clock is unreliable, external cues help. A well-timed prompt can make the moment visible before another hour disappears.
          </p>
          <p>
            <Strong>It turns intention into action.</Strong> There is a big difference between thinking "I should stay on task" and meeting a concrete prompt in the exact moment you are about to drift. The prompt does some of the remembering for you. It also changes the environment so that checking in becomes the default.
          </p>
          <p>
            <Strong>And it offers a different view of focus than the usual one.</Strong> I studied with Mihaly Csikszentmihalyi, the psychologist who coined the concept of <em>flow</em>, and I have a lot of respect for his work. But for people like me, flow is not always a source of well being. It often gets in the way of it. I can get completely absorbed in what I am doing and lose sense of whether it is still what I should be doing. That is where mindfulness adds something important to flow: deep concentration is not the same as intentional presence. Being fully absorbed is not the same as being aware of what you are doing and able to redirect yourself when needed.
          </p>
          <p>
            Prosochai is built around that distinction. The aim is not to interrupt good focus, but to help make sure focus is intentional.
          </p>
          <p>
            The Pomodoro technique can serve as a powerful supporting tool for Prosochai. <em>A Pomodoro gives work a container. Prosochai helps you stay awake inside it.</em> And when you use the two together, the app times the prompts so they work with the rhythm of the session instead of cutting across it.
          </p>
        </Section>

        <Divider />

        <Section>
          <H2>Why there is a coworking feature</H2>
          <p>
            The coworking feature comes from the same philosophy. It is not a social network bolted onto a focus app. It is the same practice of intentional attention, now done with other people.
          </p>
          <p>
            For ten years I ran a community coworking space and organized group Pomodoro sessions. I watched the same pattern repeat itself: people did better when they named what they were about to do, worked alongside others, and checked in afterward. You did not need long conversation or elaborate accountability. Often the mere presence of other people was enough.
          </p>
          <p>
            That matches what psychology has long recognized. We work differently when others are present. Stating an intention out loud — even to a stranger — makes follow-through more likely. And focus is contagious: when the norm in the room is that everyone is working, it becomes easier to work.
          </p>
          <p>
            That is why shared sessions in Prosochai begin with a simple intention and end with a simple check-in. "For the next 25 minutes I am going to do this" is different from vaguely meaning to work.
          </p>
          <p>
            You can use that structure in different ways. Some people want shared Pomodoro sessions. Some want to share the timing of Prosochai prompts and use those as the main rhythm. Some want both together, with the prompts fitted into the flow of focused work and breaks. The point is not to force one method. The point is that intention becomes easier to hold when you name it, share it, and return to it with other people.
          </p>
          <p>
            And the same structure still works alone. Even if nobody else joins, naming what you are about to do before the timer starts, and checking in at the end, changes the quality of attention. It brings a little more clarity and integrity into the work.
          </p>
        </Section>

        <Divider />

        <Section>
          <H2>Who this is for</H2>
          <p>
            Prosochai is for people who often lose the thread of what they meant to do. For people who focus intensely but have trouble switching, stopping, or checking whether the current task is still the right one.
          </p>
          <p>
            It is for remote workers, students, writers, researchers, founders, and anyone else whose days depend heavily on self-direction.
          </p>
          <p>
            It is also for coaches, therapists, teachers, and clinicians who want a simple tool they can recommend without adding one more thing for people to manage.
          </p>
          <p>
            You do not need an ADHD diagnosis. You do not need a meditation practice. But if either of those speaks to your experience, the logic of the app will probably make sense already.
          </p>
        </Section>

        <Divider />

        <Section>
          <H2>About the developer</H2>
          <p>
            I'm a decision psychologist with a PhD from the University of Chicago, postdoctoral work at Northwestern and at the Max Planck Institute's Center for Adaptive Behavior and Cognition, and a long-standing interest in how people actually manage attention, goals, and behavior in everyday life. I work at the{' '}
            <ExternalLink href="https://decisionlab.vse.cz/english/">Decision Lab</ExternalLink>{' '}
            in the Faculty of Business Administration at the Prague University of Economics and Business. Outside academia, I spent ten years running{' '}
            <ExternalLink href="https://locusworkspace.com/">Locus Workspace</ExternalLink>{' '}
            in Prague, a community-oriented coworking space where I also organized accountability groups for myself and other members.
          </p>
          <p>
            But the real reason this app exists is simpler: I built it because I needed it, working in close collaboration with Claude Code to turn the idea into software.
          </p>
        </Section>

        <Divider />

        {/* Key Terms — anchor targets for in-app tooltips */}
        <Section>
          <H2>Key Terms</H2>

          <div className="space-y-6">
            <TermEntry id="prosochai" term="Prosochai">
              The app's name, adapted from the Stoic term <em>prosoche</em>: the practice of ongoing self-attention. The plural form reflects the app's core rhythm — not one act of attention, but repeated returns through small prompts that bring you back to what you are doing and why. Pronounced <em>pro-so-KAI</em>.
            </TermEntry>

            <TermEntry id="pomodoro" term="Pomodoro">
              A time management method developed by Francesco Cirillo: work in focused intervals, usually followed by short breaks. Its value is not urgency but structure. It gives work a container and makes time easier to feel. In Prosochai, Pomodoro is an optional companion tool that can be used by itself or combined with the prompts.{' '}
              <ExternalLink href="https://en.wikipedia.org/wiki/Pomodoro_Technique">Learn more →</ExternalLink>
            </TermEntry>

            <TermEntry id="nudge" term="Nudge">
              A small change in the environment that makes one choice more likely without forcing it. In Prosochai, the prompt is a nudge: it makes checking in the default instead of something you have to remember on your own.{' '}
              <ExternalLink href="https://en.wikipedia.org/wiki/Nudge_theory">Learn more →</ExternalLink>
            </TermEntry>
          </div>
        </Section>

        <div className="pb-12" />
      </main>
    </div>
  );
}

// ── Layout helpers ─────────────────────────────────────────────────────────────

function Section({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-4 text-gray-700 leading-relaxed text-[1.0625rem]">
      {children}
    </div>
  );
}

function H2({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xl font-bold text-gray-900 mt-2">{children}</h2>
  );
}

function Strong({ children }: { children: React.ReactNode }) {
  return <strong className="font-semibold text-gray-900">{children}</strong>;
}

function Divider() {
  return <hr className="border-gray-200" />;
}

function ExternalLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-indigo-600 hover:text-indigo-800 underline decoration-indigo-300 underline-offset-2 transition-colors"
    >
      {children}
    </a>
  );
}

function TermEntry({ id, term, children }: { id: string; term: string; children: React.ReactNode }) {
  return (
    <div id={id} className="scroll-mt-16 rounded-xl border border-gray-200 bg-white px-5 py-4 shadow-sm">
      <h3 className="font-semibold text-gray-900 mb-1">{term}</h3>
      <p className="text-gray-600 text-sm leading-relaxed">{children}</p>
    </div>
  );
}
