
function cx(re, im = 0) { return { re, im }; }
function abs2(z) { return z.re * z.re + z.im * z.im; }
function pct(z) { return Math.round(abs2(z) * 100); }

function fmtC(z) {
    const eps = 1e-9;
    const r = Math.abs(z.re) < eps ? 0 : z.re;
    const im = Math.abs(z.im) < eps ? 0 : z.im;
    const f = v => {
        if (Math.abs(v) < eps) return null;
        if (Math.abs(Math.abs(v) - 1) < eps) return v < 0 ? '−1' : '1';
        if (Math.abs(Math.abs(v) - 1 / Math.SQRT2) < eps) return v < 0 ? '−1/√2' : '1/√2';
        return v.toFixed(2);
    };
    const rs = f(r), is = f(im);
    if (!rs && !is) return '0';
    if (!rs) return is + 'i';
    if (!is) return rs;
    return rs + (im > 0 ? '+' : '') + is + 'i';
}

const GATES = {
    X: {
        name: 'Pauli-X Gate (Quantum NOT)',
        matrix: [['0', '1'], ['1', '0']],
        apply: ([a, b]) => [b, a],
        info: '🔄 <strong>Pauli-X</strong> is the quantum NOT gate. It flips |0⟩ → |1⟩ and |1⟩ → |0⟩. It rotates the Bloch vector 180° around the X-axis.',
        blochAxis: 'X-axis (180° rotation)',
        classical: { desc: 'Direct equivalent: classical NOT gate', rows: [['0', '1'], ['1', '0']] }
    },
    Y: {
        name: 'Pauli-Y Gate',
        matrix: [['0', '−i'], ['i', '0']],
        apply: ([a, b]) => [cx(-b.im, b.re), cx(a.im, -a.re)],
        info: '🔁 <strong>Pauli-Y</strong> combines a bit-flip AND a phase-flip. No classical equivalent. Rotates the Bloch vector 180° around the Y-axis.',
        blochAxis: 'Y-axis (180° rotation)',
        classical: { desc: 'No classical analog (phase + bit flip)', rows: null }
    },
    Z: {
        name: 'Pauli-Z Gate (Phase Gate)',
        matrix: [['1', '0'], ['0', '−1']],
        apply: ([a, b]) => [a, cx(-b.re, -b.im)],
        info: '🌀 <strong>Pauli-Z</strong> leaves |0⟩ unchanged but maps |1⟩ → −|1⟩. This phase flip has no classical equivalent. Rotates the Bloch vector 180° around the Z-axis.',
        blochAxis: 'Z-axis (180° rotation)',
        classical: { desc: 'No classical equivalent (phase operation only)', rows: null }
    },
    H: {
        name: 'Hadamard Gate (Superposition)',
        matrix: [['1/√2', '1/√2'], ['1/√2', '−1/√2']],
        apply: ([a, b]) => [
            cx((a.re + b.re) / Math.SQRT2, (a.im + b.im) / Math.SQRT2),
            cx((a.re - b.re) / Math.SQRT2, (a.im - b.im) / Math.SQRT2)
        ],
        info: '✨ <strong>Hadamard</strong> creates superposition: |0⟩ → |+⟩ and |1⟩ → |−⟩. Applying H twice returns the original state. Key gate for quantum parallelism.',
        blochAxis: 'X+Z axis (180° rotation)',
        classical: { desc: 'No classical equivalent (creates quantum superposition!)', rows: null }
    }
};

const INPUTS = [
    [cx(1), cx(0)],
    [cx(0), cx(1)],
    [cx(1 / Math.SQRT2), cx(1 / Math.SQRT2)],
    [cx(1 / Math.SQRT2), cx(-1 / Math.SQRT2)]
];
const INPUT_LABELS = ['|0⟩', '|1⟩', '|+⟩', '|−⟩'];
const INPUT_IDS = ['in0', 'in1', 'inp', 'inm'];

let currentGate = 'X';
let currentInput = 0;
let logLines = [];

function switchTab(tabId) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.querySelector(`[data-tab="${tabId}"]`).classList.add('active');
    document.getElementById(tabId).classList.add('active');
}

function setInput(i) {
    currentInput = i;
    INPUT_IDS.forEach((id, j) => document.getElementById(id).classList.toggle('active', j === i));
    render();
}

