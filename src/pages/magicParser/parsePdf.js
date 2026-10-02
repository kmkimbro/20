import {
  getDocument,
  GlobalWorkerOptions,
  ImageKind,
  OPS,
} from 'pdfjs-dist/legacy/build/pdf.mjs';
import workerUrl from 'pdfjs-dist/legacy/build/pdf.worker.min.mjs?url';
import { uid } from '../layoutBuilder/model.js';

GlobalWorkerOptions.workerSrc = workerUrl;

const MAX_PAGES = 20;
const MIN_IMAGE = 8;
const MAX_IMAGE_EDGE = 1600;

function multiply(ctm, m) {
  const [a1, b1, c1, d1, e1, f1] = ctm;
  const [a2, b2, c2, d2, e2, f2] = m;
  return [
    a1 * a2 + c1 * b2,
    b1 * a2 + d1 * b2,
    a1 * c2 + c1 * d2,
    b1 * c2 + d1 * d2,
    a1 * e2 + c1 * f2 + e1,
    b1 * e2 + d1 * f2 + f1,
  ];
}

function asMatrix(value) {
  if (!value || typeof value.length !== 'number' || value.length < 6) return null;
  const matrix = [value[0], value[1], value[2], value[3], value[4], value[5]].map(Number);
  if (matrix.some((n) => !Number.isFinite(n))) return null;
  return matrix;
}

function userQuadToViewport(ctm, viewport) {
  const corners = [];
  [0, 1].forEach((y) => {
    [0, 1].forEach((x) => {
      const ux = ctm[0] * x + ctm[2] * y + ctm[4];
      const uy = ctm[1] * x + ctm[3] * y + ctm[5];
      corners.push(viewport.convertToViewportPoint(ux, uy));
    });
  });
  const xs = corners.map((c) => c[0]);
  const ys = corners.map((c) => c[1]);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return {
    x,
    y,
    w: Math.max(...xs) - x,
    h: Math.max(...ys) - y,
  };
}

function readObj(store, id) {
  return new Promise((resolve) => {
    if (!store || id == null) {
      resolve(null);
      return;
    }
    try {
      if (store.has(id)) {
        resolve(store.get(id));
        return;
      }
    } catch {
      resolve(null);
      return;
    }
    let settled = false;
    const finish = (val) => {
      if (settled) return;
      settled = true;
      resolve(val || null);
    };
    const timer = setTimeout(() => finish(null), 500);
    try {
      store.get(id, (data) => {
        clearTimeout(timer);
        finish(data);
      });
    } catch {
      clearTimeout(timer);
      finish(null);
    }
  });
}

async function loadImageData(page, objId) {
  if (page.objs?.has?.(objId)) return page.objs.get(objId);
  if (page.commonObjs?.has?.(objId)) return page.commonObjs.get(objId);
  return (await readObj(page.objs, objId)) || (await readObj(page.commonObjs, objId));
}

function paintPixels(dest, src, width, height, kind) {
  const pixels = width * height;
  if (kind === ImageKind.RGBA_32BPP || src.length === pixels * 4) {
    dest.set(src.subarray ? src.subarray(0, dest.length) : src);
    return true;
  }
  if (kind === ImageKind.RGB_24BPP || src.length === pixels * 3) {
    for (let i = 0, j = 0; i < src.length; i += 3, j += 4) {
      dest[j] = src[i];
      dest[j + 1] = src[i + 1];
      dest[j + 2] = src[i + 2];
      dest[j + 3] = 255;
    }
    return true;
  }
  if (src.length === pixels) {
    for (let i = 0; i < pixels; i += 1) {
      const j = i * 4;
      dest[j] = src[i];
      dest[j + 1] = src[i];
      dest[j + 2] = src[i];
      dest[j + 3] = 255;
    }
    return true;
  }
  return false;
}

