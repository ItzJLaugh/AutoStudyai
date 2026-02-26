import Head from 'next/head';

export default function PrivacyPolicy() {
  return (
    <>
      <Head>
        <title>Privacy Policy — AutoStudyAI</title>
        <meta name="description" content="AutoStudyAI Privacy Policy" />
      </Head>
      <div style={{
        maxWidth: '800px',
        margin: '0 auto',
        padding: '60px 24px',
        fontFamily: "'Segoe UI', -apple-system, sans-serif",
        color: '#e0e0e0',
        lineHeight: '1.8',
      }}>
        <h1 style={{ fontSize: '2rem', fontWeight: '700', color: '#ffffff', marginBottom: '8px' }}>
          Privacy Policy
        </h1>
        <p style={{ color: '#90a4ae', marginBottom: '40px', fontSize: '0.9rem' }}>
          Effective Date: February 25, 2026 &nbsp;|&nbsp; Last Updated: February 25, 2026
        </p>

        <p style={{ marginBottom: '32px' }}>
          AutoStudyAI ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy
          explains how we collect, use, disclose, and safeguard your information when you use the AutoStudyAI
          Chrome extension and web platform (collectively, the "Service"). Please read this policy carefully.
          By using the Service, you agree to the practices described herein.
        </p>

        <Section title="1. Information We Collect">
          <p><strong style={{ color: '#ffffff' }}>a. Account Information</strong></p>
          <p>When you create an account, we collect your email address and a hashed password. We do not store plaintext passwords.</p>

          <p style={{ marginTop: '16px' }}><strong style={{ color: '#ffffff' }}>b. Page Content</strong></p>
          <p>When you use the Chrome extension to capture a page, the visible text content of that page is temporarily transmitted to our servers for AI processing. This content is used solely to generate your study materials and is not stored long-term on our servers after processing is complete.</p>

          <p style={{ marginTop: '16px' }}><strong style={{ color: '#ffffff' }}>c. Generated Study Materials</strong></p>
          <p>Study guides, notes, and flashcards you generate are stored in our database associated with your account so you can access them through the platform.</p>

          <p style={{ marginTop: '16px' }}><strong style={{ color: '#ffffff' }}>d. Usage Data</strong></p>
          <p>We track the number of study guides generated per month per account to enforce plan limits. We do not collect detailed analytics, browsing history, or behavioral tracking data.</p>

          <p style={{ marginTop: '16px' }}><strong style={{ color: '#ffffff' }}>e. Payment Information</strong></p>
          <p>Payments are processed by Stripe. We do not collect or store your full credit card number, card verification code, or bank account details. Stripe provides us with a customer identifier and subscription status. Stripe's privacy policy governs their handling of your payment data and can be found at stripe.com/privacy.</p>
        </Section>

        <Section title="2. How We Use Your Information">
          <p>We use the information we collect to:</p>
          <ul style={{ paddingLeft: '20px', marginTop: '8px' }}>
            <li>Provide, operate, and maintain the Service</li>
            <li>Generate AI-powered study materials from content you capture</li>
            <li>Authenticate your account and maintain your session</li>
            <li>Enforce free and paid plan usage limits</li>
            <li>Process subscription payments and manage billing</li>
            <li>Respond to support requests or inquiries</li>
            <li>Improve the reliability and performance of the Service</li>
          </ul>
          <p style={{ marginTop: '12px' }}>
            We do not use your content or personal data for advertising purposes, and we do not sell your data to third parties.
          </p>
        </Section>

        <Section title="3. How We Share Your Information">
          <p>We do not sell, trade, or rent your personal information to third parties. We may share data only in the following limited circumstances:</p>
          <ul style={{ paddingLeft: '20px', marginTop: '8px' }}>
            <li><strong style={{ color: '#ffffff' }}>Service Providers:</strong> We use trusted third-party providers to operate the Service, including Supabase (database and authentication), OpenAI (AI content generation), Stripe (payment processing), and Fly.io (backend hosting). These providers are contractually obligated to protect your data and may only use it to perform services on our behalf.</li>
            <li style={{ marginTop: '8px' }}><strong style={{ color: '#ffffff' }}>Legal Requirements:</strong> We may disclose your information if required to do so by law, regulation, or valid legal process (e.g., a court order or subpoena).</li>
            <li style={{ marginTop: '8px' }}><strong style={{ color: '#ffffff' }}>Business Transfers:</strong> In the event of a merger, acquisition, or sale of all or a portion of our assets, your information may be transferred as part of that transaction. We will notify you of any such change via email or a prominent notice on our platform.</li>
          </ul>
        </Section>

        <Section title="4. Data Retention">
          <p>
            We retain your account information and generated study materials for as long as your account is active.
            Page content submitted through the Chrome extension for AI processing is not retained on our servers
            after the study material has been generated. If you delete your account, we will delete your personal
            data within 30 days, except where retention is required by law.
          </p>
        </Section>

        <Section title="5. Chrome Extension — Data Practices">
          <p>The AutoStudyAI Chrome extension:</p>
          <ul style={{ paddingLeft: '20px', marginTop: '8px' }}>
            <li>Reads page content <strong style={{ color: '#ffffff' }}>only</strong> when you explicitly click "Capture Page"</li>
            <li>Does not run in the background or monitor your browsing activity</li>
            <li>Does not collect your browsing history, URLs visited, or any data outside of the page you choose to capture</li>
            <li>Stores your authentication token locally using Chrome's storage API so you remain logged in between sessions</li>
            <li>Transmits captured text only to <strong style={{ color: '#ffffff' }}>autostudy-ai.fly.dev</strong>, our own API — no data is sent to any other third-party host</li>
          </ul>
        </Section>

        <Section title="6. Cookies and Local Storage">
          <p>
            The AutoStudyAI web platform uses browser local storage to maintain your authenticated session.
            We do not use third-party tracking cookies or advertising cookies. No cross-site tracking is performed.
          </p>
        </Section>

        <Section title="7. Security">
          <p>
            We implement industry-standard security measures to protect your data, including HTTPS encryption
            for all data in transit, hashed password storage, and access controls on our database. However,
            no method of transmission over the internet or electronic storage is 100% secure. We encourage
            you to use a strong, unique password for your account.
          </p>
        </Section>

        <Section title="8. Children's Privacy">
          <p>
            The Service is not directed to children under the age of 13. We do not knowingly collect personal
            information from children under 13. If you believe a child under 13 has provided us with personal
            information, please contact us and we will promptly delete it.
          </p>
        </Section>

        <Section title="9. Your Rights">
          <p>Depending on your jurisdiction, you may have the right to:</p>
          <ul style={{ paddingLeft: '20px', marginTop: '8px' }}>
            <li>Access the personal data we hold about you</li>
            <li>Request correction of inaccurate data</li>
            <li>Request deletion of your personal data</li>
            <li>Object to or restrict certain processing of your data</li>
            <li>Data portability (receive a copy of your data in a structured format)</li>
          </ul>
          <p style={{ marginTop: '12px' }}>
            To exercise any of these rights, please contact us at the email address below.
          </p>
        </Section>

        <Section title="10. Third-Party Links">
          <p>
            The Service may contain links to third-party websites. We are not responsible for the privacy
            practices of those websites and encourage you to review their privacy policies independently.
          </p>
        </Section>

        <Section title="11. Changes to This Privacy Policy">
          <p>
            We may update this Privacy Policy from time to time. When we do, we will update the "Last Updated"
            date at the top of this page. If changes are material, we will notify you by email or by posting
            a prominent notice on the platform. Your continued use of the Service after any changes constitutes
            your acceptance of the updated policy.
          </p>
        </Section>

        <Section title="12. Contact Us">
          <p>
            If you have any questions, concerns, or requests regarding this Privacy Policy or our data practices,
            please contact us at:
          </p>
          <p style={{ marginTop: '12px' }}>
            <strong style={{ color: '#ffffff' }}>AutoStudyAI</strong><br />
            Email: <a href="mailto:jackson.laughlin0804@gmail.com" style={{ color: '#4fc3f7' }}>support@autostudyai.vercel.app</a><br />
            Website: <a href="https://autostudyai.online" style={{ color: '#4fc3f7' }}>https://autostudyai.online</a>
          </p>
        </Section>
      </div>
    </>
  );
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: '36px' }}>
      <h2 style={{
        fontSize: '1.15rem',
        fontWeight: '600',
        color: '#4fc3f7',
        marginBottom: '12px',
        paddingBottom: '6px',
        borderBottom: '1px solid rgba(79, 195, 247, 0.15)',
      }}>
        {title}
      </h2>
      <div style={{ color: '#cfd8dc', fontSize: '0.95rem' }}>
        {children}
      </div>
    </div>
  );
}