function selectGate(g) {
    currentGate = g;
    ['X', 'Y', 'Z', 'H'].forEach(k => document.getElementById('g' + k).classList.toggle('active', k === g));
    render();
}

function getBlochVector(state) {
    const [a, b] = state;
    const p0 = abs2(a), p1 = abs2(b);
    const theta = 2 * Math.atan2(Math.sqrt(p1), Math.sqrt(p0));
    let phi = 0;
    if (p0 > 1e-9 && p1 > 1e-9) phi = Math.atan2(b.im, b.re) - Math.atan2(a.im, a.re);
    else if (p1 > 1e-9) phi = Math.atan2(b.im, b.re);
    return { x: Math.sin(theta) * Math.cos(phi), y: Math.sin(theta) * Math.sin(phi), z: Math.cos(theta) };
}

function drawSphere(ctx, cx_px, cy_px, r, state, label, color) {
    ctx.strokeStyle = 'rgba(100,140,255,0.12)'; ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.arc(cx_px, cy_px, r, 0, 2 * Math.PI); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(cx_px, cy_px, r, r * 0.28, 0, 0, 2 * Math.PI); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(cx_px, cy_px, r * 0.28, r, 0, 0, 2 * Math.PI); ctx.stroke();

    ctx.strokeStyle = 'rgba(100,140,255,0.25)'; ctx.lineWidth = 1; ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.moveTo(cx_px, cy_px - r - 12); ctx.lineTo(cx_px, cy_px + r + 8); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx_px - r - 12, cy_px); ctx.lineTo(cx_px + r + 8, cy_px); ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = '#8892a8'; ctx.font = '11px JetBrains Mono, monospace'; ctx.textAlign = 'center';
    ctx.fillText('|0⟩', cx_px, cy_px - r - 16); ctx.fillText('|1⟩', cx_px, cy_px + r + 18);
    ctx.fillStyle = '#555e74'; ctx.font = '10px JetBrains Mono, monospace';
    ctx.fillText('+X', cx_px + r + 18, cy_px + 4); ctx.fillText('+Y', cx_px - r - 14, cy_px + 4);

    const v = getBlochVector(state);
    const sx = cx_px + v.x * r, sy = cy_px - v.z * r + v.y * r * 0.18;

    ctx.shadowColor = color; ctx.shadowBlur = 12;
    ctx.strokeStyle = color; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(cx_px, cy_px); ctx.lineTo(sx, sy); ctx.stroke();
    ctx.shadowBlur = 0;

    const angle = Math.atan2(sy - cy_px, sx - cx_px);
    ctx.beginPath(); ctx.moveTo(sx, sy);
    ctx.lineTo(sx - 11 * Math.cos(angle - 0.38), sy - 11 * Math.sin(angle - 0.38));
    ctx.lineTo(sx - 11 * Math.cos(angle + 0.38), sy - 11 * Math.sin(angle + 0.38));
    ctx.closePath(); ctx.fillStyle = color; ctx.fill();

    ctx.beginPath(); ctx.arc(sx, sy, 5, 0, 2 * Math.PI);
    ctx.shadowColor = color; ctx.shadowBlur = 10; ctx.fillStyle = color; ctx.fill(); ctx.shadowBlur = 0;

    ctx.fillStyle = color; ctx.font = '500 12px Inter, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(label, cx_px, cy_px + r + 36);
}

function drawBloch(inputState, outputState) {
    const canvas = document.getElementById('bloch');
    const W = canvas.width, H = canvas.height;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, W, H);
    const r = 84;
    drawSphere(ctx, 175, H / 2, r, inputState, 'Input ' + INPUT_LABELS[currentInput], '#3b82f6');
    drawSphere(ctx, 520, H / 2, r, outputState, 'Output after ' + currentGate + ' gate', '#22c55e');

    ctx.strokeStyle = '#4a5568'; ctx.lineWidth = 1.5; ctx.setLineDash([5, 4]);
    ctx.beginPath(); ctx.moveTo(270, H / 2); ctx.lineTo(400, H / 2); ctx.stroke(); ctx.setLineDash([]);
    ctx.beginPath(); ctx.moveTo(400, H / 2); ctx.lineTo(390, H / 2 - 6); ctx.lineTo(390, H / 2 + 6);
    ctx.closePath(); ctx.fillStyle = '#4a5568'; ctx.fill();
    ctx.fillStyle = '#8892a8'; ctx.font = '600 13px Inter, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(currentGate + ' gate', 335, H / 2 - 12);
    ctx.font = '11px JetBrains Mono, monospace'; ctx.fillStyle = '#555e74';
    ctx.fillText(GATES[currentGate].blochAxis, 335, H / 2 + 8);
}