function rasterImageData(img) {
  if (!img) return null;
  const width = img.width || img.bitmap?.width;
  const height = img.height || img.bitmap?.height;
  if (!width || !height) return null;

  const scale = Math.min(1, MAX_IMAGE_EDGE / Math.max(width, height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));
  const ctx = canvas.getContext('2d');

  if (img.bitmap) {
    ctx.drawImage(img.bitmap, 0, 0, canvas.width, canvas.height);
  } else if (img.data) {
    const full = document.createElement('canvas');
    full.width = width;
    full.height = height;
    const fullCtx = full.getContext('2d');
    const imageData = fullCtx.createImageData(width, height);
    if (!paintPixels(imageData.data, img.data, width, height, img.kind)) return null;
    fullCtx.putImageData(imageData, 0, 0);
    ctx.drawImage(full, 0, 0, canvas.width, canvas.height);
  } else if (typeof HTMLCanvasElement !== 'undefined' && img instanceof HTMLCanvasElement) {
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  } else {
    return null;
  }

  const large = canvas.width * canvas.height > 40000;
  return large ? canvas.toDataURL('image/jpeg', 0.86) : canvas.toDataURL('image/png');
}

async function imageToUrl(page, fn, args, cache) {
  if (fn === OPS.paintInlineImageXObject && args[0] && typeof args[0] === 'object') {
    return rasterImageData(args[0]);
  }
  const objId = args[0];
  if (cache.has(objId)) return cache.get(objId);
  const data = await loadImageData(page, objId);
  const url = rasterImageData(data);
  cache.set(objId, url);
  return url;
}

async function extractImages(page, viewport) {
  const opList = await page.getOperatorList();
  const stack = [];
  let ctm = [1, 0, 0, 1, 0, 0];
  const found = [];

  const place = (matrix) => {
    const box = userQuadToViewport(matrix, viewport);
    if (box.w < MIN_IMAGE || box.h < MIN_IMAGE) return;
    if (box.x + box.w < 0 || box.y + box.h < 0) return;
    if (box.x > viewport.width || box.y > viewport.height) return;
    found.push(box);
  };

  const placeRepeat = (base, scaleX, skewX, skewY, scaleY, positions) => {
    if (!positions || typeof positions.length !== 'number') return;
    const sx = Number(scaleX);
    const sy = Number(scaleY);
    if (!Number.isFinite(sx) || !Number.isFinite(sy)) return;
    const kx = Number(skewX) || 0;
    const ky = Number(skewY) || 0;
    for (let p = 0; p < positions.length; p += 2) {
      place(multiply(base, [sx, kx, ky, sy, positions[p], positions[p + 1]]));
    }
  };

  for (let i = 0; i < opList.fnArray.length; i += 1) {
    const fn = opList.fnArray[i];
    const args = opList.argsArray[i] || [];
    if (fn === OPS.save || fn === OPS.beginGroup || fn === OPS.beginAnnotation) {
      stack.push(ctm.slice());
    } else if (
      fn === OPS.restore
      || fn === OPS.endGroup
      || fn === OPS.endAnnotation
      || fn === OPS.paintFormXObjectEnd
    ) {
      ctm = stack.pop() || [1, 0, 0, 1, 0, 0];
    } else if (fn === OPS.transform) {
      const matrix = asMatrix(args) || asMatrix(args[0]);
      if (matrix) ctm = multiply(ctm, matrix);
    } else if (fn === OPS.paintFormXObjectBegin) {
      stack.push(ctm.slice());
      const matrix = asMatrix(args[0]);
      if (matrix) ctm = multiply(ctm, matrix);
    } else if (
      fn === OPS.paintImageXObject
      || fn === OPS.paintInlineImageXObject
      || fn === OPS.paintImageMaskXObject
    ) {
      place(ctm);
    } else if (fn === OPS.paintImageXObjectRepeat) {
      const [, scaleX, scaleY, positions] = args;
      placeRepeat(ctm, scaleX, 0, 0, scaleY, positions);
    } else if (fn === OPS.paintImageMaskXObjectRepeat) {
      const [, scaleX, skewX, skewY, scaleY, positions] = args;
      placeRepeat(ctm, scaleX, skewX, skewY, scaleY, positions);
    } else if (fn === OPS.paintInlineImageXObjectGroup || fn === OPS.paintImageMaskXObjectGroup) {
      const group = args[args.length - 1];
      if (!group || typeof group.length !== 'number') continue;
      for (let g = 0; g < group.length; g += 1) {
        const matrix = asMatrix(group[g]?.transform);
        if (matrix) place(multiply(ctm, matrix));
      }
    }
  }

  return found;
}

