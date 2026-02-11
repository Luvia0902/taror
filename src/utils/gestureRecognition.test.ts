import { describe, it, expect } from 'vitest';
import {
    isFist,
    isPalmOpen,
    getPalmCenter,
    getSwipeDirection,
    detectGesture,
    GestureStateManager,
    type LandmarkList,
    type Point,
    LANDMARK,
} from './gestureRecognition';

// Helper to create landmark array with default positions
function createLandmarks(overrides: Partial<Record<number, Point>> = {}): LandmarkList {
    const defaultLandmarks: LandmarkList = [];

    // Create 21 default landmarks
    for (let i = 0; i < 21; i++) {
        defaultLandmarks[i] = { x: 0.5, y: 0.5, z: 0 };
    }

    // Apply overrides
    for (const [index, point] of Object.entries(overrides)) {
        defaultLandmarks[Number(index)] = point;
    }

    return defaultLandmarks;
}

// Create open palm landmarks (fingertips above MCP joints)
function createOpenPalmLandmarks(): LandmarkList {
    return createLandmarks({
        [LANDMARK.WRIST]: { x: 0.5, y: 0.8 },
        [LANDMARK.INDEX_MCP]: { x: 0.4, y: 0.6 },
        [LANDMARK.INDEX_TIP]: { x: 0.35, y: 0.3 }, // Above MCP
        [LANDMARK.MIDDLE_MCP]: { x: 0.5, y: 0.55 },
        [LANDMARK.MIDDLE_TIP]: { x: 0.5, y: 0.25 }, // Above MCP
        [LANDMARK.RING_MCP]: { x: 0.6, y: 0.6 },
        [LANDMARK.RING_TIP]: { x: 0.65, y: 0.3 }, // Above MCP
        [LANDMARK.PINKY_MCP]: { x: 0.7, y: 0.65 },
        [LANDMARK.PINKY_TIP]: { x: 0.75, y: 0.35 }, // Above MCP
    });
}

// Create fist landmarks (fingertips close to or below MCP joints)
function createFistLandmarks(): LandmarkList {
    return createLandmarks({
        [LANDMARK.WRIST]: { x: 0.5, y: 0.8 },
        [LANDMARK.INDEX_MCP]: { x: 0.4, y: 0.5 },
        [LANDMARK.INDEX_TIP]: { x: 0.42, y: 0.52 }, // Below MCP (finger bent)
        [LANDMARK.MIDDLE_MCP]: { x: 0.5, y: 0.48 },
        [LANDMARK.MIDDLE_TIP]: { x: 0.5, y: 0.55 }, // Below MCP
        [LANDMARK.RING_MCP]: { x: 0.6, y: 0.5 },
        [LANDMARK.RING_TIP]: { x: 0.58, y: 0.55 }, // Below MCP
        [LANDMARK.PINKY_MCP]: { x: 0.7, y: 0.52 },
        [LANDMARK.PINKY_TIP]: { x: 0.68, y: 0.58 }, // Below MCP
    });
}

describe('isFist', () => {
    it('should return true when all fingers are closed', () => {
        const landmarks = createFistLandmarks();
        expect(isFist(landmarks)).toBe(true);
    });

    it('should return false when palm is open', () => {
        const landmarks = createOpenPalmLandmarks();
        expect(isFist(landmarks)).toBe(false);
    });

    it('should return false when landmarks are invalid', () => {
        expect(isFist(null as unknown as LandmarkList)).toBe(false);
        expect(isFist([])).toBe(false);
        expect(isFist(createLandmarks().slice(0, 10))).toBe(false); // Only 10 landmarks
    });
});

describe('isPalmOpen', () => {
    it('should return true when palm is open with fingers extended', () => {
        const landmarks = createOpenPalmLandmarks();
        expect(isPalmOpen(landmarks)).toBe(true);
    });

    it('should return false when making a fist', () => {
        const landmarks = createFistLandmarks();
        expect(isPalmOpen(landmarks)).toBe(false);
    });

    it('should return false when landmarks are invalid', () => {
        expect(isPalmOpen(null as unknown as LandmarkList)).toBe(false);
        expect(isPalmOpen([])).toBe(false);
    });
});

describe('getPalmCenter', () => {
    it('should calculate the center of the palm', () => {
        const landmarks = createLandmarks({
            [LANDMARK.WRIST]: { x: 0.5, y: 0.8 },
            [LANDMARK.INDEX_MCP]: { x: 0.3, y: 0.6 },
            [LANDMARK.MIDDLE_MCP]: { x: 0.5, y: 0.6 },
            [LANDMARK.RING_MCP]: { x: 0.7, y: 0.6 },
            [LANDMARK.PINKY_MCP]: { x: 0.9, y: 0.6 },
        });

        const center = getPalmCenter(landmarks);

        // Average of x: (0.5 + 0.3 + 0.5 + 0.7 + 0.9) / 5 = 0.58
        expect(center.x).toBeCloseTo(0.58, 2);
        // Average of y: (0.8 + 0.6 + 0.6 + 0.6 + 0.6) / 5 = 0.64
        expect(center.y).toBeCloseTo(0.64, 2);
    });

    it('should return origin when landmarks are invalid', () => {
        const center = getPalmCenter(null as unknown as LandmarkList);
        expect(center.x).toBe(0);
        expect(center.y).toBe(0);
    });
});

