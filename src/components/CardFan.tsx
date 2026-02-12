/**
 * CardFan Component
 * 
 * Displays tarot cards in a horizontal arc (fan) layout
 */

import { useMemo } from 'react';
import { TarotCard, type TarotCardData } from './TarotCard';
import './CardFan.css';

interface CardFanProps {
    cards: TarotCardData[];
    selectedCardIds: string[];
    hoveredIndex: number | null;
    onCardSelect?: (cardId: string) => void;
}

export function CardFan({
    cards,
    selectedCardIds,
    hoveredIndex,
    onCardSelect,
}: CardFanProps) {
    if (cards.length === 0) return null;

    // Calculate positions for fan layout
    const cardPositions = useMemo(() => {
        const count = cards.length;
        const centerIndex = (count - 1) / 2;
        const baseAngle = 5; // Degrees per card
        const xSpacing = 40; // Pixels overlap spacing

        return cards.map((_, index) => {
            const offsetFromCenter = index - centerIndex;

            // Calculate rotation
            const rotate = offsetFromCenter * baseAngle;

            // Calculate X offset (spread out from center)
            const x = offsetFromCenter * xSpacing;

            // Calculate Y offset (arc curve - parabola)
            // y = a * x^2, where x is offsetFromCenter
            const y = Math.abs(offsetFromCenter) * Math.abs(offsetFromCenter) * 2;

            return { x, y, rotate };
        });
    }, [cards.length]);

    return (
        <div className="card-fan-container">
            {/* Selection Info */}
            <div className="selection-info">
                已選擇 <span className="count">{selectedCardIds.length}</span> 張牌
            </div>

            {/* Fan Layout */}
            <div className="card-fan-wrapper">
                {cards.map((card, index) => {
                    const pos = cardPositions[index];
                    const isHovered = hoveredIndex === index;
                    const isSelected = selectedCardIds.includes(card.id);

                    // Dynamic styles for fan positioning
                    const style = {
                        left: `calc(50% + ${pos.x}px)`,
                        bottom: `${50 - pos.y}px`, // Raise arc slightly
                        transform: `translateX(-50%) rotate(${pos.rotate}deg) translateY(${isHovered ? '-60px' : '0px'}) scale(${isHovered ? 1.2 : 1})`,
                        zIndex: isHovered ? 100 : index, // Stack order
                    };

                    return (
                        <div
                            key={card.id}
                            className="card-fan-item"
                            style={style}
                        >
                            <TarotCard
                                card={card}
                                isSelected={isSelected}
                                isHovered={isHovered}
                                isFaceUp={false}
                                onSelect={() => onCardSelect?.(card.id)}
                                showDetail={false}
                            />
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