function groupGlyphs(glyphs) {
  const lines = [];
  [...glyphs].sort((a, b) => a.y - b.y || a.x - b.x).forEach((glyph) => {
    const line = [...lines].reverse().find((candidate) => {
      if (Math.abs(candidate.y - glyph.y) > Math.max(2, glyph.fontSize * 0.45)) return false;
      const right = Math.max(...candidate.glyphs.map((g) => g.x + g.w));
      const left = Math.min(...candidate.glyphs.map((g) => g.x));
      const gap = Math.min(Math.abs(glyph.x - right), Math.abs(left - (glyph.x + glyph.w)));
      return gap < glyph.fontSize * 2.2;
    });
    if (line) {
      line.glyphs.push(glyph);
      line.y = (line.y + glyph.y) / 2;
    } else {
      lines.push({ y: glyph.y, glyphs: [glyph] });
    }
  });

  const lineBoxes = lines.map((line) => {
    const glyphsOnLine = line.glyphs.sort((a, b) => a.x - b.x);
    let text = '';
    let columns = 1;
    glyphsOnLine.forEach((glyph, index) => {
      if (index > 0) {
        const prev = glyphsOnLine[index - 1];
        const gap = glyph.x - (prev.x + prev.w);
        if (gap > glyph.fontSize * 1.5) {
          text += '  ';
          columns += 1;
        } else if (gap > Math.max(2, glyph.fontSize * 0.22)) text += ' ';
      }
      text += glyph.str;
    });
    const x = Math.min(...glyphsOnLine.map((g) => g.x));
    const y = Math.min(...glyphsOnLine.map((g) => g.y));
    const right = Math.max(...glyphsOnLine.map((g) => g.x + g.w));
    const bottom = Math.max(...glyphsOnLine.map((g) => g.y + g.h));
    const fontSize = Math.max(...glyphsOnLine.map((g) => g.fontSize));
    return {
      text: text.replace(/\s+/g, ' ').trim(),
      x,
      y,
      w: Math.max(right - x, fontSize),
      h: Math.max(bottom - y, fontSize),
      fontSize,
      columns,
    };
  }).filter((line) => line.text);

  const blocks = [];
  lineBoxes.sort((a, b) => a.y - b.y).forEach((line) => {
    const prev = blocks[blocks.length - 1];
    const overlap = prev
      ? Math.min(prev.x + prev.w, line.x + line.w) - Math.max(prev.x, line.x)
      : 0;
    const gap = prev ? line.y - (prev.y + prev.h) : Infinity;
    const minW = prev ? Math.min(prev.w, line.w) : 0;
    if (prev && gap < line.fontSize * 0.9 && overlap > minW * 0.35) {
      prev.lines.push(line.text);
      prev.lineCount += 1;
      if (line.columns >= 2) prev.columnLines += 1;
      const nextX = Math.min(prev.x, line.x);
      const nextRight = Math.max(prev.x + prev.w, line.x + line.w);
      prev.x = nextX;
      prev.w = nextRight - nextX;
      prev.h = (line.y + line.h) - prev.y;
      prev.fontSize = Math.max(prev.fontSize, line.fontSize);
      return;
    }
    blocks.push({
      ...line,
      lines: [line.text],
      lineCount: 1,
      columnLines: line.columns >= 2 ? 1 : 0,
    });
  });

  return blocks.map((block) => ({
    text: block.lines.join('\n'),
    x: block.x,
    y: block.y,
    w: block.w + 8,
    h: block.h + 4,
    fontSize: Math.max(8, Math.min(block.fontSize, 72)),
    kind: block.lineCount >= 2 && block.columnLines >= 2 ? 'table' : 'text',
  }));
}

