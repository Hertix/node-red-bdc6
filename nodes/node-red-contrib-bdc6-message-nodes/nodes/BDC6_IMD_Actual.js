// nodes/BDC6_IMD_Actual.js
module.exports = function(RED) {
  const { toRaw, packBits } = require("../lib/bits.js");
  const SIGNALS = [{"message_name": "BDC6_IMD_Actual", "signal_name": "BDC6_Rinsulation", "can_id_hex": "0x390", "start_bit": 0, "bit_length": 16, "factor": "1", "offset": "0", "unit": "kOhm", "byte_order": "intel", "signed": 0, "min": "0", "max": "65535", "default": "0", "category": "BDC6*", "multiplex": "-", "comment": "Minimum insulation resistance value of the two measured potentials."}, {"message_name": "BDC6_IMD_Actual", "signal_name": "BDC6_IMD_Status", "can_id_hex": "0x390", "start_bit": 16, "bit_length": 2, "factor": "1", "offset": "0", "unit": "", "byte_order": "intel", "signed": 0, "min": "0", "max": "3", "default": "0", "category": "BDC6*", "multiplex": "-", "comment": "00 \ufffd Isolation status OK..."}, {"message_name": "BDC6_IMD_Actual", "signal_name": "BDC6_IMD_No_New_Estimated", "can_id_hex": "0x390", "start_bit": 22, "bit_length": 1, "factor": "1", "offset": "0", "unit": "", "byte_order": "intel", "signed": 0, "min": "0", "max": "1", "default": "0", "category": "BDC6*", "multiplex": "-", "comment": "0 \ufffd The flag is zero when new and unread isolation values have been calculated...."}, {"message_name": "BDC6_IMD_Actual", "signal_name": "BDC6_IMD_High_Uncertainty", "can_id_hex": "0x390", "start_bit": 21, "bit_length": 1, "factor": "1", "offset": "0", "unit": "", "byte_order": "intel", "signed": 0, "min": "0", "max": "1", "default": "0", "category": "BDC6*", "multiplex": "-", "comment": "0 \ufffd Uncertainty of calculated values is less than 5%..."}, {"message_name": "BDC6_IMD_Actual", "signal_name": "BDC6_IMD_Hardware_Error", "can_id_hex": "0x390", "start_bit": 23, "bit_length": 1, "factor": "1", "offset": "0", "unit": "", "byte_order": "intel", "signed": 0, "min": "0", "max": "1", "default": "0", "category": "BDC6*", "multiplex": "-", "comment": "0 \ufffd No hardware error..."}, {"message_name": "BDC6_IMD_Actual", "signal_name": "BDC6_IMD_CRC", "can_id_hex": "0x390", "start_bit": 56, "bit_length": 8, "factor": "1", "offset": "0", "unit": "", "byte_order": "intel", "signed": 0, "min": "0", "max": "255", "default": "0", "category": "BDC6*", "multiplex": "-", "comment": "End-to-end (FuSa) cyclic redundancy check for IMD Actual message."}, {"message_name": "BDC6_IMD_Actual", "signal_name": "BDC6_IMD_AliveCounter", "can_id_hex": "0x390", "start_bit": 48, "bit_length": 4, "factor": "1", "offset": "0", "unit": "", "byte_order": "intel", "signed": 0, "min": "0", "max": "15", "default": "0", "category": "BDC6*", "multiplex": "-", "comment": "End-to-end (FuSa) alive counter for IMD Actual message."}];
  function Node(config) {
    RED.nodes.createNode(this, config);
    const node = this;
    const can_id_hex = "0x390";
    const message_name = "BDC6_IMD_Actual";
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
  RED.nodes.registerType("BDC6_IMD_Actual", Node, {
    category: "BDC6*",
    defaults: { name: { value: "BDC6_IMD_Actual (CAN 0x390)" } },
    inputs:1, outputs:1, icon:"node-red/message.png", color:"#e8f0ff",
    paletteLabel: "BDC6_IMD_Actual",
    label: function(){ return this.name || "BDC6_IMD_Actual (CAN 0x390)"; }
  });
}
