/**
 * GestureCardSelector Component
 * 
 * Main component that integrates camera, hand tracking, and card selection
 * Using @mediapipe/tasks-vision (new API)
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useCamera } from '../hooks/useCamera';
import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';
import { detectGesture, GestureStateManager, SwipeTracker, getPalmCenter, type LandmarkList, type Gesture } from '../utils/gestureRecognition';
import { CardFan } from './CardFan';
import type { TarotCardData } from './TarotCard';
import './GestureCardSelector.css';

// Sample tarot cards data
const SAMPLE_CARDS: TarotCardData[] = [
    { id: '0', name: '愚者', image: '/cards/fool.png', isReversed: false },
    { id: '1', name: '魔術師', image: '/cards/magician.png', isReversed: false },
    { id: '2', name: '女祭司', image: '/cards/priestess.png', isReversed: false },
    { id: '3', name: '皇后', image: '/cards/empress.png', isReversed: false },
    { id: '4', name: '皇帝', image: '/cards/emperor.png', isReversed: false },
    { id: '5', name: '教皇', image: '/cards/hierophant.png', isReversed: false },
    { id: '6', name: '戀人', image: '/cards/lovers.png', isReversed: false },
    { id: '7', name: '戰車', image: '/cards/chariot.png', isReversed: false },
    { id: '8', name: '力量', image: '/cards/strength.png', isReversed: false },
    { id: '9', name: '隱士', image: '/cards/hermit.png', isReversed: false },
];

interface GestureCardSelectorProps {
    cards?: TarotCardData[];
    maxSelections?: number;
    onSelectionComplete?: (selectedCards: TarotCardData[]) => void;
}

export function GestureCardSelector({
    cards = SAMPLE_CARDS,
    maxSelections = 3,
    onSelectionComplete,
}: GestureCardSelectorProps) {
    const { videoRef, isReady: isCameraReady, error: cameraError, errorMessage, retry } = useCamera();
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
    const [selectedCardIds, setSelectedCardIds] = useState<string[]>([]);
    const [currentGesture, setCurrentGesture] = useState<Gesture>('none');
    const [isComplete, setIsComplete] = useState(false);
    const [isDetected, setIsDetected] = useState(false);
    const [isHandsReady, setIsHandsReady] = useState(false);
    const [handsError, setHandsError] = useState<string | null>(null);

    const previousLandmarksRef = useRef<LandmarkList | null>(null);
    const gestureManagerRef = useRef(new GestureStateManager(600));
    const swipeTrackerRef = useRef(new SwipeTracker());
    const handLandmarkerRef = useRef<HandLandmarker | null>(null);
    const animationFrameRef = useRef<number | null>(null);
    const hoveredIndexRef = useRef<number | null>(null);

    // Keep hoveredIndexRef in sync
    useEffect(() => {
        hoveredIndexRef.current = hoveredIndex;
    }, [hoveredIndex]);

    const handleCardSelect = useCallback((cardId: string) => {
        setSelectedCardIds((prev) => {
            if (prev.includes(cardId)) {
                return prev.filter((id) => id !== cardId);
            } else if (prev.length < maxSelections) {
                const newSelection = [...prev, cardId];
                if (newSelection.length === maxSelections) {
                    setIsComplete(true);
                }
                return newSelection;
            }
            return prev;
        });
    }, [maxSelections]);

    // Initialize MediaPipe HandLandmarker when camera is ready
    useEffect(() => {
        if (!isCameraReady || !videoRef.current) return;

        let isMounted = true;
        const video = videoRef.current;

        const initializeHandLandmarker = async () => {
            try {
                console.log('Initializing MediaPipe HandLandmarker (tasks-vision)...');
                setHandsError(null);

                // Load WASM files
                const vision = await FilesetResolver.forVisionTasks(
                    'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
                );

                // Create HandLandmarker
                const handLandmarker = await HandLandmarker.createFromOptions(vision, {
                    baseOptions: {
                        modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
                        delegate: 'GPU',
                    },
                    runningMode: 'VIDEO',
                    numHands: 1,
                    minHandDetectionConfidence: 0.5,
                    minHandPresenceConfidence: 0.5,
                    minTrackingConfidence: 0.5,
                });

                handLandmarkerRef.current = handLandmarker;

                if (isMounted) {
                    setIsHandsReady(true);
                    setHandsError(null);
                    console.log('MediaPipe HandLandmarker initialized successfully');
                }

                // Start processing frames
                let lastVideoTime = -1;

                const processFrame = () => {
                    if (!isMounted || !handLandmarkerRef.current) return;

                    const currentTime = video.currentTime;
                    if (currentTime !== lastVideoTime && video.readyState >= 2) {
                        lastVideoTime = currentTime;

                        try {
                            const results = handLandmarkerRef.current.detectForVideo(video, performance.now());

                            if (results.landmarks && results.landmarks.length > 0) {
                                const landmarks = results.landmarks[0] as LandmarkList;
                                setIsDetected(true);

                                // Map palm position to linear horizontal layout for Fan
                                // The fan is primarily horizontal, so we care most about X
                                const palmCenter = getPalmCenter(landmarks);
                                const mirroredX = 1 - palmCenter.x; // Mirror for intuitive interaction

                                // Map X (0-1) to card index
                                // We add some padding on sides to make selecting edge cards easier
                                const padding = 0.1;
                                const effectiveWidth = 1 - 2 * padding;
                                const adjustedX = Math.max(0, Math.min(1, (mirroredX - padding) / effectiveWidth));

                                const cardIndex = Math.floor(adjustedX * cards.length);

                                if (cardIndex >= 0 && cardIndex < cards.length) {
                                    setHoveredIndex(cardIndex);
                                }

                                // First check for fist gesture
                                const gesture = detectGesture(landmarks, previousLandmarksRef.current);

                                // Also track swipe using accumulated movement
                                let detectedGesture: Gesture = gesture;
                                if (gesture === 'none' && previousLandmarksRef.current) {
                                    const currentCenter = getPalmCenter(landmarks);
                                    const previousCenter = getPalmCenter(previousLandmarksRef.current);
                                    const swipeResult = swipeTrackerRef.current.track(currentCenter, previousCenter);
                                    if (swipeResult === 'up') {
                                        detectedGesture = 'swipe-up';
                                    } else if (swipeResult === 'left') {
                                        detectedGesture = 'swipe-left';
                                    } else if (swipeResult === 'right') {
                                        detectedGesture = 'swipe-right';
                                    }
                                }

                                previousLandmarksRef.current = landmarks;

                                const validGesture = gestureManagerRef.current.processGesture(detectedGesture);

                                if (validGesture) {
                                    console.log('Gesture detected:', validGesture);
                                    setCurrentGesture(validGesture);

                                    // Swipe up = select the hovered card
                                    if (validGesture === 'swipe-up' || validGesture === 'fist') {
                                        const idx = hoveredIndexRef.current;
                                        if (idx !== null && idx >= 0 && idx < cards.length) {
                                            handleCardSelect(cards[idx].id);
                                        }
                                    }

                                    setTimeout(() => setCurrentGesture('none'), 500);
                                }
                            } else {
                                setIsDetected(false);
                                setHoveredIndex(null);
                                previousLandmarksRef.current = null;
                                swipeTrackerRef.current.reset();
                            }
                        } catch (err) {
                            console.error('Error processing frame:', err);
                        }
                    }

                    animationFrameRef.current = requestAnimationFrame(processFrame);
                };

                processFrame();

            } catch (err) {
                console.error('Failed to initialize MediaPipe HandLandmarker:', err);
                if (isMounted) {
                    const errorMsg = err instanceof Error ? err.message : '未知錯誤';
                    setHandsError(`手勢識別載入失敗: ${errorMsg}`);
                }
            }
        };

        initializeHandLandmarker();

        return () => {
            isMounted = false;
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
            handLandmarkerRef.current?.close();
        };
    }, [isCameraReady, cards, handleCardSelect]);

    const handleComplete = useCallback(() => {
        const selectedCards = cards.filter((card) => selectedCardIds.includes(card.id));
        onSelectionComplete?.(selectedCards);
    }, [cards, selectedCardIds, onSelectionComplete]);

    const handleReset = useCallback(() => {
        setSelectedCardIds([]);
        setIsComplete(false);
        setHoveredIndex(null);
        gestureManagerRef.current.reset();
    }, []);

    const getGestureText = (gesture: Gesture): string => {
        switch (gesture) {
            case 'swipe-up': return '↑ 抽牌!';
            case 'swipe-left': return '← 左揮';
            case 'swipe-right': return '右揮 →';
            case 'fist': return '✊ 選牌!';
            default: return '';
        }
    };

    return (
        <div className="gesture-card-selector">
            {/* Camera Error */}
            {cameraError && (
                <div className="error-overlay">
                    <div className="error-content">
                        <div className="error-icon">📷</div>
                        <h2>鏡頭存取失敗</h2>
                        <p>{errorMessage}</p>
                        <button className="retry-button" onClick={retry}>
                            重試
                        </button>
                    </div>
                </div>
            )}

            {/* Loading State */}
            {!isCameraReady && !cameraError && (
                <div className="loading-overlay">
                    <div className="loading-spinner" />
                    <p>正在啟動鏡頭...</p>
                </div>
            )}

            {/* Main Content */}
            <div className="selector-content">
                {/* Video Preview */}
                <div className="video-container">
                    <video
                        ref={videoRef}
                        className="camera-preview"
                        playsInline
                        muted
                    />

                    {/* Hand detection indicator */}
                    <div className={`hand-indicator ${isDetected ? 'detected' : ''} ${handsError ? 'error' : ''}`}>
                        {handsError
                            ? `❌ ${handsError}`
                            : !isHandsReady
                                ? '⏳ 載入手勢識別中（首次載入需 5-15 秒）...'
                                : isDetected
                                    ? '✋ 偵測到手部'
                                    : '🔍 請將手伸入鏡頭'}
                    </div>

                    {/* Gesture feedback */}
                    {currentGesture !== 'none' && (
                        <div className="gesture-feedback">
                            {getGestureText(currentGesture)}
                        </div>
                    )}
                </div>

                {/* Card Fan Layout */}
                <CardFan
                    cards={cards}
                    selectedCardIds={selectedCardIds}
                    hoveredIndex={hoveredIndex}
                    onCardSelect={handleCardSelect}
                />

                {/* Instructions */}
                <div className="instructions">
                    <div className="instruction-item">
                        <span className="gesture-icon">🖐️</span>
                        <span>移動手掌選擇牌</span>
                    </div>
                    <div className="instruction-item">
                        <span className="gesture-icon">☝️↑</span>
                        <span>向上揮手抽牌</span>
                    </div>
                </div>

                {/* Action Buttons */}
                {isComplete && (
                    <div className="action-buttons">
                        <button className="complete-button" onClick={handleComplete}>
                            開始解牌 ({selectedCardIds.length} 張)
                        </button>
                        <button className="reset-button" onClick={handleReset}>
                            重新選擇
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