async function extractTextBlocks(page, viewport) {
  const content = await page.getTextContent();
  const glyphs = [];
  content.items.forEach((item) => {
    if (!item || typeof item.str !== 'string' || !item.str.trim() || !item.transform) return;
    const [vx, baseline] = viewport.convertToViewportPoint(item.transform[4], item.transform[5]);
    const fontSize = Math.max(item.height || Math.hypot(item.transform[2], item.transform[3]) || 12, 1);
    glyphs.push({
      str: item.str,
      x: vx,
      y: baseline - fontSize,
      w: Math.max(item.width || fontSize, fontSize * 0.3),
      h: fontSize * 1.2,
      fontSize,
    });
  });
  return groupGlyphs(glyphs);
}

function dedupeImages(images) {
  const kept = [];
  images.forEach((img) => {
    const duplicate = kept.some((other) => (
      Math.abs(other.x - img.x) < 6
      && Math.abs(other.y - img.y) < 6
      && Math.abs(other.w - img.w) < 8
      && Math.abs(other.h - img.h) < 8
    ));
    if (!duplicate) kept.push(img);
  });
  return kept;
}

function fitOnPage(piece, pageW, pageH) {
  let { x, y, w, h } = piece;
  if (!(w > 0) || !(h > 0)) return piece;
  if (w > pageW) {
    h *= pageW / w;
    w = pageW;
  }
  if (h > pageH) {
    w *= pageH / h;
    h = pageH;
  }
  x = Math.min(Math.max(0, x), Math.max(0, pageW - w));
  y = Math.min(Math.max(0, y), Math.max(0, pageH - h));
  return { ...piece, x, y, w, h };
}

function pixelRegion(box, scale, canvas, pad = 2) {
  const x = Math.max(0, Math.floor(box.x * scale) - pad);
  const y = Math.max(0, Math.floor(box.y * scale) - pad);
  const right = Math.min(canvas.width, Math.ceil((box.x + box.w) * scale) + pad);
  const bottom = Math.min(canvas.height, Math.ceil((box.y + box.h) * scale) + pad);
  const w = right - x;
  const h = bottom - y;
  if (w < 2 || h < 2) return null;
  return { x, y, w, h };
}

function maskPaper(ctx, w, h) {
  const image = ctx.getImageData(0, 0, w, h);
  const data = image.data;
  const corners = [0, (w - 1) * 4, (h - 1) * w * 4, ((h - 1) * w + (w - 1)) * 4];
  const paper = [0, 0, 0];
  corners.forEach((index) => {
    paper[0] += data[index];
    paper[1] += data[index + 1];
    paper[2] += data[index + 2];
  });
  paper[0] /= corners.length;
  paper[1] /= corners.length;
  paper[2] /= corners.length;
  for (let i = 0; i < data.length; i += 4) {
    const dist = Math.abs(data[i] - paper[0]) + Math.abs(data[i + 1] - paper[1]) + Math.abs(data[i + 2] - paper[2]);
    if (dist < 42) data[i + 3] = 0;
  }
  ctx.putImageData(image, 0, 0);
}

function maskPaperEdges(ctx, w, h) {
  const image = ctx.getImageData(0, 0, w, h);
  const data = image.data;
  const corners = [0, (w - 1) * 4, (h - 1) * w * 4, ((h - 1) * w + (w - 1)) * 4];
  const paper = [0, 0, 0];
  corners.forEach((index) => {
    paper[0] += data[index];
    paper[1] += data[index + 1];
    paper[2] += data[index + 2];
  });
  paper[0] /= corners.length;
  paper[1] /= corners.length;
  paper[2] /= corners.length;
  const isPaper = (pixel) => (
    Math.abs(data[pixel] - paper[0])
    + Math.abs(data[pixel + 1] - paper[1])
    + Math.abs(data[pixel + 2] - paper[2])
  ) < 40;
  const seen = new Uint8Array(w * h);
  const stack = new Int32Array(w * h);
  let top = 0;
  const push = (x, y) => {
    if (x < 0 || y < 0 || x >= w || y >= h) return;
    const index = y * w + x;
    if (seen[index] || !isPaper(index * 4)) return;
    seen[index] = 1;
    stack[top] = index;
    top += 1;
  };
  for (let x = 0; x < w; x += 1) {
    push(x, 0);
    push(x, h - 1);
  }
  for (let y = 0; y < h; y += 1) {
    push(0, y);
    push(w - 1, y);
  }
  while (top) {
    top -= 1;
    const index = stack[top];
    data[index * 4 + 3] = 0;
    const x = index % w;
    const y = (index / w) | 0;
    push(x - 1, y);
    push(x + 1, y);
    push(x, y - 1);
    push(x, y + 1);
  }
  ctx.putImageData(image, 0, 0);
}

