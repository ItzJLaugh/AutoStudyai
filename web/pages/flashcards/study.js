import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { apiFetch } from '../../lib/api';
import { useRequireAuth } from '../../lib/auth';
import FlashcardViewer from '../../components/FlashcardViewer';

export default function FlashcardStudy() {
  const router = useRouter();
  const { guideId } = router.query;
  const { ready } = useRequireAuth();
  const [flashcards, setFlashcards] = useState(null);
  const [guideTitle, setGuideTitle] = useState('');
  const [initialSrs, setInitialSrs] = useState({});

  useEffect(() => {
    if (ready && guideId) loadFlashcards();
  }, [ready, guideId]);

  async function loadFlashcards() {
    const data = await apiFetch('/guides/' + guideId);
    if (data?.guide) {
      setFlashcards(data.guide.flashcards || []);
      setGuideTitle(data.guide.title);
      setInitialSrs(data.guide.flashcard_progress?.srs || {});
    }
  }

  if (!flashcards) return <div style={{ padding: 40, color: 'var(--text-muted)' }}>Loading flashcards...</div>;
  if (flashcards.length === 0) return <div style={{ padding: 40, color: 'var(--text-muted)' }}>No flashcards found.</div>;

  return (
    <div className="fade-in">
      <a href="#" onClick={e => { e.preventDefault(); router.back(); }} style={{ fontSize: '0.85em', color: 'var(--text-muted)' }}>
        &larr; Back
      </a>
      <h2 style={{ marginTop: 8, marginBottom: 20 }}>{guideTitle}</h2>
      <FlashcardViewer flashcards={flashcards} guideId={guideId} initialSrs={initialSrs} />
    </div>
  );
}
