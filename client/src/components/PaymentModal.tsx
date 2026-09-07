import { useState, useEffect } from 'react';
import { FiX, FiCheck } from 'react-icons/fi';

const paymentMethods = [
  { value: 'cash', label: 'Cash', icon: '💵' },
  { value: 'momo_mtn', label: 'MTN MoMo', icon: '📱' },
  { value: 'momo_vodafone', label: 'Vodafone Cash', icon: '📱' },
  { value: 'momo_airteltigo', label: 'AirtelTigo Money', icon: '📱' },
  { value: 'crypto_stablecoin', label: 'Crypto (Stablecoin)', icon: '🪙' },
];

interface PaymentModalProps {
  open: boolean;
  total: number;
  onSubmit: (paymentMethod: string, amountPaid: number) => void;
  onClose: () => void;
  submitting: boolean;
}

const PaymentModal = ({ open, total, onSubmit, onClose, submitting }: PaymentModalProps) => {
  const [method, setMethod] = useState('cash');
  const [amountText, setAmountText] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Reset when modal opens — prefill cash with exact total
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
  const canSubmit = amountPaid >= total && !submitting;

  function handleSubmit() {
    if (!canSubmit) return;
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
          <h2 className="text-lg font-semibold text-gray-900">
            Take Payment
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          >
            <FiX size={20} />
          </button>
        </div>

        {/* Total Display */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 text-center text-white">
          <p className="text-sm text-blue-200">Total Due</p>
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
                  onClick={() => setMethod(pm.value)}
                  className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition-all ${
                    method === pm.value
                      ? 'border-blue-500 bg-blue-50 text-blue-700 ring-1 ring-blue-500'
                      : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <span className="text-base">{pm.icon}</span>
                  <span>{pm.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Amount */}
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
                onChange={(e) => {
                  setAmountText(e.target.value);
                  setError(null);
                }}
                className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="0.00"
              />
            </div>
            <button
              onClick={handleExactAmount}
              className="mt-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Exact amount
            </button>
          </div>

          {/* Change Preview */}
          {change > 0 && (
            <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-green-800">Change Due</span>
                <span className="text-lg font-bold text-green-700">GHS {change.toFixed(2)}</span>
              </div>
            </div>
          )}

          {amountPaid > 0 && amountPaid < total && (
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
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>Tendered</span>
            <span className="font-medium">GHS {amountPaid.toFixed(2)}</span>
          </div>
          {change > 0 && (
            <div className="flex items-center justify-between text-sm font-semibold text-gray-900">
              <span>Change</span>
              <span>GHS {change.toFixed(2)}</span>
            </div>
          )}
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 py-3.5 text-lg font-semibold text-white shadow-lg hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
          >
            {submitting ? (
              <>
                <span className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
                Recording...
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
