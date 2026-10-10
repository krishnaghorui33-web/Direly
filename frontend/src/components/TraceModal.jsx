import React from 'react';
import { X, CheckCircle2, AlertTriangle, ArrowRight, Code } from 'lucide-react';

export default function TraceModal({ isOpen, onClose, artifact, eventProgression }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#0e1422] border border-[#22304c] rounded-xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-[#1c273e] flex items-center justify-between bg-[#121929]">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded bg-purple-950 border border-purple-500/40 text-purple-300">
              <Code className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white font-mono">Trace Inspector: evt_val_8821</h3>
              <p className="text-[11px] text-slate-400">Detailed execution frame and Pydantic schema validation failure trace</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-[#1c263c] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs font-mono">
          {/* Schema Diff */}
          <div className="p-3 bg-[#080b12] border border-[#1b2538] rounded-lg">
            <div className="text-[11px] text-slate-400 mb-2 font-sans font-semibold uppercase tracking-wider">
              Schema Parameter Contract Mismatch
            </div>
            <div className="grid grid-cols-2 gap-3 text-[11px]">
              <div className="p-2.5 bg-[#141018] border border-rose-900/40 rounded">
                <span className="text-rose-400 font-bold block mb-1">Payload Sent by Agent:</span>
                <span className="text-slate-200">{"{ \"order_id\": \"ORD-9281\" }"}</span>
              </div>
              <div className="p-2.5 bg-[#101918] border border-emerald-900/40 rounded">
                <span className="text-emerald-400 font-bold block mb-1">Target Tool Schema (v1.5.0):</span>
                <span className="text-slate-200">{"parameters.required: [\"id\"]"}</span>
              </div>
            </div>
          </div>

          {/* Raw Trace Logs */}
          <div>
            <div className="text-[11px] text-slate-400 mb-2 font-sans font-semibold uppercase tracking-wider">
              Gateway Validation Call Stack
            </div>
            <div className="p-3.5 bg-[#07090f] border border-[#1a2336] rounded-lg text-slate-300 leading-relaxed text-[11px] whitespace-pre-wrap">
{`[Trace ID: trc_8821_99f2]
timestamp: 2026-10-10T13:08:42.980Z
event: tool_gateway_dispatch
tool: get_order
validator: pydantic.v2.BaseModel.model_validate
error_class: pydantic_core._pydantic_core.ValidationError
message: 1 validation error for GetOrderInput
id
  Field required [type=missing, input_value={'order_id': 'ORD-9281'}, input_type=dict]
    For further information visit https://errors.pydantic.dev/2.6/v/missing
http_status: 422 Unprocessable Entity
dispatched_fallback: True`}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-[#1c273e] bg-[#101624] flex items-center justify-between text-xs font-sans">
          <span className="text-slate-400">Diagnosis: Unsynchronized prompt parameter rename</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-[#1e283d] hover:bg-[#283652] text-slate-200 rounded font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
