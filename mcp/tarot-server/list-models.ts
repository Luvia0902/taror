import { GoogleGenerativeAI } from '@google/generative-ai';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../../.env') });

async function listModels() {
    const apiKey = process.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
        console.error('Missing VITE_GEMINI_API_KEY in .env');
        return;
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    try {
        const modelList = await genAI.getGenerativeModel({ model: 'gemini-1.5-flash' }).listModels(); // This is not the correct way to list, use the generic one
    } catch (e) {
        // Fallback to direct fetch if SDK doesn't expose it easily in this version
    }

    // Use fetch to be absolutely sure
    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        const data = await response.json();
        console.log('Available Models:');
        if (data.models) {
            data.models.forEach((m: any) => {
                console.log(`- ${m.name} (${m.supportedGenerationMethods.join(', ')})`);
            });
        } else {
            console.log('JSON Response:', JSON.stringify(data, null, 2));
        }
    } catch (error) {
        console.error('Fetch Error:', error);
    }
}

listModels();
