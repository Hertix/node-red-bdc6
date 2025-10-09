// nodes/BDC6_APPL_SWFW_IDENT.js
module.exports = function(RED) {
  const { toRaw, packBits } = require("../lib/bits.js");
  const SIGNALS = [{"message_name": "BDC6_APPL_SWFW_IDENT", "signal_name": "BDC6_Ident_Appl_Test", "can_id_hex": "0x1bda0001", "start_bit": 24, "bit_length": 8, "factor": "1", "offset": "0", "unit": "", "byte_order": "intel", "signed": 0, "min": "0", "max": "255", "default": "0", "category": "BDC6*", "multiplex": "-", "comment": ""}, {"message_name": "BDC6_APPL_SWFW_IDENT", "signal_name": "BDC6_Ident_Appl_Rev", "can_id_hex": "0x1bda0001", "start_bit": 32, "bit_length": 32, "factor": "1", "offset": "0", "unit": "", "byte_order": "intel", "signed": 0, "min": "0", "max": "4294967295", "default": "0", "category": "BDC6*", "multiplex": "-", "comment": ""}, {"message_name": "BDC6_APPL_SWFW_IDENT", "signal_name": "BDC6_Ident_Appl_Mid", "can_id_hex": "0x1bda0001", "start_bit": 8, "bit_length": 8, "factor": "1", "offset": "0", "unit": "", "byte_order": "intel", "signed": 0, "min": "0", "max": "255", "default": "0", "category": "BDC6*", "multiplex": "-", "comment": ""}, {"message_name": "BDC6_APPL_SWFW_IDENT", "signal_name": "BDC6_Ident_Appl_Lo", "can_id_hex": "0x1bda0001", "start_bit": 16, "bit_length": 8, "factor": "1", "offset": "0", "unit": "", "byte_order": "intel", "signed": 0, "min": "0", "max": "255", "default": "0", "category": "BDC6*", "multiplex": "-", "comment": ""}, {"message_name": "BDC6_APPL_SWFW_IDENT", "signal_name": "BDC6_Ident_Appl_Hi", "can_id_hex": "0x1bda0001", "start_bit": 0, "bit_length": 8, "factor": "1", "offset": "0", "unit": "", "byte_order": "intel", "signed": 0, "min": "0", "max": "255", "default": "0", "category": "BDC6*", "multiplex": "-", "comment": ""}];
  function Node(config) {
    RED.nodes.createNode(this, config);
    const node = this;
    const can_id_hex = "0x1bda0001";
    const message_name = "BDC6_APPL_SWFW_IDENT";
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
  RED.nodes.registerType("BDC6_APPL_SWFW_IDENT", Node, {
    category: "BDC6*",
    defaults: { name: { value: "BDC6_APPL_SWFW_IDENT (CAN 0x1bda0001)" } },
    inputs:1, outputs:1, icon:"node-red/message.png", color:"#e8f0ff",
    paletteLabel: "BDC6_APPL_SWFW_IDENT",
    label: function(){ return this.name || "BDC6_APPL_SWFW_IDENT (CAN 0x1bda0001)"; }
  });
}