function dilateInk(ink, width, height, radius) {
  const horizontal = new Uint8Array(ink.length);
  const grown = new Uint8Array(ink.length);
  for (let y = 0; y < height; y += 1) {
    const row = y * width;
    for (let x = 0; x < width; x += 1) {
      if (!ink[row + x]) continue;
      const start = row + Math.max(0, x - radius);
      const end = row + Math.min(width - 1, x + radius);
      horizontal.fill(1, start, end + 1);
    }
  }
  for (let x = 0; x < width; x += 1) {
    for (let y = 0; y < height; y += 1) {
      if (!horizontal[y * width + x]) continue;
      const start = Math.max(0, y - radius);
      const end = Math.min(height - 1, y + radius);
      for (let yy = start; yy <= end; yy += 1) grown[yy * width + x] = 1;
    }
  }
  return grown;
}

function overlapsText(box, texts) {
  const area = box.w * box.h;
  if (!area) return false;
  return texts.some((text) => {
    const overlapW = Math.min(box.x + box.w, text.x + text.w) - Math.max(box.x, text.x);
    const overlapH = Math.min(box.y + box.h, text.y + text.h) - Math.max(box.y, text.y);
    const overlap = Math.max(0, overlapW) * Math.max(0, overlapH);
    return overlap / area > 0.55;
  });
}

function segmentFigures(canvas, renderScale, texts) {
  const { width, height } = canvas;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  const data = ctx.getImageData(0, 0, width, height).data;
  const corners = [0, (width - 1) * 4, (height - 1) * width * 4, ((height - 1) * width + (width - 1)) * 4];
  const paper = [0, 0, 0];
  corners.forEach((index) => {
    paper[0] += data[index];
    paper[1] += data[index + 1];
    paper[2] += data[index + 2];
  });
  paper[0] /= corners.length;
  paper[1] /= corners.length;
  paper[2] /= corners.length;

  const ink = new Uint8Array(width * height);
  for (let i = 0, pixel = 0; i < ink.length; i += 1, pixel += 4) {
    const dist = Math.abs(data[pixel] - paper[0]) + Math.abs(data[pixel + 1] - paper[1]) + Math.abs(data[pixel + 2] - paper[2]);
    if (dist > 46 && data[pixel + 3] > 16) ink[i] = 1;
  }
  const grown = dilateInk(ink, width, height, 4);
  const seen = new Uint8Array(grown.length);
  const stack = new Int32Array(grown.length);
  const boxes = [];

  for (let start = 0; start < grown.length; start += 1) {
    if (!grown[start] || seen[start]) continue;
    seen[start] = 1;
    stack[0] = start;
    let top = 1;
    let minX = width;
    let minY = height;
    let maxX = 0;
    let maxY = 0;
    let count = 0;
    while (top) {
      top -= 1;
      const index = stack[top];
      const x = index % width;
      const y = (index / width) | 0;
      count += 1;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
      if (x > 0) {
        const next = index - 1;
        if (grown[next] && !seen[next]) {
          seen[next] = 1;
          stack[top] = next;
          top += 1;
        }
      }
      if (x + 1 < width) {
        const next = index + 1;
        if (grown[next] && !seen[next]) {
          seen[next] = 1;
          stack[top] = next;
          top += 1;
        }
      }
      if (y > 0) {
        const next = index - width;
        if (grown[next] && !seen[next]) {
          seen[next] = 1;
          stack[top] = next;
          top += 1;
        }
      }
      if (y + 1 < height) {
        const next = index + width;
        if (grown[next] && !seen[next]) {
          seen[next] = 1;
          stack[top] = next;
          top += 1;
        }
      }
    }
    const boxW = maxX - minX + 1;
    const boxH = maxY - minY + 1;
    if (count < 800 || boxW < 32 || boxH < 32) continue;
    if (boxW >= width * 0.98 && boxH >= height * 0.98) continue;
    const box = {
      x: minX / renderScale,
      y: minY / renderScale,
      w: boxW / renderScale,
      h: boxH / renderScale,
    };
    if (!overlapsText(box, texts)) boxes.push(box);
  }

  return boxes
    .sort((a, b) => b.w * b.h - a.w * a.h)
    .slice(0, 40);
}

