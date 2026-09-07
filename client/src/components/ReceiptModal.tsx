import { FiPrinter, FiX, FiCheck } from 'react-icons/fi';

interface ReceiptModalProps {
  order: {
    orderNumber: string;
    customerName?: string;
    customerType: string;
    items: Array<{ name: string; quantity: number; unitPrice: number; total: number }>;
    subtotal: number;
    discountAmount: number;
    taxAmount: number;
    total: number;
    paymentMethod: string;
    createdAt: string;
    staffName: string;
  } | null;
  onClose: () => void;
}

const paymentLabels: Record<string, string> = {
  cash: 'Cash',
  momo_mtn: 'MTN MoMo',
  momo_vodafone: 'Vodafone Cash',
  momo_airteltigo: 'AirtelTigo Money',
  crypto_stablecoin: 'Crypto (Stablecoin)',
  crypto_other: 'Crypto',
};

const ReceiptModal = ({ order, onClose }: ReceiptModalProps) => {
  if (!order) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleWhatsApp = () => {
    const itemsList = order.items.map((i) => `  ${i.name} x${i.quantity} - GHS ${Number(i.total).toFixed(2)}`).join('\n');
    const message = `*Kusum Beach Resort*\n---------------------\nOrder: ${order.orderNumber}\nDate: ${new Date(order.createdAt).toLocaleString()}\nStaff: ${order.staffName}\n---------------------\n${itemsList}\n---------------------\nSubtotal: GHS ${Number(order.subtotal).toFixed(2)}\n${order.discountAmount > 0 ? `Discount: -GHS ${Number(order.discountAmount).toFixed(2)}\n` : ''}${order.taxAmount > 0 ? `Tax: GHS ${Number(order.taxAmount).toFixed(2)}\n` : ''}*Total: GHS ${Number(order.total).toFixed(2)}*\nPayment: ${paymentLabels[order.paymentMethod] || order.paymentMethod}\n---------------------\nThank you for visiting Kusum Beach!`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full max-h-[90vh] overflow-y-auto">
        {/* Success Header */}
        <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-6 text-center text-white rounded-t-2xl">
          <div className="bg-white/20 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-3">
            <FiCheck className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold">Sale Complete!</h3>
          <p className="text-green-100 text-sm mt-1">Order #{order.orderNumber}</p>
        </div>

        {/* Receipt */}
        <div id="receipt" className="p-6">
          <div className="text-center mb-4">
            <h4 className="text-lg font-bold text-gray-900">Kusum Beach Resort</h4>
            <p className="text-xs text-gray-500">Kokrobite, Accra, Ghana</p>
            <p className="text-xs text-gray-400 mt-1">
              {new Date(order.createdAt).toLocaleDateString()} {new Date(order.createdAt).toLocaleTimeString()}
            </p>
          </div>

          <div className="border-t border-dashed border-gray-300 pt-3 mb-3">
            <p className="text-xs text-gray-500">Staff: {order.staffName}</p>
            {order.customerName && <p className="text-xs text-gray-500">Customer: {order.customerName}</p>}
          </div>

          <div className="border-t border-dashed border-gray-300 pt-3 mb-3">
            {order.items.map((item, i) => (
              <div key={i} className="flex justify-between text-sm py-1">
                <span className="text-gray-700">
                  {item.name} x{item.quantity}
                </span>
                <span className="font-medium text-gray-900">GHS {Number(item.total).toFixed(2)}</span>
              </div>
            ))}
          </div>

          <div className="border-t border-dashed border-gray-300 pt-3 space-y-1">
            <div className="flex justify-between text-sm text-gray-500">
              <span>Subtotal</span>
              <span>GHS {Number(order.subtotal).toFixed(2)}</span>
            </div>
            {order.discountAmount > 0 && (
              <div className="flex justify-between text-sm text-gray-500">
                <span>Discount</span>
                <span>-GHS {Number(order.discountAmount).toFixed(2)}</span>
              </div>
            )}
            {order.taxAmount > 0 && (
              <div className="flex justify-between text-sm text-gray-500">
                <span>Tax</span>
                <span>GHS {Number(order.taxAmount).toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-lg font-bold text-gray-900 border-t pt-2">
              <span>Total</span>
              <span>GHS {Number(order.total).toFixed(2)}</span>
            </div>
            <div className="text-center text-xs text-gray-500 mt-1">
              Paid via {paymentLabels[order.paymentMethod] || order.paymentMethod}
            </div>
          </div>

          <div className="text-center mt-4 text-xs text-gray-400">
            Thank you for visiting Kusum Beach!
          </div>
        </div>

        {/* Actions */}
        <div className="p-4 border-t grid grid-cols-3 gap-2">
          <button
            onClick={handlePrint}
            className="flex items-center justify-center gap-1 py-2 px-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium"
          >
            <FiPrinter size={14} /> Print
          </button>
          <button
            onClick={handleWhatsApp}
            className="flex items-center justify-center gap-1 py-2 px-3 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 text-sm font-medium"
          >
            WhatsApp
          </button>
          <button
            onClick={onClose}
            className="flex items-center justify-center gap-1 py-2 px-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
          >
            <FiX size={14} /> Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReceiptModal;
