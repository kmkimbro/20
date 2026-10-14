export const SAMPLES = [
  {
    id: 'bulkhead',
    title: 'Bulkhead Assembly, Vertical Arm',
    file: 'Bulkhead Assembly, Vertical Arm, GEN5 WI.pdf',
    blurb: 'A process table with tools, a yellow CTQ column, and a photo on each step.',
    source: 'Work instruction table',
    references: [
      '710-0146 Best Practice, Thread Sealed Application',
      '710-0314 Threadlocker selection guidelines',
      '710-0313 Best Practice, Threadlocker application',
    ],
    steps: [
      {
        id: 'label',
        n: '1',
        title: 'Label the mounting plate',
        action: 'Add labels to 460-0770 Mounting Plate, Bulkhead, Vertical Arm. Use the following text settings: 12mm label.',
        tools: ['Label maker'],
        ctq: true,
        figure: 'plate',
        marks: true,
        parts: [{ item: '1', pn: '460-0770', name: 'Mounting plate, bulkhead, vertical arm', qty: 1 }],
        caption: 'Mounting plate, with the label positions',
      },
      {
        id: 'fittings',
        n: '2',
        title: 'Preassemble the water fittings',
        note: 'Before installing the fittings, visually inspect the internal length for debris or contamination. If contamination is present, remove it before continuing.',
        action: 'Preassemble part of the water fittings before installing them onto the bulkhead shrouding. Install 436-0157 into 436-0156 using sealant tape, with the bigger surface facing the rubber sealing ring.',
        tools: ['7/16" wrench', '5/8" wrench'],
        ctq: true,
        figure: 'fittings',
        marks: true,
        parts: [
          { item: '2', pn: '436-0157', name: 'Water fitting', qty: 1 },
          { item: '3', pn: '436-0156', name: 'Water fitting', qty: 1 },
        ],
        caption: 'Preassembled water fittings',
      },
      {
        id: 'mount',
        n: '3',
        title: 'Mount the fittings on the shroud',
        action: 'Mount the previously assembled components onto 460-1097 shrouding using 415-0182 lock washer. Then mount 436-0040 and 436-0145 using 425-0008.',
        tools: ['14mm wrench', '22mm wrench'],
        ctq: true,
        figure: 'mounted',
        marks: true,
        parts: [
          { item: '4', pn: '460-1097', name: 'Shrouding', qty: 1 },
          { item: '5', pn: '415-0182', name: 'Lock washer', qty: 1 },
          { item: '6', pn: '436-0040', name: 'Fitting', qty: 1 },
          { item: '7', pn: '436-0145', name: 'Fitting', qty: 1 },
          { item: '8', pn: '425-0008', name: 'Fastener', qty: 1 },
        ],
        caption: 'Fittings mounted on the shroud',
      },
    ],
  },
  {
    id: 'drawing',
    title: 'Node assembly drawing',
    file: 'Node assembly drawing.pdf',
    blurb: 'Exploded views, numbered callouts, step notes, and a parts table.',
    source: 'Assembly drawing',
    references: [],
    parts: [
      ['12', '415-0018', 'Antenna, WiFi'],
      ['13', '310-0007', 'Antenna module, main'],
      ['14', '310-0008', 'Antenna module, aux'],
      ['2', '430-0004', 'Carrier, breakout'],
    ],
    steps: [
      {
        id: 'pads',
        n: '1',
        title: 'Place the thermal pads',
        action: 'Place thermal pads at the specified locations. Modules are keyed to prevent improper installation.',
        tools: [],
        figure: 'thermal',
        marks: true,
        caption: 'Thermal pad locations',
      },
      {
        id: 'cards',
        n: '2',
        title: 'Seat the cards',
        action: 'Align the node in the cards to the edge of the respective slots. Ensure the cards are in the correct orientation, then apply even pressure until the clips seat.',
        tools: [],
        figure: 'cards',
        marks: true,
        caption: 'Subassembly after step 2, top view',
      },
      {
        id: 'bottom',
        n: '3',
        title: 'Check the bottom view',
        action: 'Confirm the bottom view. Handle the contacts on the RAM with care, and apply force only where the clips are shown.',
        tools: [],
        figure: 'bottom',
        marks: true,
        caption: 'Bottom view of step 3',
      },
    ],
  },
  {
    id: 'led',
    title: 'LED assembly removal',
    file: 'LED assembly removal.pdf',
    blurb: 'A short instruction, a tool list, and a figure with the screws marked.',
    source: 'Instruction with a figure',
    references: [],
    steps: [
      {
        id: 'remove-led',
        n: '1.1',
        title: 'Remove the LED assembly',
        action: 'Remove the LED assembly on each side of the LS. The figure shows the two M36 mm screw locations on the starboard side.',
        tools: ['Metric hex-key set'],
        figure: 'led',
        marks: true,
        caption: 'Starboard LED mounting screws',
      },
    ],
  },
];

