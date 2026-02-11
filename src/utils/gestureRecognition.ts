/**
 * Gesture Recognition Utilities
 * 
 * Uses MediaPipe Hands landmarks to detect gestures:
 * - Swipe left/right: Palm moves horizontally
 * - Fist: All fingers closed
 */

// MediaPipe hand landmark indices
export const LANDMARK = {
    WRIST: 0,
    THUMB_CMC: 1,
    THUMB_MCP: 2,
    THUMB_IP: 3,
    THUMB_TIP: 4,
    INDEX_MCP: 5,
    INDEX_PIP: 6,
    INDEX_DIP: 7,
    INDEX_TIP: 8,
    MIDDLE_MCP: 9,
    MIDDLE_PIP: 10,
    MIDDLE_DIP: 11,
    MIDDLE_TIP: 12,
    RING_MCP: 13,
    RING_PIP: 14,
    RING_DIP: 15,
    RING_TIP: 16,
    PINKY_MCP: 17,
    PINKY_PIP: 18,
    PINKY_DIP: 19,
    PINKY_TIP: 20,
} as const;

export interface Point {
    x: number;
    y: number;
    z?: number;
}

export type Landmark = Point;
export type LandmarkList = Landmark[];

export type Gesture = 'swipe-left' | 'swipe-right' | 'swipe-up' | 'fist' | 'none';

// Thresholds for gesture detection
const SWIPE_THRESHOLD = 0.06; // Total accumulated horizontal movement to count as swipe
const SWIPE_FRAME_THRESHOLD = 0.015; // Per-frame movement threshold to accumulate
const FIST_THRESHOLD = 0.07; // Maximum distance from fingertip to MCP for closed finger

/**
 * Check if a finger is closed (bent towards palm)
 */
function isFingerClosed(
    landmarks: LandmarkList,
    tipIndex: number,
    mcpIndex: number
): boolean {
    const tip = landmarks[tipIndex];
    const mcp = landmarks[mcpIndex];

    // Finger is closed if tip is close to or below MCP (in y-direction, since y increases downward)
    // We use the distance in y to determine if finger is bent
    const yDistance = mcp.y - tip.y;

    return yDistance < FIST_THRESHOLD;
}

/**
 * Check if the hand is making a fist gesture
 * All fingers should be closed
 */
export function isFist(landmarks: LandmarkList): boolean {
    if (!landmarks || landmarks.length < 21) return false;

    // Check all four fingers (excluding thumb)
    const indexClosed = isFingerClosed(landmarks, LANDMARK.INDEX_TIP, LANDMARK.INDEX_MCP);
    const middleClosed = isFingerClosed(landmarks, LANDMARK.MIDDLE_TIP, LANDMARK.MIDDLE_MCP);
    const ringClosed = isFingerClosed(landmarks, LANDMARK.RING_TIP, LANDMARK.RING_MCP);
    const pinkyClosed = isFingerClosed(landmarks, LANDMARK.PINKY_TIP, LANDMARK.PINKY_MCP);

    return indexClosed && middleClosed && ringClosed && pinkyClosed;
}

/**
 * Check if the palm is open (fingers extended)
 */
export function isPalmOpen(landmarks: LandmarkList): boolean {
    if (!landmarks || landmarks.length < 21) return false;

    // Check if fingers are extended (tip is significantly above MCP in y)
    const OPEN_THRESHOLD = 0.05;

    const indexOpen = (landmarks[LANDMARK.INDEX_MCP].y - landmarks[LANDMARK.INDEX_TIP].y) > OPEN_THRESHOLD;
    const middleOpen = (landmarks[LANDMARK.MIDDLE_MCP].y - landmarks[LANDMARK.MIDDLE_TIP].y) > OPEN_THRESHOLD;
    const ringOpen = (landmarks[LANDMARK.RING_MCP].y - landmarks[LANDMARK.RING_TIP].y) > OPEN_THRESHOLD;
    const pinkyOpen = (landmarks[LANDMARK.PINKY_MCP].y - landmarks[LANDMARK.PINKY_TIP].y) > OPEN_THRESHOLD;

    // At least 3 fingers should be open
    const openCount = [indexOpen, middleOpen, ringOpen, pinkyOpen].filter(Boolean).length;
    return openCount >= 3;
}

/**
 * Calculate the palm center position
 */
export function getPalmCenter(landmarks: LandmarkList): Point {
    if (!landmarks || landmarks.length < 21) {
        return { x: 0, y: 0 };
    }

    // Average of wrist and all MCP joints
    const mcpIndices = [
        LANDMARK.WRIST,
        LANDMARK.INDEX_MCP,
        LANDMARK.MIDDLE_MCP,
        LANDMARK.RING_MCP,
        LANDMARK.PINKY_MCP,
    ];

    let sumX = 0;
    let sumY = 0;

    for (const idx of mcpIndices) {
        sumX += landmarks[idx].x;
        sumY += landmarks[idx].y;
    }

    return {
        x: sumX / mcpIndices.length,
        y: sumY / mcpIndices.length,
    };
}

