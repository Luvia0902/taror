import { describe, it, expect } from 'vitest';

describe('Environment Variable Verification', () => {
    it('should have VITE_GEMINI_API_KEY defined in the environment', () => {
        const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

        // Detailed check for systematic debugging
        expect(apiKey).toBeDefined();
        expect(typeof apiKey).toBe('string');
        expect(apiKey.length).toBeGreaterThan(0);
        expect(apiKey).not.toBe('your_api_key_here');
    });
});