function cutPiece(source, box, scale, piece) {
  const clip = pixelRegion(box, scale, source, piece === 'text' ? 4 : 2);
  if (!clip) return null;
  const sprite = document.createElement('canvas');
  sprite.width = clip.w;
  sprite.height = clip.h;
  const ctx = sprite.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(source, clip.x, clip.y, clip.w, clip.h, 0, 0, clip.w, clip.h);
  if (piece === 'text') maskPaper(ctx, clip.w, clip.h);
  return {
    piece,
    clip,
    src: sprite.toDataURL('image/png'),
    x: clip.x / scale,
    y: clip.y / scale,
    w: clip.w / scale,
    h: clip.h / scale,
  };
}

function erasePiece(ctx, clip) {
  const sampleX = Math.max(0, Math.min(ctx.canvas.width - 1, clip.x > 3 ? clip.x - 3 : Math.min(ctx.canvas.width - 1, clip.x + clip.w + 3)));
  const sampleY = Math.max(0, Math.min(ctx.canvas.height - 1, clip.y > 3 ? clip.y - 3 : clip.y));
  const pixel = ctx.getImageData(sampleX, sampleY, 1, 1).data;
  ctx.fillStyle = `rgb(${pixel[0]}, ${pixel[1]}, ${pixel[2]})`;
  ctx.fillRect(clip.x, clip.y, clip.w, clip.h);
}

