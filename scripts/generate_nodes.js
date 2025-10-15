// scripts/generate_nodes.js
// Usage: node scripts/generate_nodes.js ./signals.csv ./nodes
//
// Generates one Node-RED node per SIGNAL for these messages (writer-style):
//   - BDC6_State_Request   (0x308)
//   - BDC6_LS_Value_Limits (0x348)
//   - BDC6_HS_Value_Limits (0x338)
//
// CSV headers supported (case-insensitive):
// Message, Signal, StartBit, Length, Scale, Offset, Min, Max, Unit, Comment
// Optional: Signed (true/false), ByteOrder (intel|motorola)
//
// Each generated node outputs a payload shaped for the SHM Writer:
//
//   {
//     type: "BDC6_SIGNAL_UPDATE",
//     message: "<MSG>",
//     signal:  "<SIG>",
//     can_id:  <DEC>,
//     mask_hex: "0x...",
//     value_bits_hex: "0x...",
//     // packing info for writer:
//     unit, factor, offset, signed, start_bit, bit_length, byte_order,
//     // optionally (if provided by caller upstream):
//     value_phys: <Number>, value_bits: <UInt>,
//     interval_ms, cyclic, immediate
//   }
//
// Value handling:
// - If upstream sends payload:Number, payload:{value}, payload:{value_phys},
//   msg.signal_value, or msg.value_bits — the node forwards them as value_phys / value_bits.
// - The SHM Writer converts value_phys -> raw bits with factor/offset/signed/endianness.
//

const fs = require('fs');
const path = require('path');

const TARGET_MESSAGES = new Set([
  'BDC6_State_Request',
  'BDC6_LS_Value_Limits',
  'BDC6_HS_Value_Limits'
]);

// Map message -> CAN ID (decimal)
const CAN_IDS = {
  BDC6_State_Request:    0x308, // 776
  BDC6_LS_Value_Limits:  0x348, // 840
  BDC6_HS_Value_Limits:  0x338  // 824
};

function slugify(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
}

function readCSV(file) {
  const raw = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
  const lines = raw.split('\n').filter(l => l.trim().length);
  if (lines.length === 0) throw new Error('signals.csv is empty');

  const hdr = lines[0].split(',').map(h => h.trim());
  const idx = {};
  hdr.forEach((h,i) => idx[h.toLowerCase()] = i);

  function get(cols, name, def='') {
    const k = name.toLowerCase();
    if (!(k in idx)) return def;
    const v = cols[idx[k]] ?? '';
    return v.trim();
  }

  const rows = [];
  for (let i=1;i<lines.length;i++) {
    const cols = lines[i].split(',').map(c => c.trim());
    if (!cols.length || cols.every(c => c === '')) continue;

    const Message  = get(cols, 'Message');
    const Signal   = get(cols, 'Signal');
    if (!Message || !Signal) continue;

    rows.push({
      Message,
      Signal,
      StartBit: get(cols, 'StartBit'),
      Length:   get(cols, 'Length'),
      Scale:    get(cols, 'Scale',  '1'),
      Offset:   get(cols, 'Offset', '0'),
      Min:      get(cols, 'Min'),
      Max:      get(cols, 'Max'),
      Unit:     get(cols, 'Unit'),
      Comment:  get(cols, 'Comment'),
      Signed:   get(cols, 'Signed', 'false'),
      ByteOrder:get(cols, 'ByteOrder', 'intel')
    });
  }
  return rows;
}

function hexMask64(start, len) {
  const s = Number(start)|0, l = Number(len)|0;
  if (l <= 0) return '0x0';
  let mask = (1n << BigInt(l)) - 1n;
  mask = mask << BigInt(s);
  return '0x' + mask.toString(16);
}

// ---------------- Node file templates ----------------

