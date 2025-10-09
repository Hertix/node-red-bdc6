// nodes/BDC6_LS_Actual.js
module.exports = function(RED) {
  const { toRaw, packBits } = require("../lib/bits.js");
  const SIGNALS = [{"message_name": "BDC6_LS_Actual", "signal_name": "BDC6_ULS_Actual", "can_id_hex": "0x361", "start_bit": 32, "bit_length": 16, "factor": "0.03125", "offset": "0", "unit": "V", "byte_order": "intel", "signed": 0, "min": "0", "max": "2047.96875", "default": "0", "category": "BDC6_LS", "multiplex": "Signal_Group_LS_Actual", "comment": "LS connection voltage report."}, {"message_name": "BDC6_LS_Actual", "signal_name": "BDC6_LS_CRC", "can_id_hex": "0x361", "start_bit": 0, "bit_length": 8, "factor": "1", "offset": "0", "unit": "", "byte_order": "intel", "signed": 0, "min": "0", "max": "255", "default": "0", "category": "BDC6_LS", "multiplex": "Signal_Group_LS_Actual", "comment": "End-to-end (FuSa) cyclic redundancy check for LS Actual message."}, {"message_name": "BDC6_LS_Actual", "signal_name": "BDC6_LS_AliveCounter", "can_id_hex": "0x361", "start_bit": 8, "bit_length": 4, "factor": "1", "offset": "0", "unit": "", "byte_order": "intel", "signed": 0, "min": "0", "max": "15", "default": "0", "category": "BDC6_LS", "multiplex": "Signal_Group_LS_Actual", "comment": "End-to-end (FuSa) alive counter for LS Actual message."}, {"message_name": "BDC6_LS_Actual", "signal_name": "BDC6_ILS_Actual", "can_id_hex": "0x361", "start_bit": 16, "bit_length": 16, "factor": "0.03125", "offset": "-1024", "unit": "A", "byte_order": "intel", "signed": 0, "min": "-1024", "max": "1023.96875", "default": "-1024", "category": "BDC6_LS", "multiplex": "Signal_Group_LS_Actual", "comment": "LS connection current report."}, {"message_name": "BDC6_LS_Actual", "signal_name": "BDC6_FuSaError_LS_OVP", "can_id_hex": "0x361", "start_bit": 49, "bit_length": 1, "factor": "1", "offset": "0", "unit": "", "byte_order": "intel", "signed": 0, "min": "0", "max": "1", "default": "0", "category": "BDC6_LS", "multiplex": "Signal_Group_LS_Actual", "comment": "Functional Safety (FuSa) error flag for LS overvoltage protection."}, {"message_name": "BDC6_LS_Actual", "signal_name": "BDC6_FuSaError_LS_OCP", "can_id_hex": "0x361", "start_bit": 48, "bit_length": 1, "factor": "1", "offset": "0", "unit": "", "byte_order": "intel", "signed": 0, "min": "0", "max": "1", "default": "0", "category": "BDC6_LS", "multiplex": "Signal_Group_LS_Actual", "comment": "Functional Safety (FuSa) error flag for LS connection overcurrent protection."}];
  function Node(config) {
    RED.nodes.createNode(this, config);
    const node = this;
    const can_id_hex = "0x361";
    const message_name = "BDC6_LS_Actual";
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
  RED.nodes.registerType("BDC6_LS_Actual", Node, {
    category: "BDC6_LS",
    defaults: { name: { value: "BDC6_LS_Actual (CAN 0x361)" } },
    inputs:1, outputs:1, icon:"node-red/message.png", color:"#e8f0ff",
    paletteLabel: "BDC6_LS_Actual",
    label: function(){ return this.name || "BDC6_LS_Actual (CAN 0x361)"; }
  });
}
