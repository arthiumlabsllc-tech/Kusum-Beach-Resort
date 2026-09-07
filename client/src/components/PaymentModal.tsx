import { useState, useEffect } from 'react';
import { FiX, FiCheck, FiExternalLink, FiDollarSign } from 'react-icons/fi';

const paymentMethods = [
  { value: 'cash', label: 'Cash', icon: '💵' },
  { value: 'momo_mtn', label: 'MTN MoMo', icon: '📱' },
  { value: 'momo_vodafone', label: 'Vodafone Cash', icon: '📱' },
  { value: 'momo_airteltigo', label: 'AirtelTigo Money', icon: '📱' },
  { value: 'crypto_stablecoin', label: 'Crypto (Stablecoin)', icon: '🪙' },
];

const isMobileMoney = (method: string) => method.startsWith('momo_');

interface PaymentModalProps {
  open: boolean;
  total: number;
  onSubmit: (paymentMethod: string, amountPaid: number) => void;
  onClose: () => void;
  submitting: boolean;
  /** When true, shows "Pay with Paystack" button for MoMo methods */
  paystackEnabled?: boolean;
  /** Called when user wants to pay via Paystack */
  onPaystackPay?: (paymentMethod: string) => void;
  /** Loading state for Paystack */
  paystackLoading?: boolean;
  /** Called when user wants to pay with crypto */
  onCryptoPay?: () => void;
}

const PaymentModal = ({
  open, total, onSubmit, onClose, submitting,
  paystackEnabled, onPaystackPay, paystackLoading, onCryptoPay,
}: PaymentModalProps) => {
  const [method, setMethod] = useState('cash');
  const [amountText, setAmountText] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Reset when modal opens
  useEffect(() => {
    if (open) {
      setMethod('cash');
      setAmountText(total.toFixed(2));
      setError(null);
    }
  }, [open, total]);

  if (!open) return null;

  const amountPaid = parseFloat(amountText) || 0;
  const change = amountPaid - total;
  const usePaystack = paystackEnabled && isMobileMoney(method);
  const useCrypto = method === 'crypto_stablecoin';
  const canSubmit = !usePaystack && !useCrypto && amountPaid >= total && !submitting;

  function handleSubmit() {
    if (usePaystack) {
      onPaystackPay?.(method);
      return;
    }
    if (useCrypto) {
      onCryptoPay?.();
      return;
    }
    if (amountPaid < total) {
      setError('Amount is less than the total');
      return;
    }
    onSubmit(method, amountPaid);
  }

  function handleExactAmount() {
    setAmountText(total.toFixed(2));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">Take Payment</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          >
            <FiX size={20} />
          </button>
        </div>

        {/* Total Display */}
        <div className="bg-gradient-to-r from-primary-600 to-primary-700 px-6 py-4 text-center text-white">
          <p className="text-sm text-primary-200">Total Due</p>
          <p className="text-3xl font-bold">GHS {total.toFixed(2)}</p>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Payment Method */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Payment Method</label>
            <div className="grid grid-cols-2 gap-2">
              {paymentMethods.map((pm) => (
                <button
                  key={pm.value}
                  onClick={() => { setMethod(pm.value); setError(null); }}
                  className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition-all ${
                    method === pm.value
                      ? 'border-primary-500 bg-primary-50 text-primary-700 ring-1 ring-primary-500'
                      : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <span className="text-base">{pm.icon}</span>
                  <span>{pm.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Amount (only for Cash) */}
          {!usePaystack && !useCrypto && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Amount Received
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">GHS</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={amountText}
                  onChange={(e) => { setAmountText(e.target.value); setError(null); }}
                  className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="0.00"
                />
              </div>
              <button onClick={handleExactAmount} className="mt-1.5 text-sm text-primary-600 hover:text-primary-700 font-medium">
                Exact amount
              </button>
            </div>
          )}

          {/* Paystack Info for MoMo */}
          {usePaystack && (
            <div className="rounded-lg bg-blue-50 border border-blue-200 px-4 py-3 space-y-2">
              <div className="flex items-center gap-2 text-blue-800">
                <FiExternalLink className="text-blue-600" />
                <span className="text-sm font-semibold">Pay with Paystack</span>
              </div>
              <p className="text-xs text-blue-700">
                You'll be redirected to Paystack's secure checkout to complete the payment.
                The customer enters their phone number and confirms with their MoMo PIN.
              </p>
              <p className="text-[10px] text-blue-500">
                Test mode: Use card number 4084 0840 8408 4081, expiry any future date, CVV any 3 digits, OTP 0000.
              </p>
            </div>
          )}

          {/* Crypto Info */}
          {useCrypto && (
            <div className="rounded-lg bg-purple-50 border border-purple-200 px-4 py-3 space-y-2">
              <div className="flex items-center gap-2 text-purple-800">
                <FiDollarSign className="text-purple-600" />
                <span className="text-sm font-semibold">Pay with Cryptocurrency</span>
              </div>
              <p className="text-xs text-purple-700">
                Accept crypto payments via BCon Global. Supports USDT, USDC, BTC, and ETH.
                A unique payment address will be generated for this order.
              </p>
              <p className="text-[10px] text-purple-500">
                The customer scans a QR code or sends crypto to the generated address. Payment is confirmed after blockchain confirmation.
              </p>
            </div>
          )}

          {/* Change Preview (Cash only) */}
          {!usePaystack && !useCrypto && change > 0 && (
            <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-green-800">Change Due</span>
                <span className="text-lg font-bold text-green-700">GHS {change.toFixed(2)}</span>
              </div>
            </div>
          )}

          {!usePaystack && !useCrypto && amountPaid > 0 && amountPaid < total && (
            <div className="rounded-lg bg-orange-50 border border-orange-200 px-4 py-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-orange-800">Still Due</span>
                <span className="text-lg font-bold text-orange-700">GHS {(total - amountPaid).toFixed(2)}</span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-6 py-4 space-y-3">
          {!usePaystack && !useCrypto && (
            <div className="flex items-center justify-between text-sm text-gray-600">
              <span>Tendered</span>
              <span className="font-medium">GHS {amountPaid.toFixed(2)}</span>
            </div>
          )}
          {!usePaystack && !useCrypto && change > 0 && (
            <div className="flex items-center justify-between text-sm font-semibold text-gray-900">
              <span>Change</span>
              <span>GHS {change.toFixed(2)}</span>
            </div>
          )}
          <button
            onClick={handleSubmit}
            disabled={usePaystack ? (paystackLoading || submitting) : useCrypto ? submitting : !canSubmit}
            className={`w-full flex items-center justify-center gap-2 rounded-xl py-3.5 text-lg font-semibold text-white shadow-lg transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed ${
              useCrypto
                ? 'bg-gradient-to-r from-purple-600 to-indigo-700 hover:from-purple-700 hover:to-indigo-800'
                : usePaystack
                ? 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700'
                : 'bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800'
            }`}
          >
            {(paystackLoading || submitting) ? (
              <>
                <span className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
                {paystackLoading ? 'Opening Paystack...' : 'Recording...'}
              </>
            ) : useCrypto ? (
              <>
                <FiDollarSign />
                Pay with Crypto
              </>
            ) : usePaystack ? (
              <>
                <FiExternalLink />
                Pay GHS {total.toFixed(2)} with Paystack
              </>
            ) : (
              <>
                <FiCheck />
                Complete Sale · GHS {total.toFixed(2)}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentModal;
