/**
 * CardCarousel Component
 * 
 * Horizontal scrollable card row with hover highlight support
 */

import { useRef, useEffect } from 'react';
import { TarotCard, type TarotCardData } from './TarotCard';
import './CardCarousel.css';

interface CardCarouselProps {
    cards: TarotCardData[];
    selectedCardIds: string[];
    hoveredIndex: number | null;
    onCardSelect?: (cardId: string) => void;
}

export function CardCarousel({
    cards,
    selectedCardIds,
    hoveredIndex,
    onCardSelect,
}: CardCarouselProps) {
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to keep hovered card visible
    useEffect(() => {
        if (hoveredIndex === null || !scrollContainerRef.current) return;

        const container = scrollContainerRef.current;
        const cardElements = container.querySelectorAll('.card-slot');
        const cardEl = cardElements[hoveredIndex] as HTMLElement | undefined;

        if (cardEl) {
            const containerRect = container.getBoundingClientRect();
            const cardRect = cardEl.getBoundingClientRect();

            // If card is out of visible area, scroll to it
            if (cardRect.left < containerRect.left || cardRect.right > containerRect.right) {
                cardEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
            }
        }
    }, [hoveredIndex]);

    if (cards.length === 0) return null;

    return (
        <div className="card-carousel-horizontal">
            {/* Selection count */}
            {selectedCardIds.length > 0 && (
                <div className="selection-count">
                    已選擇 <span className="count">{selectedCardIds.length}</span> 張牌
                </div>
            )}

            {/* Scrollable card row */}
            <div className="card-scroll-container" ref={scrollContainerRef}>
                <div className="card-row">
                    {cards.map((card, index) => (
                        <div
                            key={card.id}
                            className={`card-slot ${hoveredIndex === index ? 'hovered' : ''}`}
                        >
                            <TarotCard
                                card={card}
                                isSelected={selectedCardIds.includes(card.id)}
                                isHovered={hoveredIndex === index}
                                onSelect={() => onCardSelect?.(card.id)}
                                showDetail={hoveredIndex === index}
                            />
                        </div>
                    ))}
                </div>
            </div>

            {/* Hover indicator */}
            {hoveredIndex !== null && (
                <div className="hover-hint">
                    🃏 {cards[hoveredIndex].name} — <span className="hint-action">↑ 向上揮手抽牌</span>
                </div>
            )}
        </div>
    );
}