function installImageTracker(pageCanvas) {
  const proto = CanvasRenderingContext2D.prototype;
  const original = proto.drawImage;
  const recorded = new WeakMap();

  const listFor = (canvas) => {
    let boxes = recorded.get(canvas);
    if (!boxes) {
      boxes = [];
      recorded.set(canvas, boxes);
    }
    return boxes;
  };

  const destRect = (src, args) => {
    const sw0 = src.width || src.videoWidth || 0;
    const sh0 = src.height || src.videoHeight || 0;
    if (args.length >= 8) {
      return { sx: args[0], sy: args[1], sw: args[2], sh: args[3], dx: args[4], dy: args[5], dw: args[6], dh: args[7] };
    }
    if (args.length >= 4) {
      return { sx: 0, sy: 0, sw: sw0, sh: sh0, dx: args[0], dy: args[1], dw: args[2], dh: args[3] };
    }
    if (args.length >= 2) {
      return { sx: 0, sy: 0, sw: sw0, sh: sh0, dx: args[0], dy: args[1], dw: sw0, dh: sh0 };
    }
    return null;
  };

  const bounds = (transform, x, y, w, h) => {
    const pts = [
      [x, y],
      [x + w, y],
      [x, y + h],
      [x + w, y + h],
    ].map(([px, py]) => ({
      x: transform.a * px + transform.c * py + transform.e,
      y: transform.b * px + transform.d * py + transform.f,
    }));
    const xs = pts.map((p) => p.x);
    const ys = pts.map((p) => p.y);
    const left = Math.min(...xs);
    const top = Math.min(...ys);
    return { x: left, y: top, w: Math.max(...xs) - left, h: Math.max(...ys) - top };
  };

  const keep = (box, canvas, src) => {
    if (box.w < 8 || box.h < 8) return false;
    if (canvas !== pageCanvas) return true;
    const buffer = src && src.width && src.height
      && Math.abs(src.width - pageCanvas.width) <= 2
      && Math.abs(src.height - pageCanvas.height) <= 2;
    if (buffer && box.w >= pageCanvas.width * 0.98 && box.h >= pageCanvas.height * 0.98) return false;
    return true;
  };

  proto.drawImage = function patchedDraw(src, ...args) {
    try {
      const dest = src && destRect(src, args);
      const canvas = this.canvas;
      if (dest && canvas && src !== canvas && dest.sw > 0 && dest.sh > 0 && dest.dw > 0 && dest.dh > 0) {
        const transform = this.getTransform();
        const children = recorded.get(src);
        const boxes = listFor(canvas);
        if (boxes.length < 500) {
          if (children?.length) {
            const scaleX = dest.dw / dest.sw;
            const scaleY = dest.dh / dest.sh;
            children.forEach((child) => {
              const box = bounds(
                transform,
                dest.dx + (child.x - dest.sx) * scaleX,
                dest.dy + (child.y - dest.sy) * scaleY,
                child.w * Math.abs(scaleX),
                child.h * Math.abs(scaleY),
              );
              if (keep(box, canvas, src)) boxes.push(box);
            });
          } else {
            const box = bounds(transform, dest.dx, dest.dy, dest.dw, dest.dh);
            if (keep(box, canvas, src)) boxes.push(box);
          }
        }
      }
    } catch {
      // Tracking must not stop the page from painting.
    }
    return original.apply(this, arguments);
  };

  return {
    restore() {
      proto.drawImage = original;
    },
    boxes() {
      return recorded.get(pageCanvas) || [];
    },
  };
}

function dedupePainted(boxes) {
  const kept = [];
  [...boxes].sort((a, b) => a.w * a.h - b.w * b.h).forEach((box) => {
    const duplicate = kept.some((other) => {
      const overlapW = Math.min(other.x + other.w, box.x + box.w) - Math.max(other.x, box.x);
      const overlapH = Math.min(other.y + other.h, box.y + box.h) - Math.max(other.y, box.y);
      const overlap = Math.max(0, overlapW) * Math.max(0, overlapH);
      const union = other.w * other.h + box.w * box.h - overlap;
      return union > 0 && overlap / union > 0.6;
    });
    if (!duplicate) kept.push(box);
  });
  return kept.slice(0, 40);
}

async function renderPage(page, viewport) {
  const renderScale = Math.min(2, 1400 / Math.max(viewport.width, viewport.height));
  const renderViewport = page.getViewport({ scale: renderScale });
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.floor(renderViewport.width));
  canvas.height = Math.max(1, Math.floor(renderViewport.height));
  const canvasContext = canvas.getContext('2d', { willReadFrequently: true });
  canvasContext.fillStyle = '#ffffff';
  canvasContext.fillRect(0, 0, canvas.width, canvas.height);
  const tracker = installImageTracker(canvas);
  try {
    await page.render({ canvasContext, canvas, viewport: renderViewport }).promise;
  } finally {
    tracker.restore();
  }
  const images = dedupePainted(tracker.boxes()).map((box) => ({
    x: box.x / renderScale,
    y: box.y / renderScale,
    w: box.w / renderScale,
    h: box.h / renderScale,
  }));
  return { canvas, canvasContext, renderScale, images };
}

function regionKind(box, pageHeight, fallback) {
  const mid = box.y + box.h / 2;
  if (mid < pageHeight * 0.12) return 'header';
  if (mid > pageHeight * 0.88) return 'footer';
  return fallback;
}

function wantsKind(kind, options) {
  if (kind === 'header' || kind === 'footer') return options.headers !== false;
  if (kind === 'table') return options.tables !== false;
  if (kind === 'text') return options.text !== false;
  return options.images !== false;
}

