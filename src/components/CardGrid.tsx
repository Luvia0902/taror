/**
 * CardGrid Component
 * 
 * Displays all tarot cards in a grid layout for selection
 */

import { TarotCard, type TarotCardData } from './TarotCard';
import './CardGrid.css';

interface CardGridProps {
    cards: TarotCardData[];
    selectedCardIds: string[];
    hoveredIndex: number | null;
    onCardSelect?: (cardId: string) => void;
}

export function CardGrid({
    cards,
    selectedCardIds,
    hoveredIndex,
    onCardSelect,
}: CardGridProps) {
    if (cards.length === 0) return null;

    return (
        <div className="card-grid-container">
            {/* Selection Info */}
            <div className="selection-info">
                已選擇 <span className="count">{selectedCardIds.length}</span> 張牌
            </div>

            {/* Grid Layout */}
            <div className="card-grid">
                {cards.map((card, index) => (
                    <div
                        key={card.id}
                        className="card-grid-item"
                    >
                        <TarotCard
                            card={card}
                            isSelected={selectedCardIds.includes(card.id)}
                            isHovered={hoveredIndex === index}
                            isFaceUp={false} // Selection phase is always face-down
                            onSelect={() => onCardSelect?.(card.id)}
                            showDetail={false} // Don't reveal details during selection
                        />
                    </div>
                ))}
            </div>

            {/* Hover hint logic is moved to the parent or centralized */}
        </div>
    );
}
