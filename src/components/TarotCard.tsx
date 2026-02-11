/**
 * TarotCard Component
 * 
 * Displays a single tarot card with flip animation
 */

import { motion, AnimatePresence } from 'framer-motion';
import './TarotCard.css';

export interface TarotCardData {
    id: string;
    name: string;
    image: string;
    isReversed?: boolean;
}

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
                        <img
                            src={card.image}
                            alt={card.name}
                            className="card-image"
                            style={{
                                transform: card.isReversed ? 'rotate(180deg)' : 'none',
                            }}
                        />
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