async function parsePage(pdf, pageNumber, options = {}) {
  const page = await pdf.getPage(pageNumber);
  const viewport = page.getViewport({ scale: 1 });
  const pageArea = viewport.width * viewport.height;
  const texts = (await extractTextBlocks(page, viewport))
    .filter((block) => block.w * block.h < pageArea * 0.7)
    .map((block) => ({
      ...block,
      x: block.x - block.fontSize * 0.15,
      y: block.y - block.fontSize * 0.25,
      w: block.w + block.fontSize * 0.4,
      h: block.h + block.fontSize * 0.45,
      kind: regionKind(block, viewport.height, block.kind || 'text'),
    }));

  const { canvas, canvasContext, renderScale, images: painted } = await renderPage(page, viewport);
  const wantPictures = options.images !== false || options.headers !== false;
  const figures = wantPictures ? segmentFigures(canvas, renderScale, texts) : [];
  const images = (figures.length
    ? figures
    : painted.length
      ? painted
      : wantPictures
        ? dedupeImages(
          (await extractImages(page, viewport)).filter((img) => {
            const fullBleed = img.w >= viewport.width * 0.98 && img.h >= viewport.height * 0.98;
            return !fullBleed && img.w >= MIN_IMAGE && img.h >= MIN_IMAGE;
          }),
        )
        : []
  ).map((box) => ({ ...box, kind: regionKind(box, viewport.height, 'image') }));
  const pieces = [
    ...texts
      .filter((box) => wantsKind(box.kind, options))
      .map((box) => cutPiece(canvas, box, renderScale, 'text'))
      .filter(Boolean),
    ...images
      .filter((box) => wantsKind(box.kind, options))
      .map((box) => cutPiece(canvas, box, renderScale, 'image'))
      .filter(Boolean),
  ];
  pieces.forEach((piece) => erasePiece(canvasContext, piece.clip));
  const pageSrc = canvas.toDataURL('image/jpeg', 0.84);

  const items = [
    {
      id: uid('page'),
      type: 'page',
      locked: true,
      src: pageSrc,
      x: 0,
      y: 0,
      w: viewport.width,
      h: viewport.height,
    },
    ...pieces.map(({ clip, ...piece }) => {
      const fitted = piece.piece === 'image'
        ? fitOnPage(piece, viewport.width, viewport.height)
        : piece;
      return {
        id: uid(piece.piece === 'text' ? 'txt' : 'img'),
        type: 'image',
        ...fitted,
      };
    }),
  ];

  return {
    id: `page-${pageNumber}`,
    number: pageNumber,
    width: viewport.width,
    height: viewport.height,
    items,
  };
}

export async function parsePdfFile(file, onProgress, options = {}) {
  const data = new Uint8Array(await file.arrayBuffer());
  let pdf;
  try {
    pdf = await getDocument({ data, useSystemFonts: true }).promise;
  } catch (err) {
    const name = err?.name || '';
    if (name === 'PasswordException') {
      throw new Error('This PDF is password protected.');
    }
    if (name === 'InvalidPDFException') {
      throw new Error('That file could not be read as a PDF.');
    }
    throw new Error(err?.message || 'That file could not be read as a PDF.');
  }

  const pageCount = Math.min(pdf.numPages, MAX_PAGES);
  const pages = [];
  for (let i = 1; i <= pageCount; i += 1) {
    onProgress?.({ page: i, pageCount: pdf.numPages, capped: pdf.numPages > MAX_PAGES });
    pages.push(await parsePage(pdf, i, options));
  }

  const imageCount = pages.reduce((sum, page) => sum + page.items.filter((item) => item.piece === 'image').length, 0);
  const textCount = pages.reduce((sum, page) => sum + page.items.filter((item) => item.piece === 'text').length, 0);

  return {
    pages,
    imageCount,
    textCount,
    truncated: pdf.numPages > MAX_PAGES,
    totalPages: pdf.numPages,
  };
}

export const PDF_PAGE_LIMIT = MAX_PAGES;
