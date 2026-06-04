import { useState, useCallback, useRef, useEffect } from 'react';

type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

interface CircuitBreakerConfig {
  failureThreshold?: number;  // Default: 3
  recoveryTimeout?: number;   // Default: 300000 (5 minutes)
}

interface CircuitBreakerReturn {
  state: CircuitState;
  failureCount: number;
  isAvailable: boolean;
  executeWithCircuitBreaker: <T>(fn: () => Promise<T>) => Promise<T>;
  manualReset: () => void;
  getNextAttemptTime: () => number | null;
}

export function useCircuitBreaker(config: CircuitBreakerConfig = {}): CircuitBreakerReturn {
  const {
    failureThreshold = 3,
    recoveryTimeout = 300000, // 5 minutes
  } = config;

  const [state, setState] = useState<CircuitState>('CLOSED');
  const [failureCount, setFailureCount] = useState(0);
  const nextAttemptTimeRef = useRef<number | null>(null);
  const halfOpenTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const recoveryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Clear timeouts on unmount
  useEffect(() => {
    return () => {
      if (halfOpenTimeoutRef.current) clearTimeout(halfOpenTimeoutRef.current);
      if (recoveryTimeoutRef.current) clearTimeout(recoveryTimeoutRef.current);
    };
  }, []);

  const transitionToOpen = useCallback(() => {
    setState('OPEN');
    nextAttemptTimeRef.current = Date.now() + recoveryTimeout;

    // Auto transition to HALF_OPEN after recovery timeout
    if (recoveryTimeoutRef.current) clearTimeout(recoveryTimeoutRef.current);
    recoveryTimeoutRef.current = setTimeout(() => {
      setState('HALF_OPEN');
      setFailureCount(0);
      nextAttemptTimeRef.current = null;
    }, recoveryTimeout);
  }, [recoveryTimeout]);

  const transitionToClosed = useCallback(() => {
    setState('CLOSED');
    setFailureCount(0);
    nextAttemptTimeRef.current = null;

    // Clear any pending timeouts
    if (recoveryTimeoutRef.current) {
      clearTimeout(recoveryTimeoutRef.current);
      recoveryTimeoutRef.current = null;
    }
    if (halfOpenTimeoutRef.current) {
      clearTimeout(halfOpenTimeoutRef.current);
      halfOpenTimeoutRef.current = null;
    }
  }, []);

  const executeWithCircuitBreaker = useCallback(async <T>(
    fn: () => Promise<T>
  ): Promise<T> => {
    // If circuit is OPEN, don't execute
    if (state === 'OPEN') {
      throw new Error('Circuit breaker is OPEN - service unavailable');
    }

    try {
      const result = await fn();

      // Success: transition to CLOSED
      if (state === 'HALF_OPEN') {
        transitionToClosed();
      } else {
        // Reset failure count on success in CLOSED state
        setFailureCount(0);
      }

      return result;
    } catch (error) {
      const newCount = failureCount + 1;
      setFailureCount(newCount);

      // Check if we should transition to OPEN
      if (newCount >= failureThreshold) {
        transitionToOpen();
      }

      throw error;
    }
  }, [state, failureCount, failureThreshold, transitionToOpen, transitionToClosed]);

  const manualReset = useCallback(() => {
    transitionToClosed();
  }, [transitionToClosed]);

  const getNextAttemptTime = useCallback(() => {
    return nextAttemptTimeRef.current;
  }, []);

  return {
    state,
    failureCount,
    isAvailable: state !== 'OPEN',
    executeWithCircuitBreaker,
    manualReset,
    getNextAttemptTime,
  };
}
