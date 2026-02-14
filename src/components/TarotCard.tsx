/**
 * TarotCard Component
 * 
 * Displays a single tarot card with flip animation
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './TarotCard.css';

export interface TarotCardData {
    id: string;
    name: string;
    image: string;
    isReversed?: boolean;
}

/** Decorative symbols and gradients for each card */
const CARD_SYMBOLS: Record<string, { symbol: string; gradient: string }> = {
    '0': { symbol: '🃏', gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
    '1': { symbol: '🪄', gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' },
    '2': { symbol: '🌙', gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' },
    '3': { symbol: '👑', gradient: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)' },
    '4': { symbol: '🏛️', gradient: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)' },
    '5': { symbol: '🔑', gradient: 'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)' },
    '6': { symbol: '💕', gradient: 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)' },
    '7': { symbol: '⚔️', gradient: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)' },
    '8': { symbol: '🦁', gradient: 'linear-gradient(135deg, #f6d365 0%, #fda085 100%)' },
    '9': { symbol: '🏮', gradient: 'linear-gradient(135deg, #89f7fe 0%, #66a6ff 100%)' },
    '10': { symbol: '☸️', gradient: 'linear-gradient(135deg, #c471f5 0%, #fa71cd 100%)' },
    '11': { symbol: '⚖️', gradient: 'linear-gradient(135deg, #48c6ef 0%, #6f86d6 100%)' },
};

interface TarotCardProps {
    card: TarotCardData;
    isSelected?: boolean;
    isHovered?: boolean;
    isFaceUp?: boolean;
    onSelect?: () => void;
    showDetail?: boolean;
}

export function TarotCard({
    card,
    isSelected = false,
    isHovered = false,
    isFaceUp = false,
    onSelect,
    showDetail = false,
}: TarotCardProps) {
    const [imgFailed, setImgFailed] = useState(false);
    const isPlaceholder = card.image.includes('placeholder');
    const showFallback = imgFailed || isPlaceholder;
    const cardStyle = CARD_SYMBOLS[card.id] || { symbol: '✨', gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' };

    const handleClick = () => {
        if (onSelect) {
            onSelect();
        }
    };

    return (
        <motion.div
            className={`tarot-card ${isSelected ? 'selected' : ''} ${isHovered ? 'hand-hovered' : ''} ${isFaceUp ? 'face-up' : ''}`}
            onClick={handleClick}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{
                scale: isSelected ? 1.1 : isHovered ? 1.08 : 1,
                opacity: 1,
            }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{
                type: 'spring',
                stiffness: 300,
                damping: 25
            }}
            style={{
                transform: card.isReversed ? 'rotate(180deg)' : 'none',
            }}
        >
            <div className="card-inner">
                {/* Card Front */}
                <div className="card-face card-front">
                    <div className="card-image-content">
                        {showFallback ? (
                            <div
                                className="card-fallback"
                                style={{ background: cardStyle.gradient }}
                            >
                                <div className="fallback-decorations">
                                    <span className="fallback-corner tl">✦</span>
                                    <span className="fallback-corner tr">✦</span>
                                    <span className="fallback-corner bl">✦</span>
                                    <span className="fallback-corner br">✦</span>
                                </div>
                                <span className="fallback-symbol">{cardStyle.symbol}</span>
                                <span className="fallback-name">
                                    {card.name.split(' ')[0]}
                                </span>
                            </div>
                        ) : (
                            <img
                                src={card.image}
                                alt={card.name}
                                className="card-image"
                                onError={() => setImgFailed(true)}
                                style={{
                                    transform: card.isReversed ? 'rotate(180deg)' : 'none',
                                }}
                            />
                        )}
                    </div>
                    {showDetail && (
                        <div className="card-info">
                            <h3 className="card-name">{card.name}</h3>
                            {card.isReversed && (
                                <span className="card-reversed-badge">逆位</span>
                            )}
                        </div>
                    )}
                </div>

                {/* Card Back */}
                <div className="card-face card-back">
                    <div className="card-back-pattern" />
                </div>
            </div>

            {/* Selection indicator */}
            <AnimatePresence>
                {isSelected && (
                    <motion.div
                        className="selection-glow"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                    />
                )}
            </AnimatePresence>
        </motion.div>
    );
}
