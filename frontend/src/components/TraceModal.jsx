import React from 'react';
import { X, Code } from 'lucide-react';

export default function TraceModal({ isOpen, onClose, artifact, eventProgression }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#0F1720] border border-[#263746] rounded-xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-[#263746] flex items-center justify-between bg-[#141F2B]">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded bg-[#123A3A] border border-[#14B8A6]/40 text-[#14B8A6]">
              <Code className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#E6EDF3] font-mono">Trace Inspector: evt_val_8821</h3>
              <p className="text-[11px] text-[#A4B3C2]">Detailed execution frame and Pydantic schema validation failure trace</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-[#718396] hover:text-[#E6EDF3] hover:bg-[#192734] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs font-mono">
          {/* Schema Diff */}
          <div className="p-3 bg-[#101923] border border-[#1D2A36] rounded-lg">
            <div className="text-[11px] text-[#A4B3C2] mb-2 font-sans font-semibold uppercase tracking-wider">
              Schema Parameter Contract Mismatch
            </div>
            <div className="grid grid-cols-2 gap-3 text-[11px]">
              <div className="p-2.5 bg-[#141F2B] border border-[#FB7185]/40 rounded">
                <span className="text-[#FB7185] font-bold block mb-1">Payload Sent by Agent:</span>
                <span className="text-[#E6EDF3]">{"{ \"order_id\": \"ORD-9281\" }"}</span>
              </div>
              <div className="p-2.5 bg-[#141F2B] border border-[#14B8A6]/40 rounded">
                <span className="text-[#34D399] font-bold block mb-1">Target Tool Schema (v1.5.0):</span>
                <span className="text-[#E6EDF3]">{"parameters.required: [\"id\"]"}</span>
              </div>
            </div>
          </div>

          {/* Raw Trace Logs */}
          <div>
            <div className="text-[11px] text-[#A4B3C2] mb-2 font-sans font-semibold uppercase tracking-wider">
              Gateway Validation Call Stack
            </div>
            <div className="p-3.5 bg-[#101923] border border-[#1D2A36] rounded-lg text-[#A4B3C2] leading-relaxed text-[11px] whitespace-pre-wrap">
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
        <div className="px-5 py-3 border-t border-[#263746] bg-[#141F2B] flex items-center justify-between text-xs font-sans">
          <span className="text-[#A4B3C2]">Diagnosis: Unsynchronized prompt parameter rename</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-[#141F2B] hover:bg-[#192734] border border-[#263746] text-[#E6EDF3] rounded font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