function nodeJsTemplate({ nodeType, nodeName, message, signal, canId, start, length, scale, offset, unit, signed, byteOrder, comment }) {
  const maskHex = hexMask64(start, length);
  // Cheatsheet value_bits_hex: single-bit-at-start (not required by writer, kept for compatibility)
  const valueBitsHex = (() => {
    try {
      const vb = 1n << BigInt(start);
      return '0x' + vb.toString(16);
    } catch { return '0x0'; }
  })();

  return `module.exports = function(RED) {
  function ${nodeName}(config) {
    RED.nodes.createNode(this, config);
    const node = this;

    // static meta baked at codegen time:
    const META = {
      type: "BDC6_SIGNAL_UPDATE",
      message: ${JSON.stringify(message)},
      signal:  ${JSON.stringify(signal)},
      can_id:  ${Number(canId)},
      mask_hex: ${JSON.stringify(maskHex)},
      value_bits_hex: ${JSON.stringify(valueBitsHex)},
      unit: ${JSON.stringify(unit || '')},
      factor: ${Number(scale) || 1},
      offset: ${Number(offset) || 0},
      signed: ${String(signed).toLowerCase() === 'true'},
      start_bit: ${Number(start)|0},
      bit_length: ${Number(length)|0},
      byte_order: ${JSON.stringify((byteOrder || 'intel').toLowerCase())},
      meta: {}
    };

    node.on('input', function(msg, send, done) {
      try {
        const out = Object.assign({}, META);

        // Accept value (physical) or raw bits from multiple places
        const isObj = (v) => (v && typeof v === 'object' && !Buffer.isBuffer(v));
        const pIn = isObj(msg?.payload) ? msg.payload : {};
        const numPayload = (typeof msg?.payload === 'number') ? msg.payload : undefined;

        const vPhys =
          (pIn.value_phys !== undefined) ? pIn.value_phys :
          (pIn.value      !== undefined) ? pIn.value      :
          (numPayload     !== undefined) ? numPayload     :
          (msg.signal_value !== undefined) ? msg.signal_value :
          (msg.value        !== undefined) ? msg.value : undefined;

        const vBits =
          (pIn.value_bits !== undefined) ? pIn.value_bits :
          (msg.value_bits  !== undefined) ? msg.value_bits : undefined;

        if (vPhys !== undefined) out.value_phys = Number(vPhys);
        if (vBits !== undefined) out.value_bits = Number(vBits) >>> 0;

        // timing flags (payload overrides top-level)
        const interval = (pIn.interval_ms !== undefined) ? pIn.interval_ms : msg.interval_ms;
        const cyclic   = (pIn.cyclic      !== undefined) ? pIn.cyclic      : msg.cyclic;
        const immediate= (pIn.immediate   !== undefined) ? pIn.immediate   : msg.immediate;

        if (interval !== undefined)  out.interval_ms = Number(interval);
        if (cyclic   !== undefined)  out.cyclic      = !!cyclic;
        if (immediate!== undefined)  out.immediate   = !!immediate;

        msg.topic   = META.message + ":" + META.signal;
        msg.payload = out;

        node.status({fill:'green', shape:'dot',
          text: (out.value_phys !== undefined ? ('v=' + out.value_phys) : 'meta') + (out.interval_ms?(' @'+out.interval_ms+'ms'):'')
        });
        send(msg);
        done && done();
      } catch (err) {
        node.status({fill:'red', shape:'ring', text: 'error'});
        done && done(err);
      }
    });
  }
  RED.nodes.registerType("${nodeType}", ${nodeName});
};`;
}

