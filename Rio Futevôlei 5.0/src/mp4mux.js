// 5.0 Teaser → MP4: monta um arquivo .mp4 padrão (H.264 + AAC) a partir dos pedaços que o próprio navegador
// codifica (WebCodecs). Sem biblioteca externa: escreve as caixas do formato MP4 (ftyp, mdat, moov) à mão.
//   video: { width, height, fps, avcC (Uint8Array), samples: [{ data, key }] }   — sem quadros B (perfil baseline)
//   audio: { sampleRate, channels, asc (Uint8Array), samples: [{ data }] }       — cada amostra AAC = 1024 sons
const enc = new TextEncoder();
function u32(n) { return [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255]; }
function u16(n) { return [(n >>> 8) & 255, n & 255]; }
function cat(parts) {
  let len = 0; for (const p of parts) len += p.length;
  const out = new Uint8Array(len); let o = 0;
  for (const p of parts) { out.set(p, o); o += p.length; }
  return out;
}
const bytes = a => (a instanceof Uint8Array ? a : new Uint8Array(a));
function box(type, ...parts) { const body = cat(parts.map(bytes)); return cat([new Uint8Array(u32(body.length + 8)), enc.encode(type), body]); }
function full(type, version, flags, ...parts) { return box(type, [version, (flags >> 16) & 255, (flags >> 8) & 255, flags & 255], ...parts); }
const MATRIX = [0x00010000, 0, 0, 0, 0x00010000, 0, 0, 0, 0x40000000].flatMap(u32);

function trak({ id, handler, timescale, duration, movieDuration, width = 0, height = 0, sampleEntry, sizes, keys, delta, chunkOffset, volume }) {
  const tkhd = full('tkhd', 0, 3, u32(0), u32(0), u32(id), u32(0), u32(movieDuration), u32(0), u32(0), u16(0), u16(0), u16(volume ? 0x0100 : 0), u16(0), MATRIX, u32(width << 16), u32(height << 16));
  const mdhd = full('mdhd', 0, 0, u32(0), u32(0), u32(timescale), u32(duration), u16(0x55c4), u16(0));
  const name = handler === 'vide' ? 'VideoHandler' : 'SoundHandler';
  const hdlr = full('hdlr', 0, 0, u32(0), enc.encode(handler), u32(0), u32(0), u32(0), enc.encode(name), [0]);
  const xmhd = handler === 'vide' ? full('vmhd', 0, 1, u16(0), u16(0), u16(0), u16(0)) : full('smhd', 0, 0, u16(0), u16(0));
  const dinf = box('dinf', full('dref', 0, 0, u32(1), full('url ', 0, 1)));
  const n = sizes.length;
  const stbl = box('stbl',
    full('stsd', 0, 0, u32(1), sampleEntry),
    full('stts', 0, 0, u32(1), u32(n), u32(delta)),
    ...(keys ? [full('stss', 0, 0, u32(keys.length), keys.flatMap(k => u32(k)))] : []),
    full('stsc', 0, 0, u32(1), u32(1), u32(n), u32(1)),
    full('stsz', 0, 0, u32(0), u32(n), sizes.flatMap(s => u32(s))),
    full('stco', 0, 0, u32(1), u32(chunkOffset)));
  return box('trak', tkhd, box('mdia', mdhd, hdlr, box('minf', xmhd, dinf, stbl)));
}

function avc1(width, height, avcC) {
  const compressor = new Uint8Array(32);
  return box('avc1', new Uint8Array(6), u16(1), new Uint8Array(16), u16(width), u16(height), u32(0x00480000), u32(0x00480000), u32(0), u16(1), compressor, u16(0x0018), u16(0xffff), box('avcC', avcC));
}
function desc(tag, body) { return cat([new Uint8Array([tag, body.length]), body]); }
function mp4a(sampleRate, channels, asc) {
  const dsi = desc(5, bytes(asc));
  const dcd = desc(4, cat([new Uint8Array([0x40, 0x15, 0, 0, 0]), new Uint8Array(u32(192000)), new Uint8Array(u32(192000)), dsi]));
  const es = desc(3, cat([new Uint8Array([0, 2, 0]), dcd, desc(6, new Uint8Array([2]))]));
  return box('mp4a', new Uint8Array(6), u16(1), new Uint8Array(8), u16(channels), u16(16), u16(0), u16(0), u32(sampleRate << 16), full('esds', 0, 0, es));
}

export function muxMP4({ video, audio }) {
  // "faststart": o índice (moov) vai antes dos dados (mdat), para o vídeo abrir na hora em apps e na internet
  const ftyp = box('ftyp', enc.encode('isom'), u32(512), enc.encode('isomiso2avc1mp41'));
  const vData = cat(video.samples.map(s => bytes(s.data)));
  const aData = audio ? cat(audio.samples.map(s => bytes(s.data))) : new Uint8Array(0);
  const vTs = video.fps * 1000, vDur = video.samples.length * 1000;
  const movieDur = Math.round((video.samples.length / video.fps) * 1000);
  const build = base => {
    const vOffset = base + 8, aOffset = vOffset + vData.length;
    const tracks = [trak({
      id: 1, handler: 'vide', timescale: vTs, duration: vDur, movieDuration: movieDur, width: video.width, height: video.height,
      sampleEntry: avc1(video.width, video.height, video.avcC), sizes: video.samples.map(s => s.data.byteLength),
      keys: video.samples.map((s, i) => (s.key ? i + 1 : 0)).filter(Boolean), delta: 1000, chunkOffset: vOffset,
    })];
    if (audio && audio.samples.length) tracks.push(trak({
      id: 2, handler: 'soun', timescale: audio.sampleRate, duration: audio.samples.length * 1024, movieDuration: movieDur, volume: true,
      sampleEntry: mp4a(audio.sampleRate, audio.channels, audio.asc), sizes: audio.samples.map(s => s.data.byteLength), delta: 1024, chunkOffset: aOffset,
    }));
    const mvhd = full('mvhd', 0, 0, u32(0), u32(0), u32(1000), u32(movieDur), u32(0x00010000), u16(0x0100), u16(0), u32(0), u32(0), MATRIX, new Uint8Array(24), u32(3));
    return box('moov', mvhd, ...tracks);
  };
  const moov = build(ftyp.length + build(0).length); // o tamanho do moov não depende dos endereços
  const mdatHead = cat([new Uint8Array(u32(8 + vData.length + aData.length)), enc.encode('mdat')]);
  return new Blob([ftyp, moov, mdatHead, vData, aData], { type: 'video/mp4' });
}
