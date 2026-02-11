import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
    CallToolRequestSchema,
    ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { z } from "zod";
import { MAJOR_ARCANA } from "./cards.js";
import * as dotenv from "dotenv";

dotenv.config();

const apiKey = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;

if (!apiKey) {
    console.error("Missing GEMINI_API_KEY environment variable");
    process.exit(1);
}

const genAI = new GoogleGenerativeAI(apiKey);

const server = new Server(
    {
        name: "tarot-server",
        version: "1.0.0",
    },
    {
        capabilities: {
            tools: {},
        },
    }
);

/**
 * Tool: draw_cards
 * Draws a specified number of tarot cards.
 */
const DrawCardsSchema = z.object({
    count: z.number().min(1).max(10).default(3),
});

/**
 * Tool: analyze_spread
 * Analyzes a tarot spread based on a user question.
 */
const AnalyzeSpreadSchema = z.object({
    question: z.string(),
    cards: z.array(
        z.object({
            name: z.string(),
            isReversed: z.boolean(),
        })
    ),
});

/**
 * Tool: get_card_info
 * Gets detailed information about a specific card.
 */
const GetCardInfoSchema = z.object({
    name: z.string(),
});

server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
        tools: [
            {
                name: "draw_cards",
                description: "隨機抽取塔羅牌（大阿爾克那 22 張）",
                inputSchema: {
                    type: "object",
                    properties: {
                        count: { type: "number", description: "抽取張數 (1-10)", default: 3 },
                    },
                },
            },
            {
                name: "analyze_spread",
                description: "由塔羅大師分析牌陣並給予建議",
                inputSchema: {
                    type: "object",
                    properties: {
                        question: { type: "string", description: "使用者的問題" },
                        cards: {
                            type: "array",
                            items: {
                                type: "object",
                                properties: {
                                    name: { type: "string", description: "牌名" },
                                    isReversed: { type: "boolean", description: "是否為逆位" },
                                },
                                required: ["name", "isReversed"],
                            },
                        },
                    },
                    required: ["question", "cards"],
                },
            },
            {
                name: "get_card_info",
                description: "查詢特定塔羅牌的詳細專業含義",
                inputSchema: {
                    type: "object",
                    properties: {
                        name: { type: "string", description: "牌名（中文或英文）" },
                    },
                    required: ["name"],
                },
            },
        ],
    };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
        if (name === "draw_cards") {
            const { count } = DrawCardsSchema.parse(args);
            const shuffled = [...MAJOR_ARCANA].sort(() => Math.random() - 0.5);
            const drawn = shuffled.slice(0, count).map(card => ({
                ...card,
                isReversed: Math.random() > 0.5
            }));
            return {
                content: [{ type: "text", text: JSON.stringify(drawn, null, 2) }],
            };
        }

        if (name === "analyze_spread") {
            const { question, cards } = AnalyzeSpreadSchema.parse(args);
            const model = genAI.getGenerativeModel({
                model: "gemini-flash-latest",
                generationConfig: { responseMimeType: "application/json" }
            });

            const cardsText = cards
                .map((card, index) => `${index + 1}. ${card.name}（${card.isReversed ? "逆位" : "正位"}）`)
                .join("\n");

            const prompt = `你是一位專業的塔羅大師，擅長用溫柔且有洞察力的語氣解牌。
請針對使用者的問題與抽到的牌組提供深度分析。

問卜者的問題：
${question}

抽到的塔羅牌：
${cardsText}

請提供：
1. 整體占卜摘要
2. 每張牌的具體含義（結合問題與正逆位）
3. 給問卜者的最終建議
回覆請遵循溫暖、鼓勵但誠實的原則。`;

            const result = await model.generateContent(prompt);
            const response = await result.response;
            return {
                content: [{ type: "text", text: response.text() }],
            };
        }

        if (name === "get_card_info") {
            const { name: cardName } = GetCardInfoSchema.parse(args);
            const card = MAJOR_ARCANA.find(
                (c) => c.name.includes(cardName) || c.englishName.toLowerCase().includes(cardName.toLowerCase())
            );

            if (!card) {
                return {
                    isError: true,
                    content: [{ type: "text", text: `找不到名稱為 "${cardName}" 的卡片。` }],
                };
            }

            return {
                content: [{ type: "text", text: JSON.stringify(card, null, 2) }],
            };
        }

        throw new Error(`Unknown tool: ${name}`);
    } catch (error) {
        if (error instanceof z.ZodError) {
            return {
                isError: true,
                content: [{ type: "text", text: `Invalid arguments: ${error.message}` }],
            };
        }
        return {
            isError: true,
            content: [{ type: "text", text: `Error: ${error instanceof Error ? error.message : String(error)}` }],
        };
    }
});

async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("Tarot MCP Server running on stdio");
}

main().catch((error) => {
    console.error("Fatal error in main():", error);
    process.exit(1);
});
