/**
 * useCamera Hook
 * 
 * Manages camera access with proper error handling for:
 * - Permission denied
 * - No camera device
 * - Browser not supported
 */

import { useEffect, useRef, useState, useCallback } from 'react';

export type CameraError =
    | 'NotAllowedError'      // User denied permission
    | 'NotFoundError'        // No camera device
    | 'NotSupportedError'    // Browser doesn't support getUserMedia
    | 'OverconstrainedError' // Camera doesn't meet constraints
    | 'UnknownError';        // Other errors

export interface UseCameraResult {
    videoRef: React.RefObject<HTMLVideoElement | null>;
    isReady: boolean;
    error: CameraError | null;
    errorMessage: string | null;
    retry: () => void;
}

const ERROR_MESSAGES: Record<CameraError, string> = {
    NotAllowedError: '鏡頭權限被拒絕。請在瀏覽器設定中允許鏡頭存取。',
    NotFoundError: '找不到鏡頭裝置。請確認鏡頭已連接。',
    NotSupportedError: '您的瀏覽器不支援鏡頭存取功能。',
    OverconstrainedError: '鏡頭不符合要求的規格。',
    UnknownError: '開啟鏡頭時發生錯誤，請重試。',
};

export function useCamera(): UseCameraResult {
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const [isReady, setIsReady] = useState(false);
    const [error, setError] = useState<CameraError | null>(null);

    const startCamera = useCallback(async () => {
        setError(null);
        setIsReady(false);

        // Check if getUserMedia is supported
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            setError('NotSupportedError');
            return;
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                    facingMode: 'user', // Front camera
                },
                audio: false,
            });

            streamRef.current = stream;

            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                videoRef.current.onloadedmetadata = () => {
                    videoRef.current?.play();
                    setIsReady(true);
                };
            }
        } catch (err) {
            const error = err as DOMException;

            switch (error.name) {
                case 'NotAllowedError':
                case 'PermissionDeniedError':
                    setError('NotAllowedError');
                    break;
                case 'NotFoundError':
                case 'DevicesNotFoundError':
                    setError('NotFoundError');
                    break;
                case 'NotSupportedError':
                    setError('NotSupportedError');
                    break;
                case 'OverconstrainedError':
                    setError('OverconstrainedError');
                    break;
                default:
                    setError('UnknownError');
                    console.error('Camera error:', error);
            }
        }
    }, []);

    const stopCamera = useCallback(() => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        setIsReady(false);
    }, []);

    const retry = useCallback(() => {
        stopCamera();
        startCamera();
    }, [stopCamera, startCamera]);

    useEffect(() => {
        startCamera();
        return () => stopCamera();
    }, [startCamera, stopCamera]);

    return {
        videoRef,
        isReady,
        error,
        errorMessage: error ? ERROR_MESSAGES[error] : null,
        retry,
    };
}