export function sampleForFile(name, fallback = 'bulkhead') {
  const file = (name || '').toLowerCase();
  if (/led|hex/.test(file)) return 'led';
  if (/draw|node|explod|frame|weld/.test(file)) return 'drawing';
  if (/bulk|vertical|wi\b|work/.test(file)) return 'bulkhead';
  return fallback;
}

export function buildDocument(sampleId, adjustments = {}) {
  const sample = SAMPLES.find((item) => item.id === sampleId) || SAMPLES[0];
  const pictures = adjustments.pictures !== false;
  const callouts = Boolean(adjustments.callouts);
  const showCtq = Boolean(adjustments.showCtq);
  let steps = sample.steps.map((step, index) => ({
    ...step,
    n: String(index + 1),
    figure: pictures ? step.figure : null,
    marks: Boolean(step.marks || callouts),
    parts: step.parts || [],
    ctq: showCtq && step.ctq,
  }));

  if (adjustments.splitNote) {
    const next = [];
    steps.forEach((step) => {
      if (!step.note) {
        next.push(step);
        return;
      }
      next.push({
        id: `${step.id}-inspect`,
        n: '',
        title: 'Inspect the fittings',
        action: step.note,
        tools: [],
        ctq: step.ctq,
        figure: null,
        caption: '',
      });
      next.push({ ...step, note: '' });
    });
    steps = next.map((step, index) => ({ ...step, n: String(index + 1) }));
  }

  const tools = [...new Set(steps.flatMap((step) => step.tools || []))];
  return {
    title: sample.title,
    source: sample.source,
    references: sample.references || [],
    parts: sample.parts || [],
    steps,
    tools,
    asTable: adjustments.table === false,
    toolsToolkit: Boolean(adjustments.toolsToolkit),
    showCtq,
    callouts,
    pictures,
  };
}

