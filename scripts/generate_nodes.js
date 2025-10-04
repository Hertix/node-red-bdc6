// scripts/generate_nodes.js
// Usage: node scripts/generate_nodes.js ./signals.csv ./nodes
// Generates one Node-RED node per signal for the messages:
//  - BDC6_State_Request
//  - BDC6_LS_Value_Limits
//  - BDC6_HS_Value_Limits
//
// Assumed CSV headers (order flexible, case-insensitive):
// Message, Signal, StartBit, Length, Scale, Offset, Min, Max, Unit, Comment
//
// The generated node expects msg.payload to be an object containing the decoded
// fields for the corresponding Message; it outputs the selected signal’s value
// after applying scale/offset, under msg.payload and sets msg.topic to <Message/Signal>.

const fs = require('fs');
const path = require('path');

const TARGET_MESSAGES = new Set([
  'BDC6_State_Request',
  'BDC6_LS_Value_Limits',
  'BDC6_HS_Value_Limits'
]);

const requiredHeaders = [
  'Message','Signal','StartBit','Length','Scale','Offset','Min','Max','Unit','Comment'
];

function slugify(s) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g,'-')
    .replace(/^-+|-+$/g,'');
}

function readCSV(file) {
  const raw = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
  const lines = raw.split('\n').filter(l => l.trim().length);
  if (lines.length === 0) throw new Error('signals.csv is empty');

  // header mapping (case-insensitive)
  const hdr = lines[0].split(',').map(h => h.trim());
  const map = {};
  hdr.forEach((h,i) => map[h.toLowerCase()] = i);

  // ensure required columns exist (but allow missing numeric meta like min/max/scale)
  const must = ['message','signal'];
  for (const h of must) {
    if (!(h in map)) throw new Error(`Missing required CSV column: ${h}`);
  }

  const rows = [];
  for (let i=1;i<lines.length;i++) {
    const cols = lines[i].split(',').map(c => c.trim());
    if (cols.length === 0 || cols.every(c => c === '')) continue;

    const get = (name) => {
      const idx = map[name.toLowerCase()];
      return (idx === undefined) ? '' : cols[idx] || '';
    };

    rows.push({
      Message: get('Message'),
      Signal: get('Signal'),
      StartBit: get('StartBit'),
      Length: get('Length'),
      Scale: get('Scale') || '1',
      Offset: get('Offset') || '0',
      Min: get('Min') || '',
      Max: get('Max') || '',
      Unit: get('Unit') || '',
      Comment: get('Comment') || ''
    });
  }
  return rows;
}

function nodeJsTemplate({ nodeType, nodeName, message, signal, scale, offset, unit, comment }) {
  // Node-RED runtime module (.js)
  return `module.exports = function(RED) {
  function ${nodeName}(config) {
    RED.nodes.createNode(this, config);
    const node = this;

    // static meta baked at codegen time:
    const MESSAGE = ${JSON.stringify(message)};
    const SIGNAL  = ${JSON.stringify(signal)};
    const SCALE   = ${Number(scale) || 1};
    const OFFSET  = ${Number(offset) || 0};
    const UNIT    = ${JSON.stringify(unit)};

    node.on('input', function(msg, send, done) {
      try {
        const src = (msg && msg.payload) || {};
        const frame = src[MESSAGE] || src; // allow either {Message:{...}} or flat
        let raw = frame[SIGNAL];

        if (raw === undefined) {
          node.status({fill:'red', shape:'dot', text:'missing '+MESSAGE+'.'+SIGNAL});
          return done && done(new Error('Missing signal '+MESSAGE+'.'+SIGNAL));
        }

        // numeric scale/offset if possible
        let val = raw;
        if (typeof raw === 'number') {
          val = raw * SCALE + OFFSET;
        } else if (!isNaN(Number(raw))) {
          val = Number(raw) * SCALE + OFFSET;
        }

        msg.payload = val;
        msg.topic = MESSAGE + '/' + SIGNAL;
        msg.unit = UNIT || undefined;
        node.status({fill:'green', shape:'dot', text:String(val) + (UNIT?(' '+UNIT):'')});
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
  // Node-RED editor UI (.html)
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
    icon: 'font-awesome/fa-tachometer',
    label: function() { return this.name || '${nodeLabel}'; },
    paletteLabel: '${nodeLabel}',
    inputLabels: 'BDC6 object or frame',
    outputLabels: '${signal} value'
  });
</script>

<script type="text/html" data-template-name="${nodeType}">
  <div class="form-row">
    <label for="node-input-name"><i class="fa fa-tag"></i> Name</label>
    <input type="text" id="node-input-name" placeholder="${nodeLabel}">
  </div>
  <div class="form-tips">
    <b>Message:</b> ${message} &nbsp; <b>Signal:</b> ${signal}${unit ? ` &nbsp; <b>Unit:</b> ${unit}` : ''}${niceDesc}
  </div>
</script>

<script type="text/html" data-help-name="${nodeType}">
  <p>Outputs the value of <code>${message}.${signal}</code> from <code>msg.payload</code>.
  If <code>msg.payload</code> already is the ${message} object, that works too.</p>
  <p>Value is scaled as <code>val = raw * scale + offset</code> per CSV.</p>
</script>`;
}

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

    const base = `bdc6-${slugify(message)}-${slugify(signal)}`;
    const nodeType = base;                // e.g., bdc6-bdc6-state-request-enable
    const nodeName = base.replace(/-([a-z])/g, (_,c)=>c.toUpperCase()); // camel for ctor
    const nodeLabel = `${signal} (${message})`;

    const js = nodeJsTemplate({
      nodeType, nodeName, message, signal,
      scale: r.Scale, offset: r.Offset,
      unit: r.Unit, comment: r.Comment
    });
    const html = nodeHtmlTemplate({
      nodeType, nodeLabel, message, signal,
      unit: r.Unit, comment: r.Comment
    });

    fs.writeFileSync(path.join(nodesDir, `${base}.js`), js, 'utf8');
    fs.writeFileSync(path.join(nodesDir, `${base}.html`), html, 'utf8');
    count++;
  }

  // Ensure package.json has the "nodes" map—emit a suggested snippet
  const pkgPath = path.resolve(process.cwd(), 'package.json');
  if (!fs.existsSync(pkgPath)) {
    console.warn('\nNOTE: No package.json found in repo root. Create one or add "nodes" mapping manually.\n');
  } else {
    console.log('\nGenerated files. Add these to package.json -> "node-red": { "nodes": { ... } }');
    console.log('Example:');
    console.log('  "node-red": { "nodes": {');
    for (const r of rows.slice(0, Math.min(rows.length, 5))) {
      const base = `bdc6-${slugify(r.Message)}-${slugify(r.Signal)}`;
      console.log(`    "${base}": "nodes/${base}.js",`);
    }
    console.log('    "...": "..."');
    console.log('  }}\n');
  }

  console.log(`Done. Generated ${count} nodes into ${nodesDir}`);
}

if (require.main === module) main();
