/**
 * Gesture Tarot - Main Application
 * 
 * An AI-powered tarot reading app using hand gestures
 */

import { useState, useCallback } from 'react';
import { GestureCardSelector } from './components/GestureCardSelector';
import { TarotReading } from './components/TarotReading';
import { analyzeTarot, type TarotCard, type TarotAnalysis } from './api';
import type { TarotCardData } from './components/TarotCard';
import './App.css';

type AppState = 'input' | 'selecting' | 'loading' | 'reading';

// Mock tarot cards data with high-quality mystical imagery (Unsplash)
const TAROT_CARDS: TarotCardData[] = [
  { id: '0', name: '愚者 The Fool', image: '/assets/cards/fool.png' },
  { id: '1', name: '魔術師 The Magician', image: '/assets/cards/magician.png' },
  { id: '2', name: '女祭司 The High Priestess', image: '/assets/cards/high-priestess.png' },
  { id: '3', name: '皇后 The Empress', image: '/assets/cards/placeholder.png' },
  { id: '4', name: '皇帝 The Emperor', image: '/assets/cards/placeholder.png' },
  { id: '5', name: '教皇 The Hierophant', image: '/assets/cards/placeholder.png' },
  { id: '6', name: '戀人 The Lovers', image: '/assets/cards/placeholder.png' },
  { id: '7', name: '戰車 The Chariot', image: '/assets/cards/placeholder.png' },
  { id: '8', name: '力量 Strength', image: '/assets/cards/placeholder.png' },
  { id: '9', name: '隱士 The Hermit', image: '/assets/cards/placeholder.png' },
  { id: '10', name: '命運之輪 Wheel of Fortune', image: '/assets/cards/placeholder.png' },
  { id: '11', name: '正義 Justice', image: '/assets/cards/placeholder.png' },
];

function App() {
  const [state, setState] = useState<AppState>('input');
  const [question, setQuestion] = useState('');
  const [selectedCards, setSelectedCards] = useState<TarotCardData[]>([]);
  const [analysis, setAnalysis] = useState<TarotAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleQuestionSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (question.trim()) {
      setError(null);
      setState('selecting');
    }
  }, [question]);

  const handleSelectionComplete = useCallback(async (cards: TarotCardData[]) => {
    // Add random reversed status to the card data for visual rendering
    const cardsWithRevealedStatus = cards.map(card => ({
      ...card,
      isReversed: Math.random() > 0.5,
    }));

    setSelectedCards(cardsWithRevealedStatus);
    setState('loading');
    setError(null);

    try {
      const cardsWithPosition: TarotCard[] = cardsWithRevealedStatus.map(card => ({
        name: card.name.split(' ')[0], // Use Chinese name only
        isReversed: !!card.isReversed,
      }));

      const result = await analyzeTarot(question, cardsWithPosition);
      setAnalysis(result);
      setState('reading');
    } catch (err) {
      setError(err instanceof Error ? err.message : '發生未知錯誤');
      setState('selecting');
    }
  }, [question]);

  const handleReset = useCallback(() => {
    setState('input');
    setQuestion('');
    setSelectedCards([]);
    setAnalysis(null);
    setError(null);
  }, []);

  return (
    <div className="app">
      {/* Header */}
      <header className="app-header">
        <h1>🔮 手勢塔羅</h1>
        <p className="tagline">用雙手探索命運的指引</p>
      </header>

      {/* Main Content */}
      <main className="app-main">
        {/* Step 1: Question Input */}
        {state === 'input' && (
          <div className="step-container question-step">
            <h2>請輸入您想詢問的問題</h2>
            <form onSubmit={handleQuestionSubmit} className="question-form">
              <textarea
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="例如：我的事業發展方向如何？"
                className="question-input"
                rows={3}
              />
              <button
                type="submit"
                className="submit-button"
                disabled={!question.trim()}
              >
                開始選牌
              </button>
            </form>
          </div>
        )}

        {/* Step 2: Card Selection */}
        {state === 'selecting' && (
          <div className="step-container selection-step">
            <div className="question-display">
              <span className="question-label">您的問題：</span>
              <span className="question-text">{question}</span>
            </div>
            {error && (
              <div className="error-message">
                ⚠️ {error}
              </div>
            )}
            <GestureCardSelector
              cards={TAROT_CARDS}
              maxSelections={3}
              onSelectionComplete={handleSelectionComplete}
            />
          </div>
        )}

        {/* Step 3: Loading */}
        {state === 'loading' && (
          <div className="step-container loading-step">
            <div className="loading-content">
              <div className="crystal-ball">🔮</div>
              <h2>塔羅大師正在解讀...</h2>
              <div className="loading-bar">
                <div className="loading-progress" />
              </div>
              <p className="loading-text">正在連結宇宙能量...</p>
            </div>
          </div>
        )}

        {/* Step 4: Reading Result */}
        {state === 'reading' && analysis && (
          <TarotReading
            analysis={analysis}
            selectedCards={selectedCards}
            onReset={handleReset}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="app-footer">
        <p>✨ Powered by Gemini AI & MediaPipe ✨</p>
      </footer>
    </div>
  );
}

export default App;