describe('getSwipeDirection', () => {
    it('should detect swipe left when hand moves right (mirrored)', () => {
        const prev: Point = { x: 0.3, y: 0.5 };
        const curr: Point = { x: 0.5, y: 0.5 }; // Moved right

        expect(getSwipeDirection(curr, prev)).toBe('left');
    });

    it('should detect swipe right when hand moves left (mirrored)', () => {
        const prev: Point = { x: 0.5, y: 0.5 };
        const curr: Point = { x: 0.3, y: 0.5 }; // Moved left

        expect(getSwipeDirection(curr, prev)).toBe('right');
    });

    it('should return null when movement is below threshold', () => {
        const prev: Point = { x: 0.5, y: 0.5 };
        const curr: Point = { x: 0.51, y: 0.5 }; // Small movement (deltaX=0.01 < threshold 0.015)

        expect(getSwipeDirection(curr, prev)).toBeNull();
    });

    it('should detect swipe up when hand moves upward', () => {
        const prev: Point = { x: 0.5, y: 0.5 };
        const curr: Point = { x: 0.5, y: 0.3 }; // Moved up (y decreases)

        expect(getSwipeDirection(curr, prev)).toBe('up');
    });
});

describe('detectGesture', () => {
    it('should return "none" when no hand is detected', () => {
        expect(detectGesture(null, null)).toBe('none');
        expect(detectGesture([], null)).toBe('none');
    });

    it('should return "fist" when fist gesture is detected', () => {
        const landmarks = createFistLandmarks();
        expect(detectGesture(landmarks, null)).toBe('fist');
    });

    it('should return "swipe-left" when hand moves right', () => {
        const prevLandmarks = createOpenPalmLandmarks();
        const currLandmarks = createLandmarks({
            [LANDMARK.WRIST]: { x: 0.7, y: 0.8 }, // Moved right
            [LANDMARK.INDEX_MCP]: { x: 0.6, y: 0.6 },
            [LANDMARK.INDEX_TIP]: { x: 0.55, y: 0.3 },
            [LANDMARK.MIDDLE_MCP]: { x: 0.7, y: 0.55 },
            [LANDMARK.MIDDLE_TIP]: { x: 0.7, y: 0.25 },
            [LANDMARK.RING_MCP]: { x: 0.8, y: 0.6 },
            [LANDMARK.RING_TIP]: { x: 0.85, y: 0.3 },
            [LANDMARK.PINKY_MCP]: { x: 0.9, y: 0.65 },
            [LANDMARK.PINKY_TIP]: { x: 0.95, y: 0.35 },
        });

        expect(detectGesture(currLandmarks, prevLandmarks)).toBe('swipe-left');
    });

    it('should return "swipe-right" when hand moves left', () => {
        const prevLandmarks = createOpenPalmLandmarks();
        const currLandmarks = createLandmarks({
            [LANDMARK.WRIST]: { x: 0.3, y: 0.8 }, // Moved left
            [LANDMARK.INDEX_MCP]: { x: 0.2, y: 0.6 },
            [LANDMARK.INDEX_TIP]: { x: 0.15, y: 0.3 },
            [LANDMARK.MIDDLE_MCP]: { x: 0.3, y: 0.55 },
            [LANDMARK.MIDDLE_TIP]: { x: 0.3, y: 0.25 },
            [LANDMARK.RING_MCP]: { x: 0.4, y: 0.6 },
            [LANDMARK.RING_TIP]: { x: 0.45, y: 0.3 },
            [LANDMARK.PINKY_MCP]: { x: 0.5, y: 0.65 },
            [LANDMARK.PINKY_TIP]: { x: 0.55, y: 0.35 },
        });

        expect(detectGesture(currLandmarks, prevLandmarks)).toBe('swipe-right');
    });

    it('should return "swipe-up" when hand moves upward', () => {
        const prevLandmarks = createOpenPalmLandmarks();
        const currLandmarks = createLandmarks({
            [LANDMARK.WRIST]: { x: 0.5, y: 0.6 }, // Moved up (lower y)
            [LANDMARK.INDEX_MCP]: { x: 0.4, y: 0.4 },
            [LANDMARK.INDEX_TIP]: { x: 0.35, y: 0.1 },
            [LANDMARK.MIDDLE_MCP]: { x: 0.5, y: 0.35 },
            [LANDMARK.MIDDLE_TIP]: { x: 0.5, y: 0.05 },
            [LANDMARK.RING_MCP]: { x: 0.6, y: 0.4 },
            [LANDMARK.RING_TIP]: { x: 0.65, y: 0.1 },
            [LANDMARK.PINKY_MCP]: { x: 0.7, y: 0.45 },
            [LANDMARK.PINKY_TIP]: { x: 0.75, y: 0.15 },
        });

        expect(detectGesture(currLandmarks, prevLandmarks)).toBe('swipe-up');
    });
});

describe('GestureStateManager', () => {
    it('should return gesture on first detection', () => {
        const manager = new GestureStateManager(500);
        const result = manager.processGesture('fist');
        expect(result).toBe('fist');
    });

    it('should return null for repeated same gesture', () => {
        const manager = new GestureStateManager(500);
        manager.processGesture('fist');
        expect(manager.processGesture('fist')).toBeNull();
    });

    it('should return null for gesture during cooldown', () => {
        const manager = new GestureStateManager(500);
        manager.processGesture('fist');
        // Immediately try another gesture
        expect(manager.processGesture('swipe-left')).toBeNull();
    });

    it('should reset state correctly', () => {
        const manager = new GestureStateManager(500);
        manager.processGesture('fist');
        manager.reset();
        // After reset, should accept new gesture
        expect(manager.processGesture('fist')).toBe('fist');
    });
});
