/**
 * Tarot Reading Result Component
 */

import { motion } from 'framer-motion';
import type { TarotAnalysis } from '../api';
import { TarotCard, type TarotCardData } from './TarotCard';
import './TarotReading.css';

interface TarotReadingProps {
    analysis: TarotAnalysis;
    selectedCards: TarotCardData[];
    onReset: () => void;
}

export function TarotReading({ analysis, selectedCards, onReset }: TarotReadingProps) {
    return (
        <motion.div
            className="tarot-reading"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
        >
            <div className="reading-header">
                <h2>✨ 塔羅解讀 ✨</h2>
            </div>

            {/* Visual Reveal of Cards */}
            <div className="revealed-cards-container">
                {selectedCards.map((card, index) => (
                    <motion.div
                        key={card.id}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.2 + index * 0.2 }}
                    >
                        <TarotCard
                            card={card}
                            isFaceUp={true}
                            showDetail={true}
                        />
                    </motion.div>
                ))}
            </div>

            {/* Summary */}
            <motion.section
                className="reading-section summary-section"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
            >
                <h3>📖 總覽</h3>
                <p>{analysis.summary}</p>
            </motion.section>

            {/* Card Interpretations */}
            <section className="reading-section cards-section">
                <h3>🃏 牌義解讀</h3>
                <div className="card-interpretations">
                    {analysis.cardInterpretations.map((interp, index) => (
                        <motion.div
                            key={index}
                            className="interpretation-card"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 + index * 0.1 }}
                        >
                            <div className="interp-header">
                                <span className="card-name">{interp.card}</span>
                                <span className={`position-badge ${interp.position === '逆位' ? 'reversed' : ''}`}>
                                    {interp.position}
                                </span>
                            </div>
                            <p className="interp-text">{interp.interpretation}</p>
                        </motion.div>
                    ))}
                </div>
            </section>

            {/* Advice */}
            <motion.section
                className="reading-section advice-section"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 }}
            >
                <h3>💫 建議</h3>
                <p>{analysis.advice}</p>
            </motion.section>

            {/* Reset Button */}
            <motion.button
                className="new-reading-button"
                onClick={onReset}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.7 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
            >
                開始新的占卜
            </motion.button>
        </motion.div>
    );
}
