// nodes/bdc6-bdc6-ls-value-limits-bdc6-uls-minimum.js
module.exports = function(RED) {
  function bdc6Bdc6LsValueLimitsBdc6UlsMinimum(config) {
    RED.nodes.createNode(this, config);
    const node = this;

    // Static meta for this signal (filled-in constants)
    const META = {
      type: "BDC6_SIGNAL_UPDATE",
      message: "BDC6_LS_Value_Limits",
      signal:  "BDC6_ULS_Minimum",
      can_id:  840, // 0x348
      // for compatibility/debug:
      mask_hex: "0xffff000000000000",
      value_bits_hex: "0x0001000000000000",
      // packing info used by your SHM Writer:
      unit: "V",
      factor: 0.03125,
      offset: 0,
      signed: false,
      start_bit: 48,
      bit_length: 16,
      byte_order: "intel",
      meta: {}
    };

    node.on("input", function (msg, send, done) {
      try {
        // Build outgoing payload
        const out = { ...META };

        // Accept value (physical) or raw bits from multiple locations
        const isObj = v => v && typeof v === "object" && !Buffer.isBuffer(v);
        const pIn   = isObj(msg.payload) ? msg.payload : {};
        const num   = (typeof msg.payload === "number") ? msg.payload : undefined;

        const vPhys =
          (pIn.value_phys !== undefined) ? pIn.value_phys :
          (pIn.value      !== undefined) ? pIn.value :
          (num            !== undefined) ? num :
          (msg.signal_value !== undefined) ? msg.signal_value :
          (msg.value        !== undefined) ? msg.value : undefined;

        const vBits =
          (pIn.value_bits !== undefined) ? pIn.value_bits :
          (msg.value_bits  !== undefined) ? msg.value_bits : undefined;

        if (vPhys !== undefined) out.value_phys = Number(vPhys);
        if (vBits !== undefined) out.value_bits = Number(vBits) >>> 0;

        // Optional timing flags (payload overrides top-level)
        const interval  = (pIn.interval_ms !== undefined) ? pIn.interval_ms : msg.interval_ms;
        const cyclic    = (pIn.cyclic      !== undefined) ? pIn.cyclic      : msg.cyclic;
        const immediate = (pIn.immediate   !== undefined) ? pIn.immediate   : msg.immediate;

        if (interval  !== undefined) out.interval_ms = Number(interval);
        if (cyclic    !== undefined) out.cyclic      = !!cyclic;
        if (immediate !== undefined) out.immediate   = !!immediate;

        msg.topic   = `${META.message}:${META.signal}`;
        msg.payload = out;

        node.status({
          fill: "green",
          shape: "dot",
          text: (out.value_phys !== undefined ? `v=${out.value_phys}` : "meta") +
                (out.interval_ms ? ` @${out.interval_ms}ms` : "")
        });

        send(msg);
        done && done();
      } catch (err) {
        node.status({ fill: "red", shape: "ring", text: "error" });
        done && done(err);
      }
    });
  }

  RED.nodes.registerType(
    "bdc6-bdc6-ls-value-limits-bdc6-uls-minimum",
    bdc6Bdc6LsValueLimitsBdc6UlsMinimum
  );
};
