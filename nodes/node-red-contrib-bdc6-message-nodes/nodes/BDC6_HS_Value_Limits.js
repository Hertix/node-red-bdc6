// nodes/BDC6_HS_Value_Limits.js
module.exports = function(RED) {
  const { toRaw, packBits } = require("../lib/bits.js");
  const SIGNALS = [{"message_name": "BDC6_HS_Value_Limits", "signal_name": "BDC6_UHS_Minimum", "can_id_hex": "0x338", "start_bit": 48, "bit_length": 16, "factor": "0.03125", "offset": "0", "unit": "V", "byte_order": "intel", "signed": 0, "min": "0", "max": "2047.96875", "default": "0", "category": "BDC6_HS", "multiplex": "-", "comment": "HS connection minimum voltage limiter request."}, {"message_name": "BDC6_HS_Value_Limits", "signal_name": "BDC6_UHS_Maximum", "can_id_hex": "0x338", "start_bit": 32, "bit_length": 16, "factor": "0.03125", "offset": "0", "unit": "V", "byte_order": "intel", "signed": 0, "min": "0", "max": "2047.96875", "default": "0", "category": "BDC6_HS", "multiplex": "-", "comment": "HS connection maximum voltage limiter request."}, {"message_name": "BDC6_HS_Value_Limits", "signal_name": "BDC6_IHS_Minimum", "can_id_hex": "0x338", "start_bit": 16, "bit_length": 16, "factor": "0.03125", "offset": "-1024", "unit": "A", "byte_order": "intel", "signed": 0, "min": "-1024", "max": "1023.96875", "default": "-1024", "category": "BDC6_HS", "multiplex": "-", "comment": "HS connection minimum current limiter request."}, {"message_name": "BDC6_HS_Value_Limits", "signal_name": "BDC6_IHS_Maximum", "can_id_hex": "0x338", "start_bit": 0, "bit_length": 16, "factor": "0.03125", "offset": "-1024", "unit": "A", "byte_order": "intel", "signed": 0, "min": "-1024", "max": "1023.96875", "default": "-1024", "category": "BDC6_HS", "multiplex": "-", "comment": "HS connection maximum current limiter request."}];
  function Node(config) {
    RED.nodes.createNode(this, config);
    const node = this;
    const can_id_hex = "0x338";
    const message_name = "BDC6_HS_Value_Limits";
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
  RED.nodes.registerType("BDC6_HS_Value_Limits", Node, {
    category: "BDC6_HS",
    defaults: { name: { value: "BDC6_HS_Value_Limits (CAN 0x338)" } },
    inputs:1, outputs:1, icon:"node-red/message.png", color:"#e8f0ff",
    paletteLabel: "BDC6_HS_Value_Limits",
    label: function(){ return this.name || "BDC6_HS_Value_Limits (CAN 0x338)"; }
  });
}
