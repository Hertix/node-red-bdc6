// nodes/BDC6_State_Request.js
module.exports = function(RED) {
  const { toRaw, packBits } = require("../lib/bits.js");
  const SIGNALS = [{"message_name": "BDC6_State_Request", "signal_name": "BDC6_Zmeas_Request", "can_id_hex": "0x308", "start_bit": 9, "bit_length": 1, "factor": "1", "offset": "0", "unit": "", "byte_order": "intel", "signed": 0, "min": "0", "max": "1", "default": "0", "category": "BDC6_State_Request", "multiplex": "-", "comment": "Status request for the FC impedance measurement. functionality."}, {"message_name": "BDC6_State_Request", "signal_name": "BDC6_Zmeas_F_Request", "can_id_hex": "0x308", "start_bit": 32, "bit_length": 14, "factor": "1", "offset": "0", "unit": "Hz", "byte_order": "intel", "signed": 0, "min": "0", "max": "16383", "default": "0", "category": "BDC6_State_Request", "multiplex": "-", "comment": "Impedance measurement injected current frequency request."}, {"message_name": "BDC6_State_Request", "signal_name": "BDC6_Zmeas_A_Request", "can_id_hex": "0x308", "start_bit": 48, "bit_length": 8, "factor": "1", "offset": "0", "unit": "A", "byte_order": "intel", "signed": 0, "min": "0", "max": "255", "default": "0", "category": "BDC6_State_Request", "multiplex": "-", "comment": "Impedance measurement injected current amplitude request."}, {"message_name": "BDC6_State_Request", "signal_name": "BDC6_Value_Request", "can_id_hex": "0x308", "start_bit": 16, "bit_length": 16, "factor": "0.03125", "offset": "-1024", "unit": "V or A", "byte_order": "intel", "signed": 0, "min": "-1024", "max": "1023.96875", "default": "0", "category": "BDC6_State_Request", "multiplex": "-", "comment": "Set point value request. Depending on control mode, it can be either a voltage or current value."}, {"message_name": "BDC6_State_Request", "signal_name": "BDC6_State_Request", "can_id_hex": "0x308", "start_bit": 0, "bit_length": 4, "factor": "1", "offset": "0", "unit": "", "byte_order": "intel", "signed": 0, "min": "0", "max": "15", "default": "0", "category": "BDC6_State_Request", "multiplex": "-", "comment": "System state request."}, {"message_name": "BDC6_State_Request", "signal_name": "BDC6_IMD_Request", "can_id_hex": "0x308", "start_bit": 8, "bit_length": 1, "factor": "1", "offset": "0", "unit": "", "byte_order": "intel", "signed": 0, "min": "0", "max": "1", "default": "0", "category": "BDC6_State_Request", "multiplex": "-", "comment": "Status request for the insulation monitoring device (IMD) functionality."}, {"message_name": "BDC6_State_Request", "signal_name": "BDC6_Control_Mode_Request", "can_id_hex": "0x308", "start_bit": 4, "bit_length": 3, "factor": "1", "offset": "0", "unit": "", "byte_order": "intel", "signed": 0, "min": "0", "max": "7", "default": "0", "category": "BDC6_State_Request", "multiplex": "-", "comment": "Main controller mode request."}, {"message_name": "BDC6_State_Request", "signal_name": "BDC6_ClrError_Request", "can_id_hex": "0x308", "start_bit": 7, "bit_length": 1, "factor": "1", "offset": "0", "unit": "", "byte_order": "intel", "signed": 0, "min": "0", "max": "1", "default": "0", "category": "BDC6_State_Request", "multiplex": "-", "comment": "Rising edge from 0 --> 1 will request a general clear error...."}];
  function Node(config) {
    RED.nodes.createNode(this, config);
    const node = this;
    const can_id_hex = "0x308";
    const message_name = "BDC6_State_Request";
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
  RED.nodes.registerType("BDC6_State_Request", Node, {
    category: "BDC6_State_Request",
    defaults: { name: { value: "BDC6_State_Request (CAN 0x308)" } },
    inputs:1, outputs:1, icon:"node-red/message.png", color:"#e8f0ff",
    paletteLabel: "BDC6_State_Request",
    label: function(){ return this.name || "BDC6_State_Request (CAN 0x308)"; }
  });
}
