import { useState, useCallback } from 'react';

interface GPSPosition {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

interface UseGPSReturn {
  position: GPSPosition | null;
  error: string | null;
  loading: boolean;
  getCurrentPosition: () => Promise<GPSPosition>;
}

export function useGPS(): UseGPSReturn {
  const [position, setPosition] = useState<GPSPosition | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const getCurrentPosition = useCallback(async (): Promise<GPSPosition> => {
    setLoading(true);
    setError(null);

    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        const errorMsg = 'Geolocation is not supported by this browser';
        setError(errorMsg);
        setLoading(false);
        reject(new Error(errorMsg));
        return;
      }

      const options: PositionOptions = {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      };

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const gpsPosition: GPSPosition = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy || undefined,
          };
          setPosition(gpsPosition);
          setLoading(false);
          resolve(gpsPosition);
        },
        (err) => {
          let errorMsg = 'Failed to get GPS location';
          switch (err.code) {
            case err.PERMISSION_DENIED:
              errorMsg = 'GPS permission denied. Please enable location access.';
              break;
            case err.POSITION_UNAVAILABLE:
              errorMsg = 'GPS position unavailable.';
              break;
            case err.TIMEOUT:
              errorMsg = 'GPS request timed out.';
              break;
          }
          setError(errorMsg);
          setLoading(false);
          reject(new Error(errorMsg));
        },
        options
      );
    });
  }, []);

  return {
    position,
    error,
    loading,
    getCurrentPosition,
  };
}
