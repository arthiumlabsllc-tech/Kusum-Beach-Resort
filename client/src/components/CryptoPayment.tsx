import { useState, useEffect, useRef } from 'react';
import { FiCopy, FiCheck, FiRefreshCw, FiExternalLink, FiClock } from 'react-icons/fi';
import api from '../lib/api';
import { toast } from 'react-toastify';

interface CryptoPaymentProps {
  orderId: number;
  total: number;
  onSuccess: () => void;
  onCancel: () => void;
}

const cryptoOptions = [
  { currency: 'USDT', chain: 'tron', label: 'USDT (TRC-20)', icon: '💲', network: 'Tron' },
  { currency: 'USDT', chain: 'ethereum', label: 'USDT (ERC-20)', icon: '💲', network: 'Ethereum' },
  { currency: 'USDC', chain: 'ethereum', label: 'USDC (ERC-20)', icon: '🪙', network: 'Ethereum' },
  { currency: 'BTC', chain: 'bitcoin', label: 'Bitcoin', icon: '₿', network: 'Bitcoin' },
  { currency: 'ETH', chain: 'ethereum', label: 'Ethereum', icon: '⟠', network: 'Ethereum' },
];

const CryptoPayment = ({ orderId, total, onSuccess, onCancel }: CryptoPaymentProps) => {
  const [selectedOption, setSelectedOption] = useState(0);
  const [invoice, setInvoice] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [copied, setCopied] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const option = cryptoOptions[selectedOption];

  // Create invoice when option changes
  useEffect(() => {
    createInvoice();
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [selectedOption]);

  const createInvoice = async () => {
    setLoading(true);
    setInvoice(null);
    if (pollRef.current) clearInterval(pollRef.current);

    try {
      const res = await api.post('/payments/crypto/bcon/initialize', {
        orderId,
        paymentCurrency: option.currency,
        chain: option.chain,
        originCurrency: 'GHS',
      });

      setInvoice(res.data);

      // Start polling for payment status every 15 seconds
      pollRef.current = setInterval(() => {
        checkPaymentStatus(res.data.externalId);
      }, 15000);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to create crypto invoice');
    } finally {
      setLoading(false);
    }
  };

  const checkPaymentStatus = async (externalId: string) => {
    setChecking(true);
    try {
      const res = await api.get(`/payments/crypto/bcon/status/${externalId}`);
      if (res.data.paid) {
        if (pollRef.current) clearInterval(pollRef.current);
        toast.success('Crypto payment confirmed!');
        onSuccess();
      }
    } catch {
      // Silently fail — will retry on next poll
    } finally {
      setChecking(false);
    }
  };

  const handleCopy = () => {
    if (invoice?.address) {
      navigator.clipboard.writeText(invoice.address);
      setCopied(true);
      toast.success('Address copied!');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const qrCodeUrl = invoice?.address
    ? `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(invoice.address)}&size=200x200&bgcolor=ffffff`
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">Pay with Crypto</h2>
          <button
            onClick={() => { if (pollRef.current) clearInterval(pollRef.current); onCancel(); }}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        {/* Total */}
        <div className="bg-gradient-to-r from-purple-600 to-indigo-700 px-6 py-4 text-center text-white">
          <p className="text-sm text-purple-200">Total Due</p>
          <p className="text-3xl font-bold">GHS {total.toFixed(2)}</p>
        </div>

        <div className="p-6 space-y-4">
          {/* Crypto Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Select Currency</label>
            <div className="grid grid-cols-2 gap-2">
              {cryptoOptions.map((opt, i) => (
                <button
                  key={`${opt.currency}-${opt.chain}`}
                  onClick={() => setSelectedOption(i)}
                  className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition-all ${
                    selectedOption === i
                      ? 'border-purple-500 bg-purple-50 text-purple-700 ring-1 ring-purple-500'
                      : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <span className="text-lg">{opt.icon}</span>
                  <div className="text-left">
                    <span className="block">{opt.label}</span>
                    <span className="block text-[10px] text-gray-400">{opt.network}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Invoice Details */}
          {loading && (
            <div className="text-center py-8">
              <div className="animate-spin h-8 w-8 border-2 border-purple-600 border-t-transparent rounded-full mx-auto mb-3" />
              <p className="text-sm text-gray-500">Generating payment address...</p>
            </div>
          )}

          {invoice && !loading && (
            <div className="space-y-4">
              {/* QR Code */}
              <div className="flex justify-center">
                <div className="bg-white border-2 border-gray-200 rounded-xl p-3">
                  {qrCodeUrl && (
                    <img src={qrCodeUrl} alt="Payment QR Code" className="w-48 h-48" />
                  )}
                </div>
              </div>

              {/* Amount to Send */}
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 text-center">
                <p className="text-xs text-purple-600 mb-1">Send exactly</p>
                <p className="text-2xl font-bold text-purple-900">
                  {invoice.paymentAmount} {invoice.paymentCurrency}
                </p>
                <p className="text-xs text-purple-500 mt-1">on {option.network}</p>
              </div>

              {/* Address */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">To this address:</label>
                <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg p-3">
                  <code className="flex-1 text-xs text-gray-800 break-all font-mono">
                    {invoice.address}
                  </code>
                  <button
                    onClick={handleCopy}
                    className="shrink-0 p-2 rounded-lg bg-white border border-gray-200 hover:bg-gray-100 transition-colors"
                  >
                    {copied ? <FiCheck className="text-green-600" size={16} /> : <FiCopy size={16} />}
                  </button>
                </div>
              </div>

              {/* Status */}
              <div className="flex items-center justify-between bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-3">
                <div className="flex items-center gap-2 text-yellow-800">
                  <FiClock className="text-yellow-600" />
                  <span className="text-sm font-medium">Waiting for payment...</span>
                </div>
                <button
                  onClick={() => checkPaymentStatus(invoice.externalId)}
                  disabled={checking}
                  className="flex items-center gap-1 text-sm text-purple-600 hover:text-purple-700 font-medium"
                >
                  <FiRefreshCw className={checking ? 'animate-spin' : ''} size={14} />
                  {checking ? 'Checking...' : 'Check now'}
                </button>
              </div>

              {/* Instructions */}
              <div className="text-xs text-gray-500 space-y-1">
                <p>1. Send <strong>exactly</strong> {invoice.paymentAmount} {invoice.paymentCurrency}</p>
                <p>2. Send to the address above (or scan the QR code)</p>
                <p>3. Payment is confirmed automatically after blockchain confirmation</p>
                <p className="text-red-500 font-medium">⚠️ Send only {option.currency} on {option.network}. Other tokens may be lost.</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-6 py-4 flex gap-2">
          <button
            onClick={() => { if (pollRef.current) clearInterval(pollRef.current); onCancel(); }}
            className="flex-1 py-2.5 px-4 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => invoice && checkPaymentStatus(invoice.externalId)}
            disabled={!invoice || checking}
            className="flex-1 py-2.5 px-4 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50 transition-colors"
          >
            {checking ? 'Checking...' : "I've Sent It"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CryptoPayment;