/**
 * Detect swipe direction based on palm movement
 */
export function getSwipeDirection(
    currentCenter: Point,
    previousCenter: Point
): 'left' | 'right' | 'up' | null {
    const deltaX = currentCenter.x - previousCenter.x;
    const deltaY = currentCenter.y - previousCenter.y;

    // Check vertical movement first (up gesture is more intentional)
    // In camera coordinates, y decreases upward, so negative deltaY = moving up
    if (deltaY < -SWIPE_FRAME_THRESHOLD) {
        return 'up';
    }

    // Note: In camera view, moving left on screen appears as right movement in coordinate
    // So we invert the logic for natural interaction
    if (deltaX > SWIPE_FRAME_THRESHOLD) {
        return 'left'; // Hand moved right -> swipe left (mirrored)
    } else if (deltaX < -SWIPE_FRAME_THRESHOLD) {
        return 'right'; // Hand moved left -> swipe right (mirrored)
    }

    return null;
}

/**
 * Swipe tracker to accumulate movement over multiple frames
 */
export class SwipeTracker {
    private accumulatedX: number = 0;
    private accumulatedY: number = 0;
    private frameCount: number = 0;
    private readonly maxFrames: number = 10;
    private lastDirection: 'left' | 'right' | 'up' | null = null;

    track(currentCenter: Point, previousCenter: Point): 'left' | 'right' | 'up' | null {
        const deltaX = currentCenter.x - previousCenter.x;
        const deltaY = currentCenter.y - previousCenter.y;

        // Determine dominant direction
        const currentDir = Math.abs(deltaY) > Math.abs(deltaX) && deltaY < 0
            ? 'up'
            : deltaX > 0 ? 'left' : deltaX < 0 ? 'right' : null;

        if (this.lastDirection && currentDir && currentDir !== this.lastDirection) {
            // Direction changed, reset
            this.reset();
        }

        this.lastDirection = currentDir;
        this.accumulatedX += deltaX;
        this.accumulatedY += deltaY;
        this.frameCount++;

        // Check vertical movement first (up gesture)
        if (this.accumulatedY < -SWIPE_THRESHOLD) {
            this.reset();
            return 'up';
        }

        // Check horizontal movement
        if (Math.abs(this.accumulatedX) > SWIPE_THRESHOLD) {
            const result = this.accumulatedX > 0 ? 'left' : 'right';
            this.reset();
            return result;
        }

        // Reset if too many frames without triggering
        if (this.frameCount >= this.maxFrames) {
            this.reset();
        }

        return null;
    }

    reset(): void {
        this.accumulatedX = 0;
        this.accumulatedY = 0;
        this.frameCount = 0;
        this.lastDirection = null;
    }
}

/**
 * Main gesture detection function
 */
export function detectGesture(
    landmarks: LandmarkList | null,
    previousLandmarks: LandmarkList | null
): Gesture {
    // No hand detected
    if (!landmarks || landmarks.length < 21) {
        return 'none';
    }

    // Check for fist first (confirmation gesture)
    if (isFist(landmarks)) {
        return 'fist';
    }

    // Check for swipe if we have previous frame data
    if (previousLandmarks && previousLandmarks.length >= 21) {
        const currentCenter = getPalmCenter(landmarks);
        const previousCenter = getPalmCenter(previousLandmarks);
        const swipeDirection = getSwipeDirection(currentCenter, previousCenter);

        if (swipeDirection === 'up') {
            return 'swipe-up';
        } else if (swipeDirection === 'left') {
            return 'swipe-left';
        } else if (swipeDirection === 'right') {
            return 'swipe-right';
        }
    }

    return 'none';
}

/**
 * Gesture state manager to prevent rapid-fire events
 */
export class GestureStateManager {
    private lastGesture: Gesture = 'none';
    private gestureStartTime: number = 0;
    private readonly cooldownMs: number;

    constructor(cooldownMs: number = 500) {
        this.cooldownMs = cooldownMs;
    }

    /**
     * Process a gesture and return it only if it's a new, valid gesture
     */
    processGesture(gesture: Gesture): Gesture | null {
        const now = Date.now();

        // If same gesture, ignore (prevents repeated triggers)
        if (gesture === this.lastGesture && gesture !== 'none') {
            return null;
        }

        // If in cooldown period, ignore
        if (now - this.gestureStartTime < this.cooldownMs && gesture !== 'none') {
            return null;
        }

        // New valid gesture
        if (gesture !== 'none') {
            this.lastGesture = gesture;
            this.gestureStartTime = now;
            return gesture;
        }

        // Reset when no gesture
        if (gesture === 'none' && this.lastGesture !== 'none') {
            this.lastGesture = 'none';
        }

        return null;
    }

    reset(): void {
        this.lastGesture = 'none';
        this.gestureStartTime = 0;
    }
}
