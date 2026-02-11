/**
 * useHandTracking Hook
 * 
 * Integrates MediaPipe Hands for real-time hand tracking
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { Hands, Results } from '@mediapipe/hands';
import { Camera } from '@mediapipe/camera_utils';
import type { LandmarkList } from '../utils/gestureRecognition';

export interface UseHandTrackingOptions {
    videoElement: HTMLVideoElement | null;
    onResults?: (landmarks: LandmarkList | null) => void;
    maxNumHands?: number;
    minDetectionConfidence?: number;
    minTrackingConfidence?: number;
}

export interface UseHandTrackingResult {
    isInitialized: boolean;
    isDetected: boolean;
    landmarks: LandmarkList | null;
    error: string | null;
}

export function useHandTracking({
    videoElement,
    onResults,
    maxNumHands = 1,
    minDetectionConfidence = 0.5,
    minTrackingConfidence = 0.5,
}: UseHandTrackingOptions): UseHandTrackingResult {
    const handsRef = useRef<Hands | null>(null);
    const cameraRef = useRef<Camera | null>(null);
    const [isInitialized, setIsInitialized] = useState(false);
    const [isDetected, setIsDetected] = useState(false);
    const [landmarks, setLandmarks] = useState<LandmarkList | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleResults = useCallback((results: Results) => {
        if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
            const handLandmarks = results.multiHandLandmarks[0] as LandmarkList;
            setLandmarks(handLandmarks);
            setIsDetected(true);
            onResults?.(handLandmarks);
        } else {
            setLandmarks(null);
            setIsDetected(false);
            onResults?.(null);
        }
    }, [onResults]);

    useEffect(() => {
        if (!videoElement) return;

        let isMounted = true;

        const initializeHands = async () => {
            try {
                // Initialize MediaPipe Hands
                const hands = new Hands({
                    locateFile: (file) => {
                        return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
                    },
                });

                hands.setOptions({
                    maxNumHands,
                    modelComplexity: 1,
                    minDetectionConfidence,
                    minTrackingConfidence,
                });

                hands.onResults(handleResults);

                // Initialize Camera
                const camera = new Camera(videoElement, {
                    onFrame: async () => {
                        if (hands && isMounted) {
                            await hands.send({ image: videoElement });
                        }
                    },
                    width: 1280,
                    height: 720,
                });

                handsRef.current = hands;
                cameraRef.current = camera;

                await camera.start();

                if (isMounted) {
                    setIsInitialized(true);
                    setError(null);
                }
            } catch (err) {
                console.error('Failed to initialize MediaPipe Hands:', err);
                if (isMounted) {
                    setError('無法初始化手部追蹤。請確認網路連線正常。');
                }
            }
        };

        initializeHands();

        return () => {
            isMounted = false;
            cameraRef.current?.stop();
            handsRef.current?.close();
        };
    }, [videoElement, maxNumHands, minDetectionConfidence, minTrackingConfidence, handleResults]);

    return {
        isInitialized,
        isDetected,
        landmarks,
        error,
    };
}
