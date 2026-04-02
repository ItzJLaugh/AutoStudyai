import { useRequireAuth } from '../lib/auth';

export default function MissionPage() {
  const { ready } = useRequireAuth();
  if (!ready) return null;

  const features = [
    {
      title: 'Instant Extraction',
      description: 'Unlike any other study platform, AutoStudyAI allows you to skip the copy and paste/upload process. Simply navigate to the material you want to extract and click the "Capture Content" button within the extension. That\'s it!',
    },
    {
      title: 'NCLEX Question Generation',
      subtitle: 'Nursing User Group',
      description: 'There is no other platform that offers NCLEX question generation. AutoStudyAI is the one platform to achieve this task to assist Nursing students in making study guides exactly like their exams with two button clicks.',
    },
    {
      title: 'AutoStudyAI Never Allows the AI to Search for Answers on the Web!',
      description: 'The main issue with simply asking an LLM to create a study guide is that the answers and questions are DIRECTLY from your class material. AutoStudyAI makes this super simple and easy. It only uses the context that was captured as its knowledge!',
    },
    {
      title: 'AI Chat',
      description: 'Allows the user to get a regular response about the study guide; a detailed (longer) response; or an example response, which takes the users keyword in their AI chat prompt and provides an example that will help you better understand!',
    },
    {
      title: 'The Cost',
      description: 'First off, a one month free trial\u2026 that DOES NOT automatically start the subscription. Nobody wants to do a free trial and forget to cancel it! Don\'t worry, I\'m a college student too and have too much to think about, also. Not only is there a benefit there, but we beat other platforms by offering every single imaginable feature for $9.99 a month.',
    },
    {
      title: 'Users Are "Cofounders"',
      description: 'Got a new recommendation or said something along the lines of "I wish it would do this?" Send feedback! Our goal is to get your recommendation ASAP! This is a college study platform made for the people.',
    },
  ];

  return (
    <div className="fade-in" style={{ maxWidth: 760 }}>
      <h2 style={{ marginBottom: 4 }}>AutoStudyAI Features</h2>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.92em', marginBottom: 28, lineHeight: 1.6 }}>
        AutoStudyAI was built by a college student, for college students. Our mission is to make studying smarter, faster, and more accessible for every student — regardless of major or learning style.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {features.map((f, i) => (
          <div key={i} style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-lg)',
            padding: '20px 24px',
          }}>
            <h3 style={{ fontSize: '1.05em', marginBottom: 4, color: 'var(--text-primary)' }}>
              {f.title}
            </h3>
            {f.subtitle && (
              <span style={{ fontSize: '0.78em', color: 'var(--accent)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {f.subtitle}
              </span>
            )}
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.88em', lineHeight: 1.6, marginTop: 8 }}>
              {f.description}
            </p>
          </div>
        ))}
      </div>
      <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85em', marginTop: 24, fontStyle: 'italic' }}>
        Founder: Jackson Laughlin
      </p>
    </div>
  );
}
