// nodes/BDC6_HS_Actual.js
module.exports = function(RED) {
  const { toRaw, packBits } = require("../lib/bits.js");
  const SIGNALS = [{"message_name": "BDC6_HS_Actual", "signal_name": "BDC6_UHS_Actual", "can_id_hex": "0x351", "start_bit": 32, "bit_length": 16, "factor": "0.03125", "offset": "0", "unit": "V", "byte_order": "intel", "signed": 0, "min": "0", "max": "2047.96875", "default": "0", "category": "BDC6_HS", "multiplex": "Signal_Group_HS_Actual", "comment": "HS connection voltage report."}, {"message_name": "BDC6_HS_Actual", "signal_name": "BDC6_IHS_Actual", "can_id_hex": "0x351", "start_bit": 16, "bit_length": 16, "factor": "0.03125", "offset": "-1024", "unit": "A", "byte_order": "intel", "signed": 0, "min": "-1024", "max": "1023.96875", "default": "-1024", "category": "BDC6_HS", "multiplex": "Signal_Group_HS_Actual", "comment": "HS connection current report."}, {"message_name": "BDC6_HS_Actual", "signal_name": "BDC6_HS_CRC", "can_id_hex": "0x351", "start_bit": 0, "bit_length": 8, "factor": "1", "offset": "0", "unit": "", "byte_order": "intel", "signed": 0, "min": "0", "max": "255", "default": "0", "category": "BDC6_HS", "multiplex": "Signal_Group_HS_Actual", "comment": "End-to-end (FuSa) cyclic redundancy check for HS Actual message."}, {"message_name": "BDC6_HS_Actual", "signal_name": "BDC6_HS_AliveCounter", "can_id_hex": "0x351", "start_bit": 8, "bit_length": 4, "factor": "1", "offset": "0", "unit": "", "byte_order": "intel", "signed": 0, "min": "0", "max": "15", "default": "0", "category": "BDC6_HS", "multiplex": "Signal_Group_HS_Actual", "comment": "End-to-end (FuSa) alive counter for the HS Actual message."}, {"message_name": "BDC6_HS_Actual", "signal_name": "BDC6_FuSaWarning_HS_UVP", "can_id_hex": "0x351", "start_bit": 50, "bit_length": 1, "factor": "1", "offset": "0", "unit": "", "byte_order": "intel", "signed": 0, "min": "0", "max": "1", "default": "0", "category": "BDC6_HS", "multiplex": "Signal_Group_HS_Actual", "comment": "Functional Safety (FuSa) warning flag for HS undervoltage event."}, {"message_name": "BDC6_HS_Actual", "signal_name": "BDC6_FuSaError_OTP", "can_id_hex": "0x351", "start_bit": 52, "bit_length": 1, "factor": "1", "offset": "0", "unit": "", "byte_order": "intel", "signed": 0, "min": "0", "max": "1", "default": "0", "category": "BDC6_HS", "multiplex": "Signal_Group_HS_Actual", "comment": "Functional safety error flag for the overvoltage protection feature. A HIGH flag signals a detected overtemperature"}, {"message_name": "BDC6_HS_Actual", "signal_name": "BDC6_FuSaError_HVIL", "can_id_hex": "0x351", "start_bit": 51, "bit_length": 1, "factor": "1", "offset": "0", "unit": "", "byte_order": "intel", "signed": 0, "min": "0", "max": "1", "default": "0", "category": "BDC6_HS", "multiplex": "Signal_Group_HS_Actual", "comment": "Functional Safety (FuSa) error flag for HV interlock loop open."}, {"message_name": "BDC6_HS_Actual", "signal_name": "BDC6_FuSaError_HS_OVP", "can_id_hex": "0x351", "start_bit": 49, "bit_length": 1, "factor": "1", "offset": "0", "unit": "", "byte_order": "intel", "signed": 0, "min": "0", "max": "1", "default": "0", "category": "BDC6_HS", "multiplex": "Signal_Group_HS_Actual", "comment": "Functional Safety (FuSa) error flag for HS connection overvoltage protection."}, {"message_name": "BDC6_HS_Actual", "signal_name": "BDC6_FuSaError_HS_OCP", "can_id_hex": "0x351", "start_bit": 48, "bit_length": 1, "factor": "1", "offset": "0", "unit": "", "byte_order": "intel", "signed": 0, "min": "0", "max": "1", "default": "0", "category": "BDC6_HS", "multiplex": "Signal_Group_HS_Actual", "comment": "Functional Safety (FuSa) error flag for HS connection overcurrent protection."}];
  function Node(config) {
    RED.nodes.createNode(this, config);
    const node = this;
    const can_id_hex = "0x351";
    const message_name = "BDC6_HS_Actual";
    const map = new Map();
    for (const s of SIGNALS) map.set(s.signal_name, s);
    node.on("input", function(msg) {
      try {
        const payload = msg && msg.payload && typeof msg.payload === "object" ? msg.payload : {};
        let raw = 0n;
        for (const [k,v] of Object.entries(payload)) {
          if (!map.has(k)) continue;
          const s = map.get(k);
          const rawVal = toRaw(Number(v), Number(s.factor||1), Number(s.offset||0), !!s.signed,
                               (s.min!==""?Number(s.min):null), (s.max!==""?Number(s.max):null));
          const {mask, valueBits} = packBits(rawVal, Number(s.start_bit), Number(s.bit_length), String(s.byte_order||'intel'), !!s.signed);
          raw = (raw & (~mask)) | (valueBits & mask);
        }
        const out = {
          type: "BDC6_MESSAGE_UPDATE",
          message: message_name,
          can_id: Number(can_id_hex),
          raw_data_hex: "0x" + raw.toString(16),
          interval_ms: payload.interval_ms,
          cyclic: payload.cyclic,
          immediate: payload.immediate
        };
        node.send({ topic: message_name, payload: out });
      } catch(err) { node.error(err); }
    });
  }
  RED.nodes.registerType("BDC6_HS_Actual", Node, {
    category: "BDC6_HS",
    defaults: { name: { value: "BDC6_HS_Actual (CAN 0x351)" } },
    inputs:1, outputs:1, icon:"node-red/message.png", color:"#e8f0ff",
    paletteLabel: "BDC6_HS_Actual",
    label: function(){ return this.name || "BDC6_HS_Actual (CAN 0x351)"; }
  });
}