function nodeHtmlTemplate({ nodeType, nodeLabel, message, signal, unit, comment }) {
  const niceDesc = comment ? ` (${comment})` : '';
  return `<!-- Auto-generated Node-RED UI for ${nodeType} -->
<script type="text/javascript">
  RED.nodes.registerType('${nodeType}', {
    category: 'BDC6',
    color: '#c4e1ff',
    defaults: {
      name: { value: '' }
    },
    inputs: 1,
    outputs: 1,
    icon: 'font-awesome/fa-sliders',
    label: function() { return this.name || '${nodeLabel}'; },
    paletteLabel: '${nodeLabel}',
    inputLabels: 'Number | { value, interval_ms?, cyclic?, immediate? }',
    outputLabels: 'BDC6_SIGNAL_UPDATE'
  });
</script>

<script type="text/html" data-template-name="${nodeType}">
  <div class="form-row">
    <label for="node-input-name"><i class="fa fa-tag"></i> Name</label>
    <input type="text" id="node-input-name" placeholder="${nodeLabel}">
  </div>
  <div class="form-tips">
    <b>Message:</b> ${message} &nbsp; <b>Signal:</b> ${signal}${unit ? ` &nbsp; <b>Unit:</b> ${unit}` : ''}${niceDesc}
    <br/>Input a number (physical) or an object like
    <code>{ value: 120, interval_ms: 10, cyclic: true, immediate: true }</code>.
  </div>
</script>

<script type="text/html" data-help-name="${nodeType}">
  <p>Emits a <code>BDC6_SIGNAL_UPDATE</code> payload for <code>${message}.${signal}</code>
     including CAN id and packing info. If a value is provided, it is passed as
     <code>value_phys</code> (physical units). The SHM Writer handles scaling/packing.</p>
  <p>Accepted inputs:
    <ul>
      <li><code>msg.payload = Number</code> (physical)</li>
      <li><code>msg.payload = { value, interval_ms?, cyclic?, immediate? }</code></li>
      <li><code>msg.signal_value</code> (physical), <code>msg.value_bits</code> (raw)</li>
    </ul>
  </p>
</script>`;
}

// ---------------- codegen main ----------------

function main() {
  const [,, csvPath, nodesDir] = process.argv;
  if (!csvPath || !nodesDir) {
    console.error('Usage: node scripts/generate_nodes.js <signals.csv> <nodesDir>');
    process.exit(1);
  }
  if (!fs.existsSync(csvPath)) {
    console.error('CSV not found:', csvPath);
    process.exit(2);
  }
  fs.mkdirSync(nodesDir, { recursive: true });

  const rows = readCSV(csvPath).filter(r => TARGET_MESSAGES.has(r.Message));
  if (rows.length === 0) {
    console.error('No matching rows for target messages.');
    process.exit(3);
  }

  let count = 0;
  for (const r of rows) {
    const message = r.Message.trim();
    const signal  = r.Signal.trim();
    if (!message || !signal) continue;

    const canId   = CAN_IDS[message];
    if (!canId) { console.warn('No CAN ID mapping for message:', message); continue; }

    const start   = Number(r.StartBit)||0;
    const length  = Number(r.Length)||1;
    const scale   = (r.Scale===''? '1': r.Scale);
    const offset  = (r.Offset===''? '0': r.Offset);
    const unit    = r.Unit || '';
    const signed  = (String(r.Signed||'false').toLowerCase());
    const byteOrder = (r.ByteOrder || 'intel');

    const base = `bdc6-${slugify(message)}-${slugify(signal)}`;
    const nodeType = base; // e.g. bdc6-bdc6-ls-value-limits-bdc6-uls-minimum
    const nodeName = base.replace(/-([a-z])/g, (_,c)=>c.toUpperCase()); // camel for ctor
    const nodeLabel= `${signal} (${message})`;

    const js = nodeJsTemplate({
      nodeType, nodeName, message, signal, canId,
      start, length, scale, offset, unit, signed, byteOrder, comment: r.Comment
    });
    const html = nodeHtmlTemplate({
      nodeType, nodeLabel, message, signal, unit, comment: r.Comment
    });

    fs.writeFileSync(path.join(nodesDir, `${base}.js`), js, 'utf8');
    fs.writeFileSync(path.join(nodesDir, `${base}.html`), html, 'utf8');
    count++;
  }

  // Emit a hint for package.json "nodes" mapping
  console.log(`Done. Generated ${count} nodes into ${nodesDir}`);
  console.log('\nAdd entries to package.json under "node-red": { "nodes": { ... } } like:');
  for (const r of rows.slice(0, Math.min(rows.length, 8))) {
    const base = `bdc6-${slugify(r.Message)}-${slugify(r.Signal)}`;
    console.log(`  "${base}": "nodes/${base}.js",`);
  }
}

if (require.main === module) main();
