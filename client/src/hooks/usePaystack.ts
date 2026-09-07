import { useCallback, useEffect, useRef, useState } from 'react';
import api from '../lib/api';

declare global {
  interface Window {
    PaystackPop?: {
      setup: (config: any) => { openIframe: () => void };
    };
  }
}

interface UsePaystackOptions {
  publicKey: string;
  email?: string;
  amount: number; // in GHS
  onSuccess: (reference: string) => void;
  onClose?: () => void;
  onError?: (error: string) => void;
}

const PAYSTACK_JS = 'https://js.paystack.co/v1/inline.js';

/**
 * Hook to handle Paystack payments.
 *
 * Flow:
 *  1. Load Paystack inline JS
 *  2. Call our backend to initialize a transaction (gets authorization_url + reference)
 *  3. Open Paystack popup with the access code
 *  4. On success callback → call our backend to verify
 *  5. On verified → call onSuccess with the reference
 */
export function usePaystack({ publicKey, email, amount, onSuccess, onClose, onError }: UsePaystackOptions) {
  const [loading, setLoading] = useState(false);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const scriptRef = useRef<HTMLScriptElement | null>(null);

  // Load Paystack inline JS
  useEffect(() => {
    if (window.PaystackPop) {
      setScriptLoaded(true);
      return;
    }

    if (scriptRef.current) return;

    const script = document.createElement('script');
    script.src = PAYSTACK_JS;
    script.async = true;
    script.onload = () => setScriptLoaded(true);
    script.onerror = () => onError?.('Failed to load payment script');
    document.head.appendChild(script);
    scriptRef.current = script;

    return () => {
      // Don't remove on unmount — keep it cached
    };
  }, []);

  /**
   * Start a Paystack payment.
   * 1. First create the order on our backend
   * 2. Then initialize Paystack transaction
   * 3. Open Paystack popup
   */
  const pay = useCallback(
    async (orderId: number) => {
      if (!scriptLoaded) {
        onError?.('Payment script is still loading, please wait...');
        return;
      }

      if (!window.PaystackPop) {
        onError?.('Payment system not available');
        return;
      }

      setLoading(true);

      try {
        // Initialize transaction on our backend
        const initRes = await api.post('/payments/paystack/initialize', {
          orderId,
          email: email || 'guest@kusumbeach.com',
        });

        const { reference } = initRes.data;

        // Open Paystack popup
        const handler = window.PaystackPop.setup({
          key: publicKey,
          email: email || 'guest@kusumbeach.com',
          amount: Math.round(amount * 100), // GHS to pesewas
          currency: 'GHS',
          ref: reference,
          metadata: {
            order_id: orderId,
          },
          onClose: () => {
            setLoading(false);
            onClose?.();
          },
          callback: (response: any) => {
            // Paystack says payment was successful — verify on our backend
            verifyPayment(response.reference)
              .then(() => {
                onSuccess(response.reference);
              })
              .catch((err) => {
                onError?.(err.message || 'Payment verification failed');
              })
              .finally(() => {
                setLoading(false);
              });
          },
        });

        handler.openIframe();
      } catch (error: any) {
        setLoading(false);
        onError?.(error.response?.data?.error || error.message || 'Failed to start payment');
      }
    },
    [publicKey, email, amount, scriptLoaded, onSuccess, onClose, onError]
  );

  /**
   * Verify payment with our backend.
   */
  const verifyPayment = async (reference: string) => {
    const res = await api.post('/payments/paystack/verify', { reference });
    if (!res.data.success) {
      throw new Error(res.data.error || 'Payment verification failed');
    }
    return res.data;
  };

  return { pay, loading, scriptLoaded };
}
