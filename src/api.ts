/**
 * Gemini API Integration for Tarot Card Reading
 * 
 * Provides AI-powered tarot interpretation using Gemini 1.5 Flash
 */

import { GoogleGenerativeAI } from '@google/generative-ai';

// Types
export interface TarotCard {
    name: string;
    isReversed: boolean;
}

export interface CardInterpretation {
    card: string;
    position: string; // 正位 or 逆位
    interpretation: string;
}

export interface TarotAnalysis {
    summary: string;
    cardInterpretations: CardInterpretation[];
    advice: string;
}

// System prompt for Gemini
const SYSTEM_PROMPT = `你是一位專業的塔羅大師，擅長用溫柔且有洞察力的語氣解牌。

你的回覆必須使用以下 JSON 格式：
{
  "summary": "整體占卜摘要（2-3句話）",
  "cardInterpretations": [
    {
      "card": "牌名",
      "position": "正位/逆位",
      "interpretation": "這張牌在此問題中的具體含義（2-3句話）"
    }
  ],
  "advice": "給問卜者的建議（2-3句話）"
}

請務必：
1. 根據每張牌的正逆位解讀其含義
2. 考慮牌與牌之間的關係與互動
3. 結合問卜者的問題給出具體建議
4. 使用溫暖、鼓勵但誠實的語氣`;

/**
 * Initialize Gemini API client
 */
function getGeminiClient(): GoogleGenerativeAI {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

    if (!apiKey) {
        throw new Error('VITE_GEMINI_API_KEY 未定義或找不到。請確認 GitHub Secrets 或 .env 設定。');
    }

    if (apiKey === 'your_api_key_here' || apiKey.trim() === '') {
        throw new Error('VITE_GEMINI_API_KEY 為空白或預設佔位符。請填入有效的 API 金鑰。');
    }

    return new GoogleGenerativeAI(apiKey);
}

/**
 * Format cards for prompt
 */
function formatCardsForPrompt(cards: TarotCard[]): string {
    return cards
        .map((card, index) =>
            `${index + 1}. ${card.name}（${card.isReversed ? '逆位' : '正位'}）`
        )
        .join('\n');
}

/**
 * Parse Gemini response to TarotAnalysis
 */
function parseResponse(text: string): TarotAnalysis {
    try {
        // Extract JSON from response (handle markdown code blocks)
        const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) ||
            text.match(/```\s*([\s\S]*?)\s*```/) ||
            [null, text];

        const jsonString = jsonMatch[1] || text;
        const parsed = JSON.parse(jsonString.trim());

        return {
            summary: parsed.summary || '無法解析摘要',
            cardInterpretations: parsed.cardInterpretations || [],
            advice: parsed.advice || '無法解析建議',
        };
    } catch (error) {
        console.error('Failed to parse Gemini response:', error);
        console.error('Raw response text:', text); // Log the raw text for debugging
        throw new Error(`AI 回應格式解析失敗: ${text.substring(0, 20)}... 請重試。`);
    }
}

/**
 * Analyze tarot cards using Gemini AI
 * 
 * @param userQuestion - The question the user wants to ask
 * @param selectedCards - Array of selected tarot cards with their positions
 * @returns TarotAnalysis containing summary, interpretations, and advice
 */
/** Available models in fallback order */
const MODELS = ['gemini-2.0-flash', 'gemini-1.5-flash'] as const;

/** Retry delay helper with exponential backoff */
function delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Try generating content with retry and model fallback
 */
async function generateWithRetry(
    genAI: GoogleGenerativeAI,
    prompt: string,
    maxRetries = 3,
): Promise<string> {
    for (const modelName of MODELS) {
        for (let attempt = 0; attempt < maxRetries; attempt++) {
            try {
                console.log(`嘗試模型 ${modelName}（第 ${attempt + 1} 次）...`);
                const model = genAI.getGenerativeModel({
                    model: modelName,
                    generationConfig: {
                        temperature: 0.7,
                        topP: 0.9,
                        maxOutputTokens: 2048,
                        responseMimeType: 'application/json',
                    },
                });

                const result = await model.generateContent(prompt);
                const response = await result.response;
                return response.text();
            } catch (err) {
                const isRetryable = err instanceof Error &&
                    (err.message.includes('429') || err.message.includes('Resource exhausted') || err.message.includes('QUOTA') ||
                        err.message.includes('Failed to fetch') || err.message.includes('NetworkError') || err.message.includes('network'));

                if (isRetryable && attempt < maxRetries - 1) {
                    const waitMs = Math.min(2000 * Math.pow(2, attempt), 10000);
                    console.warn(`請求失敗（${err instanceof Error ? err.message.substring(0, 50) : '未知'}），等待 ${waitMs}ms 後重試...`);
                    await delay(waitMs);
                    continue;
                }

                // If last attempt for this model, try next model
                if (isRetryable) {
                    console.warn(`模型 ${modelName} 已重試 ${maxRetries} 次仍失敗，嘗試備用模型...`);
                    break;
                }

                // Non-retryable error, throw immediately
                throw err;
            }
        }
    }

    throw new Error('所有模型皆無法使用（額度耗盡），請稍後再試或更換 API 金鑰。');
}

/**
 * Analyze tarot cards using Gemini AI
 * 
 * @param userQuestion - The question the user wants to ask
 * @param selectedCards - Array of selected tarot cards with their positions
 * @returns TarotAnalysis containing summary, interpretations, and advice
 */
export async function analyzeTarot(
    userQuestion: string,
    selectedCards: TarotCard[]
): Promise<TarotAnalysis> {
    if (!selectedCards || selectedCards.length === 0) {
        throw new Error('請至少選擇一張塔羅牌。');
    }

    if (!userQuestion || userQuestion.trim().length === 0) {
        throw new Error('請輸入您想詢問的問題。');
    }

    try {
        const genAI = getGeminiClient();
        const cardsText = formatCardsForPrompt(selectedCards);

        const prompt = `${SYSTEM_PROMPT}

問卜者的問題：
${userQuestion}

抽到的塔羅牌：
${cardsText}

請根據以上資訊進行解牌，並以 JSON 格式回覆。確保回覆是有效的 JSON 字串，不要包含 Markdown 標記。`;

        const text = await generateWithRetry(genAI, prompt);
        return parseResponse(text);
    } catch (error) {
        if (error instanceof Error) {
            // Re-throw known errors
            if (error.message.includes('VITE_GEMINI_API_KEY') ||
                error.message.includes('請至少選擇') ||
                error.message.includes('請輸入') ||
                error.message.includes('所有模型皆無法使用')) {
                throw error;
            }

            // Handle API errors
            if (error.message.includes('API_KEY_INVALID')) {
                throw new Error('API 金鑰無效，請檢查您的 Gemini API 金鑰設定。');
            }

            // Handle JSON parsing errors specifically
            if (error.message.includes('AI 回應格式解析失敗')) {
                throw error;
            }

            console.error('Gemini API error:', error);
            throw new Error(`AI 解牌服務暫時無法使用 (${error.message})，請檢查網路或金鑰權限。`);
        }

        throw new Error('發生未知錯誤，請重試。');
    }
}
