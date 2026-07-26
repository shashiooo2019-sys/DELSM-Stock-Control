const fs = require('fs');
let code = fs.readFileSync('app/page.tsx', 'utf8');

const targetStr = `                              <td className="p-4 text-right">
                                {po.status !== 'Received' && po.status !== 'Cancelled' ? (
                                  <button
                                    onClick={() => handleReceivePO(po)}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold font-sans text-[10px] px-3 py-1.5 rounded transition shadow-sm"
                                  >
                                    Accept Stock
                                  </button>
                                ) : (
                                  <span className="text-[11px] text-slate-400 font-sans">Fulfilled</span>
                                )}
                              </td>`;

const replaceStr = `                              <td className="p-4 text-right">
                                {po.status === 'Placed' && (
                                  <div className="flex justify-end gap-2">
                                    <button
                                      onClick={() => handlePOStateChange(po, 'Approved')}
                                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold font-sans text-[10px] px-3 py-1.5 rounded transition shadow-sm"
                                    >
                                      Approve
                                    </button>
                                    <button
                                      onClick={() => handlePOStateChange(po, 'Rejected')}
                                      className="bg-red-500 hover:bg-red-600 text-white font-bold font-sans text-[10px] px-3 py-1.5 rounded transition shadow-sm"
                                    >
                                      Reject
                                    </button>
                                  </div>
                                )}
                                {po.status === 'Approved' && (
                                  <div className="flex justify-end gap-2">
                                    <button
                                      onClick={() => handleReceivePO(po)}
                                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold font-sans text-[10px] px-3 py-1.5 rounded transition shadow-sm"
                                    >
                                      Accept Stock
                                    </button>
                                    <button
                                      onClick={() => handlePOStateChange(po, 'Not Received')}
                                      className="bg-slate-500 hover:bg-slate-600 text-white font-bold font-sans text-[10px] px-3 py-1.5 rounded transition shadow-sm"
                                    >
                                      Not Received
                                    </button>
                                  </div>
                                )}
                                {po.status !== 'Placed' && po.status !== 'Approved' && (
                                  <span className="text-[11px] text-slate-400 font-sans">{po.status}</span>
                                )}
                              </td>`;

code = code.replace(targetStr, replaceStr);

const targetHandler = `  const handleReceivePO = (po: PurchaseOrder) => {`;
const replaceHandler = `  const handlePOStateChange = (po: PurchaseOrder, newStatus: POStatus) => {
    updateDb({
      ...db,
      purchaseOrders: db.purchaseOrders.map(p => 
        p.po_number === po.po_number ? { ...p, status: newStatus } : p
      )
    });
    playBeep();
  };

  const handleReceivePO = (po: PurchaseOrder) => {`;

code = code.replace(targetHandler, replaceHandler);

fs.writeFileSync('app/page.tsx', code);
