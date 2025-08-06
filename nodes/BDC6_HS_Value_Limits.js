const fs = require("fs");
const shm = require("node-shared-memory");

module.exports = function(RED) {
  function BDC6_HS_Value_Limits(config) {
    RED.nodes.createNode(this, config);
    const node = this;

    // CAN ID and Shared Memory definition
    const shm_name = "SM_BDC6_HS_Value_Limits";
    const shm_size = 16;
    const can_id = 0x338;

    let mem;
    try {
      mem = shm.create(shm_name, shm_size);
    } catch (e) {
      node.error("Shared memory error: " + e.message);
      return;
    }

    node.on("input", function(msg) {
      // physikalischen Wert (A) lesen
      const physical = parseFloat(config.ihs_minimum || msg.payload || 0);

      // Umrechnung physisch → raw (unsigned, factor 0.03125, offset -1024)
      const raw = Math.round((physical + 1024) / 0.03125);

      // 16-bit Little Endian Encoding
      const buffer = Buffer.alloc(shm_size);
      buffer.writeUInt16LE(raw, 0);           // BDC6_IHS_Minimum
      buffer.writeUInt32LE(can_id, 8);        // CAN ID
      buffer.writeUInt16LE(config.interval || 0, 12); // Interval
      buffer.writeUInt8(config.cyclic ? 1 : 0, 14);   // Cyclic
      buffer.writeUInt8(config.immediate ? 1 : 0, 15); // Immediate

      // Write to shared memory
      mem.write(0, buffer);

      node.status({ fill: "green", shape: "dot", text: `Sent: ${physical} A` });
    });
  }

  RED.nodes.registerType("BDC6_HS_Value_Limits", BDC6_HS_Value_Limits);
};
