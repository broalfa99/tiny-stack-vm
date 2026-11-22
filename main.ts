// Tiny stack VM, make.fun ISA v1. Faithful port of reference vm.mjs.
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
const V = new Uint8Array(256), M = new Uint8Array(256), P = new Uint8Array(256), U = new Uint8Array(256);
for (const s of '0,0,0,0;1,1,0,1;2,4,0,1;3,0,1,0;4,0,1,2;5,0,2,2;6,0,2,3;7,0,3,3;16,0,2,1;17,0,2,1;18,0,2,1;19,0,2,1;20,0,2,1;21,0,2,1;22,0,2,1;23,0,1,1;24,0,2,1;25,0,2,1;26,0,2,1;27,0,1,1;28,0,2,1;29,0,2,1;30,0,2,1;32,0,2,1;33,0,2,1;34,0,2,1;48,2,0,0;49,2,1,0;50,2,1,0;51,2,0,0;52,0,0,0;64,0,1,1;65,0,2,0;80,0,1,0;81,0,1,0;82,0,0,1;83,0,1,0'.split(';')) { const a = s.split(','); V[a[0]] = 1; M[a[0]] = a[1]; P[a[0]] = a[2]; U[a[0]] = a[3]; }
const F = [(a, b) => (a + b) | 0, (a, b) => (a - b) | 0, Math.imul, (a, b) => a === -2147483648 && b === -1 ? a : (a / b) | 0, (a, b) => b === -1 ? 0 : (a % b) | 0, (a, b) => Math.floor((a >>> 0) / (b >>> 0)) | 0, (a, b) => ((a >>> 0) % (b >>> 0)) | 0, 0, (a, b) => a & b, (a, b) => a | b, (a, b) => a ^ b, 0, (a, b) => a << (b & 31), (a, b) => a >> (b & 31), (a, b) => (a >>> (b & 31)) | 0, 0, (a, b) => (a === b ? 1 : 0), (a, b) => (a < b ? 1 : 0), (a, b) => ((a >>> 0) < (b >>> 0) ? 1 : 0)];
function run(p, inp) {
  const n = p.length, D = new Int32Array(256);
  let sp = 0;
  const C = new Int32Array(64);
  let cp = 0;
  const Mm = new Int32Array(256), out = new Uint8Array(65536);
  let ol = 0, ip = 0, pc = 0, steps = 0;
  const done = c => ({ out: out.slice(0, ol), code: c });
  for (;;) {
    if (steps === 1000000) return done(10);
    if (pc < 0 || pc >= n) return done(9);
    const b = p[pc];
    if (!V[b]) return done(5);
    const imm = M[b];
    if (pc + imm >= n) return done(9);
    steps++;
    const nx = pc + 1 + imm;
    if (sp < P[b]) return done(2);
    if (sp - P[b] + U[b] > 256) return done(3);
    pc = nx;
    if (b === 0) return done(0);
    if (b === 1) { D[sp++] = (p[nx - 1] << 24) >> 24; continue; }
    if (b === 2) { D[sp++] = p[nx - 4] | (p[nx - 3] << 8) | (p[nx - 2] << 16) | (p[nx - 1] << 24); continue; }
    if (b === 3) { sp--; continue; }
    if (b === 4) { D[sp] = D[sp - 1]; sp++; continue; }
    if (b === 5) { const t = D[sp - 1]; D[sp - 1] = D[sp - 2]; D[sp - 2] = t; continue; }
    if (b === 6) { D[sp] = D[sp - 2]; sp++; continue; }
    if (b === 7) { const a = D[sp - 3]; D[sp - 3] = D[sp - 2]; D[sp - 2] = D[sp - 1]; D[sp - 1] = a; continue; }
    if (b === 23) { D[sp - 1] = -D[sp - 1] | 0; continue; }
    if (b === 27) { D[sp - 1] = ~D[sp - 1]; continue; }
    if (b > 15 && b < 35) {
      const y = D[sp - 1], x = D[sp - 2];
      if (y === 0 && b > 18 && b < 23) return done(4);
      sp -= 2;
      D[sp++] = F[b - 16](x, y);
      continue;
    }
    if (b === 48 || b === 49 || b === 50) {
      const rel = ((p[nx - 2] | (p[nx - 1] << 8)) << 16) >> 16;
      let take = true;
      if (b !== 48) { const v = D[--sp]; take = b === 49 ? v === 0 : v !== 0; }
      if (take) pc = nx + rel;
      continue;
    }
    if (b === 51) { if (cp === 64) return done(7); C[cp++] = nx; pc = p[nx - 2] | (p[nx - 1] << 8); continue; }
    if (b === 52) { if (cp === 0) return done(8); pc = C[--cp]; continue; }
    if (b === 64) { const a = D[sp - 1]; if (a < 0 || a >= 256) return done(6); D[sp - 1] = Mm[a]; continue; }
    if (b === 65) { const a = D[sp - 1], v = D[sp - 2]; if (a < 0 || a >= 256) return done(6); sp -= 2; Mm[a] = v; continue; }
    if (b === 80) {
      const s = String(D[sp - 1]);
      if (ol + s.length > 65536) return done(11);
      sp--;
      for (let k = 0; k < s.length; k++) out[ol++] = s.charCodeAt(k);
      continue;
    }
    if (b === 81) { if (ol + 1 > 65536) return done(11); out[ol++] = D[--sp] & 255; continue; }
    if (b === 82) { D[sp++] = ip < inp.length ? inp[ip++] : -1; continue; }
    return done(D[--sp] & 255);
  }
}
const I = process.env.MAKEFUN_INPUT_DIR ?? '/input';
const O = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
for (const id of readdirSync(I).sort()) {
  const r = run(new Uint8Array(readFileSync(I + '/' + id + '/program.bin')), new Uint8Array(readFileSync(I + '/' + id + '/input.bin')));
  mkdirSync(O + '/' + id, { recursive: true });
  writeFileSync(O + '/' + id + '/stdout.bin', r.out);
  writeFileSync(O + '/' + id + '/exit.txt', r.code + '\n');
}