function fmtStateLabel(state) {
    const eps = 1e-6; const [a, b] = state;
    const p0 = abs2(a), p1 = abs2(b);
    if (p0 > 1 - eps) return '|0⟩';
    if (p1 > 1 - eps) return '|1⟩';
    if (Math.abs(p0 - 0.5) < 0.01 && Math.abs(p1 - 0.5) < 0.01) {
        if (b.re > 0 && Math.abs(b.im) < eps && a.re > 0) return '|+⟩  (superposition)';
        if (b.re < 0 && Math.abs(b.im) < eps && a.re > 0) return '|−⟩  (superposition)';
    }
    return fmtC(a) + '|0⟩ + ' + fmtC(b) + '|1⟩';
}

function render() {
    const gate = GATES[currentGate];
    const inState = INPUTS[currentInput];
    const outState = gate.apply(inState);

    const colors = ['#3b82f6', '#22c55e'];
    const bgcols = ['#3b82f615', '#22c55e15'];
    const names = ['|0⟩', '|1⟩'];
    document.getElementById('out-state').innerHTML = outState.map((amp, i) => {
        const p = pct(amp);
        return `<div class="amp-row">
          <span class="amp-label">${fmtC(amp)}  ${names[i]}</span>
          <div class="bar-wrap"><div class="bar-fill" style="width:${p}%;background:${bgcols[i]};border:1px solid ${colors[i]}40;color:${colors[i]}">${p > 10 ? p + '%' : ''}</div></div>
          <span class="amp-pct">${p}%</span></div>`;
    }).join('');

    document.getElementById('info-text').innerHTML = `<div class="info-box">${gate.info}</div>`;

    const m = gate.matrix;
    document.getElementById('matrix-display').innerHTML = `
      <div style="font-size:12px;color:#8892a8;margin-bottom:8px">${gate.name}</div>
      <div class="matrix-block"><span class="bracket">[</span>
        <div class="matrix-inner"><div class="m-cell">${m[0][0]}</div><div class="m-cell">${m[0][1]}</div><div class="m-cell">${m[1][0]}</div><div class="m-cell">${m[1][1]}</div></div>
        <span class="bracket">]</span></div>`;

    const cl = gate.classical;
    const classicalHTML = cl.rows
        ? cl.rows.map(([inp, out]) => `<div class="bit-row"><span class="bit-in">${inp}</span><span style="color:#4a5568">→</span><span class="bit-out" style="color:${colors[0]}">${out}</span></div>`).join('')
        : `<div style="font-size:12px;color:#8892a8;font-style:italic;line-height:1.6">${cl.desc}</div>`;
    document.getElementById('compare-grid').innerHTML = `
      <div class="compare-col"><div class="compare-title">Classical bit</div>${classicalHTML}</div>
      <div class="compare-vs">vs</div>
      <div class="compare-col"><div class="compare-title">Quantum qubit</div>
        <div class="bit-row"><span class="bit-in" style="font-size:12px">${INPUT_LABELS[currentInput]}</span><span style="color:#4a5568">→</span><span class="bit-out" style="color:${colors[1]};font-size:12px">${fmtStateLabel(outState)}</span></div>
        <div class="superposition-note">Qubit can exist in superposition of |0⟩ and |1⟩<br>until it is measured (collapses to one state)</div></div>`;

    drawBloch(inState, outState);

    const [a, b] = outState;
    logLines.push(`> ${INPUT_LABELS[currentInput]} — [${currentGate}] → α=${fmtC(a)} (P=${pct(a)}%)  β=${fmtC(b)} (P=${pct(b)}%)`);
    if (logLines.length > 20) logLines.shift();
    const logEl = document.getElementById('step-log');
    logEl.innerHTML = `<div class="log-title">> Quantum Terminal</div>` + logLines.map(l => `<div>${l}</div>`).join('');
    logEl.scrollTop = logEl.scrollHeight;
}

render();
