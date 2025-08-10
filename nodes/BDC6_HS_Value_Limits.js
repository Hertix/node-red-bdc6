module.exports = function(RED) {
  function NodeImpl(config) {
    RED.nodes.createNode(this, config);
    const node = this;

    const intervalMs = parseInt(config.interval_ms || "0", 10) || 0;
    const cyclic = (config.cyclic === "true" || config.cyclic === true) ? 1 : 0;
    const immediate = (config.immediate === "true" || config.immediate === true) ? 1 : 0;
    const canId = 0x338; // BDC6_HS_Value_Limits

    function encodeIHS_Minimum(phys) {
      const factor = 0.03125;
      const offset = -1024.0;
      let raw = Math.round((parseFloat(phys) - offset) / factor);
      if (raw < 0) raw = 0;
      if (raw > 0xFFFF) raw = 0xFFFF;
      return raw & 0xFFFF;
    }

    node.on('input', (msg) => {
      const phys = (msg && msg.payload && msg.payload.BDC6_IHS_Minimum) ?? config.BDC6_IHS_Minimum ?? 0;
      const raw = encodeIHS_Minimum(phys);

      const buf = Buffer.alloc(8, 0x00);
      buf.writeUInt16LE(raw, 0); // little-endian, bits 0..15

      const shmPayload = {
        shm_name: "SM_BDC6_HS_Value_Limits",
        can_id: canId,
        interval_ms: intervalMs,
        cyclic: cyclic,
        immediate: immediate,
        raw_hex: buf.toString("hex")
      };

      node.status({fill:"green",shape:"dot",text:`raw=${raw} (phys=${phys})`});
      node.send({ payload: shmPayload });
    });
  }
  RED.nodes.registerType("BDC6_HS_Value_Limits", NodeImpl);
};