const FAKE_OPS = [
  {
    title: 'Place the frame',
    note: 'Place the weldment frame on the fixture and seat it against the datum pads.',
    parts: [
      { item: '1', pn: '460-0100', name: 'Weldment frame', qty: 1 },
      { item: '2', pn: '460-0104', name: 'Datum pad', qty: 4 },
    ],
    marks: [{ n: '1', x: '28%', y: '42%' }, { n: '2', x: '70%', y: '48%' }],
  },
  {
    title: 'Seat the base plate',
    note: 'Seat the base plate onto the frame. The locating pins set the orientation.',
    parts: [
      { item: '3', pn: '460-0112', name: 'Base plate', qty: 1 },
      { item: '4', pn: '415-0008', name: 'Locating pin', qty: 2 },
    ],
    marks: [{ n: '3', x: '36%', y: '40%' }, { n: '4', x: '62%', y: '55%' }],
  },
  {
    title: 'Install the standoffs',
    note: 'Install the standoffs with a washer under each head.',
    parts: [
      { item: '5', pn: '425-0016', name: 'Standoff', qty: 4 },
      { item: '6', pn: '415-0022', name: 'Washer', qty: 4 },
    ],
    marks: [{ n: '5', x: '32%', y: '36%' }],
  },
  {
    title: 'Mount the antenna module',
    note: 'Mount the antenna module to the standoffs with the M3 screws.',
    parts: [
      { item: '7', pn: '310-0007', name: 'Antenna module', qty: 1 },
      { item: '8', pn: '425-0003', name: 'M3 screw', qty: 4 },
    ],
    marks: [{ n: '7', x: '48%', y: '34%' }, { n: '8', x: '66%', y: '50%' }],
  },
  {
    title: 'Fasten the carrier',
    note: 'Fasten the carrier to the base plate with the M6×20 socket head cap screws.',
    parts: [
      { item: '9', pn: '430-0004', name: 'Carrier', qty: 1 },
      { item: '10', pn: '425-0020', name: 'M6×20 SHCS', qty: 4 },
    ],
    marks: [{ n: '9', x: '44%', y: '46%' }],
  },
  {
    title: 'Route the harness',
    note: 'Route the wire harness along the frame and clip it clear of the moving joints.',
    parts: [
      { item: '11', pn: '510-0012', name: 'Wire harness', qty: 1 },
      { item: '12', pn: '415-0030', name: 'Clip', qty: 3 },
    ],
    marks: [{ n: '11', x: '30%', y: '58%' }, { n: '12', x: '72%', y: '40%' }],
  },
  {
    title: 'Install the cover',
    note: 'Install the cover over the carrier. The gasket faces the base plate.',
    parts: [
      { item: '13', pn: '460-0140', name: 'Cover', qty: 1 },
      { item: '14', pn: '470-0002', name: 'Gasket', qty: 1 },
    ],
    marks: [{ n: '13', x: '50%', y: '38%' }],
  },
  {
    title: 'Torque the fasteners',
    note: 'Torque the cap screws to the specified value and apply threadlocker where called out.',
    parts: [
      { item: '10', pn: '425-0020', name: 'Cap screw', qty: 4 },
      { item: '15', pn: '490-0001', name: 'Threadlocker', qty: 1 },
    ],
    marks: [{ n: '10', x: '40%', y: '52%' }],
  },
  {
    title: 'Check datum contact',
    note: 'Confirm the frame is seated against every datum pad before releasing the fixture.',
    parts: [
      { item: '1', pn: '460-0100', name: 'Frame', qty: 1 },
      { item: '2', pn: '460-0104', name: 'Datum pad', qty: 4 },
    ],
    marks: [{ n: '2', x: '58%', y: '44%' }],
  },
];

export function planFromSample() {
  const planSteps = FAKE_OPS.map((step, index) => ({
    step: index + 1,
    title: step.title,
    note: step.note,
    image: `${index + 1}.1`,
    checked: true,
    parts: step.parts,
    marks: step.marks,
  }));
  return {
    planSteps,
    modelParts: [...new Set(FAKE_OPS.flatMap((step) => step.parts.map((part) => part.name)))],
  };
}

export function describeRead(doc) {
  const count = doc.steps.length;
  const noun = count === 1 ? 'operation' : 'operations';
  const bits = [`Read as ${count} ${noun} from ${doc.source.toLowerCase()}.`];
  if (doc.pictures) bits.push('Pictures stayed with their steps.');
  if (doc.asTable) bits.push('The page stayed a table.');
  if (doc.toolsToolkit) bits.push('Tools were pulled into the toolkit.');
  if (doc.callouts) bits.push('Callout numbers were kept.');
  if (doc.showCtq) bits.push('The CTQ column became a check on each step.');
  return bits.join(' ');
}

export function adjustmentsFromPrompt(text, current = {}) {
  const value = (text || '').toLowerCase();
  const next = { ...current };
  if (/split|own step|separate/.test(value) && /note|inspect|step 2/.test(value)) next.splitNote = true;
  else if (/split the note|note into/.test(value)) next.splitNote = true;
  if (/tool/.test(value)) next.toolsToolkit = true;
  if (/ctq|quality|yellow/.test(value)) next.showCtq = true;
  if (/callout|circle|marked|number/.test(value)) next.callouts = true;
  if (/picture|photo|figure|visual/.test(value)) next.pictures = true;
  if (/table|one page|keep the table/.test(value) && /don'?t|not|keep the table|as a table/.test(value)) next.table = false;
  if (/as steps|into steps|each step/.test(value)) next.table = true;
  next.note = (text || '').trim();
  return next;
}
