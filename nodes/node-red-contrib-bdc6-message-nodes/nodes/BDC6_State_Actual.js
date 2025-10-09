// nodes/BDC6_State_Actual.js
module.exports = function(RED) {
  const { toRaw, packBits } = require("../lib/bits.js");
  const SIGNALS = [{"message_name": "BDC6_State_Actual", "signal_name": "BDC6_Warning_Actual", "can_id_hex": "0x310", "start_bit": 17, "bit_length": 1, "factor": "1", "offset": "0", "unit": "", "byte_order": "intel", "signed": 0, "min": "0", "max": "1", "default": "0", "category": "BDC6*", "multiplex": "-", "comment": "Report if any warning is active in BDC6."}, {"message_name": "BDC6_State_Actual", "signal_name": "BDC6_U_Derating", "can_id_hex": "0x310", "start_bit": 18, "bit_length": 1, "factor": "1", "offset": "0", "unit": "", "byte_order": "intel", "signed": 0, "min": "0", "max": "1", "default": "0", "category": "BDC6*", "multiplex": "-", "comment": "Report if there is operation derating due to voltage condition, meaning that at steady-state either LS or HS voltage or the difference between the two is in derating region."}, {"message_name": "BDC6_State_Actual", "signal_name": "BDC6_T_Derating", "can_id_hex": "0x310", "start_bit": 19, "bit_length": 1, "factor": "1", "offset": "0", "unit": "", "byte_order": "intel", "signed": 0, "min": "0", "max": "1", "default": "0", "category": "BDC6*", "multiplex": "-", "comment": "Report if there is operation derating due to temperature condition, meaning that temperature is in derating region."}, {"message_name": "BDC6_State_Actual", "signal_name": "BDC6_State_Actual", "can_id_hex": "0x310", "start_bit": 0, "bit_length": 4, "factor": "1", "offset": "0", "unit": "", "byte_order": "intel", "signed": 0, "min": "0", "max": "15", "default": "15", "category": "BDC6*", "multiplex": "-", "comment": "Report of system actual state."}, {"message_name": "BDC6_State_Actual", "signal_name": "BDC6_limiter_ULS_min", "can_id_hex": "0x310", "start_bit": 10, "bit_length": 1, "factor": "1", "offset": "0", "unit": "", "byte_order": "intel", "signed": 0, "min": "0", "max": "1", "default": "0", "category": "BDC6*", "multiplex": "-", "comment": "Flag for ULS minimum limiter active due to voltage reaching the customer set limit."}, {"message_name": "BDC6_State_Actual", "signal_name": "BDC6_limiter_ULS_max", "can_id_hex": "0x310", "start_bit": 11, "bit_length": 1, "factor": "1", "offset": "0", "unit": "", "byte_order": "intel", "signed": 0, "min": "0", "max": "1", "default": "0", "category": "BDC6*", "multiplex": "-", "comment": "Flag for ULS maximum limiter active due to voltage reaching the customer set limit."}, {"message_name": "BDC6_State_Actual", "signal_name": "BDC6_limiter_UHS_min", "can_id_hex": "0x310", "start_bit": 14, "bit_length": 1, "factor": "1", "offset": "0", "unit": "", "byte_order": "intel", "signed": 0, "min": "0", "max": "1", "default": "0", "category": "BDC6*", "multiplex": "-", "comment": "Flag for UHS minimum limiter active due to voltage reaching the customer set limit."}, {"message_name": "BDC6_State_Actual", "signal_name": "BDC6_limiter_UHS_max", "can_id_hex": "0x310", "start_bit": 15, "bit_length": 1, "factor": "1", "offset": "0", "unit": "", "byte_order": "intel", "signed": 0, "min": "0", "max": "1", "default": "0", "category": "BDC6*", "multiplex": "-", "comment": "Flag for UHS maximum limiter active due to voltage reaching the customer set limit."}, {"message_name": "BDC6_State_Actual", "signal_name": "BDC6_limiter_ILS_min", "can_id_hex": "0x310", "start_bit": 8, "bit_length": 1, "factor": "1", "offset": "0", "unit": "", "byte_order": "intel", "signed": 0, "min": "0", "max": "1", "default": "0", "category": "BDC6*", "multiplex": "-", "comment": "Flag for ILS minimum limiter active due to current reaching the customer set limit."}, {"message_name": "BDC6_State_Actual", "signal_name": "BDC6_limiter_ILS_max", "can_id_hex": "0x310", "start_bit": 9, "bit_length": 1, "factor": "1", "offset": "0", "unit": "", "byte_order": "intel", "signed": 0, "min": "0", "max": "1", "default": "0", "category": "BDC6*", "multiplex": "-", "comment": "Flag for ILS maximum limiter active due to current reaching the customer set limit."}, {"message_name": "BDC6_State_Actual", "signal_name": "BDC6_limiter_IHS_min", "can_id_hex": "0x310", "start_bit": 12, "bit_length": 1, "factor": "1", "offset": "0", "unit": "", "byte_order": "intel", "signed": 0, "min": "0", "max": "1", "default": "0", "category": "BDC6*", "multiplex": "-", "comment": "Flag for IHS minimum limiter active due to current reaching the customer set limit."}, {"message_name": "BDC6_State_Actual", "signal_name": "BDC6_limiter_IHS_max", "can_id_hex": "0x310", "start_bit": 13, "bit_length": 1, "factor": "1", "offset": "0", "unit": "", "byte_order": "intel", "signed": 0, "min": "0", "max": "1", "default": "0", "category": "BDC6*", "multiplex": "-", "comment": "Flag for IHS maximum limiter active due to current reaching the customer set limit."}, {"message_name": "BDC6_State_Actual", "signal_name": "BDC6_Error_Actual", "can_id_hex": "0x310", "start_bit": 16, "bit_length": 1, "factor": "1", "offset": "0", "unit": "", "byte_order": "intel", "signed": 0, "min": "0", "max": "1", "default": "0", "category": "BDC6*", "multiplex": "-", "comment": "Report if any error is active in BDC6."}, {"message_name": "BDC6_State_Actual", "signal_name": "BDC6_Control_Mode_Actual", "can_id_hex": "0x310", "start_bit": 4, "bit_length": 3, "factor": "1", "offset": "0", "unit": "", "byte_order": "intel", "signed": 0, "min": "0", "max": "7", "default": "0", "category": "BDC6*", "multiplex": "-", "comment": "Main controller mode report."}, {"message_name": "BDC6_State_Actual", "signal_name": "BDC6_Capability_Actual", "can_id_hex": "0x310", "start_bit": 32, "bit_length": 16, "factor": "0.03125", "offset": "-1024", "unit": "A", "byte_order": "intel", "signed": 0, "min": "-1024", "max": "1023.96875", "default": "-1024", "category": "BDC6*", "multiplex": "-", "comment": "Report available capability relative to customer defined max LS current."}];
  function Node(config) {
    RED.nodes.createNode(this, config);
    const node = this;
    const can_id_hex = "0x310";
    const message_name = "BDC6_State_Actual";
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
  RED.nodes.registerType("BDC6_State_Actual", Node, {
    category: "BDC6*",
    defaults: { name: { value: "BDC6_State_Actual (CAN 0x310)" } },
    inputs:1, outputs:1, icon:"node-red/message.png", color:"#e8f0ff",
    paletteLabel: "BDC6_State_Actual",
    label: function(){ return this.name || "BDC6_State_Actual (CAN 0x310)"; }
  });
}
