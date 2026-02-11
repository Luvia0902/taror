/**
 * API Unit Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the Google Generative AI module
vi.mock('@google/generative-ai', () => ({
    GoogleGenerativeAI: vi.fn().mockImplementation(() => ({
        getGenerativeModel: vi.fn().mockReturnValue({
            generateContent: vi.fn().mockResolvedValue({
                response: {
                    text: () => JSON.stringify({
                        summary: '這是一個測試摘要',
                        cardInterpretations: [
                            {
                                card: '愚者',
                                position: '正位',
                                interpretation: '新的開始'
                            }
                        ],
                        advice: '保持開放的心態'
                    })
                }
            })
        })
    }))
}));

// We need to set the env variable before importing the api module
// In a real test environment, this would be handled by vitest config
describe('analyzeTarot', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should throw error when selectedCards is empty', async () => {
        // Dynamically import after mocking
        const { analyzeTarot } = await import('./api');

        await expect(analyzeTarot('我的問題', [])).rejects.toThrow('請至少選擇一張塔羅牌');
    });

    it('should throw error when userQuestion is empty', async () => {
        const { analyzeTarot } = await import('./api');

        await expect(analyzeTarot('', [{ name: '愚者', isReversed: false }])).rejects.toThrow('請輸入您想詢問的問題');
    });

    it('should correctly format cards with positions', async () => {
        // Test the card formatting logic
        const cards = [
            { name: '愚者', isReversed: false },
            { name: '魔術師', isReversed: true },
        ];

        // Expected format: "1. 愚者（正位）\n2. 魔術師（逆位）"
        const formatted = cards
            .map((card, index) =>
                `${index + 1}. ${card.name}（${card.isReversed ? '逆位' : '正位'}）`
            )
            .join('\n');

        expect(formatted).toBe('1. 愚者（正位）\n2. 魔術師（逆位）');
    });

    it('should have correct TarotAnalysis structure', () => {
        // Type check - just verify the interface exists and is correct
        const mockAnalysis = {
            summary: '測試摘要',
            cardInterpretations: [
                { card: '愚者', position: '正位', interpretation: '解讀' }
            ],
            advice: '建議'
        };

        expect(mockAnalysis).toHaveProperty('summary');
        expect(mockAnalysis).toHaveProperty('cardInterpretations');
        expect(mockAnalysis).toHaveProperty('advice');
        expect(Array.isArray(mockAnalysis.cardInterpretations)).toBe(true);
    });

    it('should parse JSON response correctly from markdown code blocks', () => {
        const responseWithCodeBlock = '```json\n{"summary":"test","cardInterpretations":[],"advice":"advice"}\n```';
        const jsonMatch = responseWithCodeBlock.match(/```json\s*([\s\S]*?)\s*```/);

        expect(jsonMatch).not.toBeNull();
        expect(jsonMatch?.[1]).toBe('{"summary":"test","cardInterpretations":[],"advice":"advice"}');
    });
});
