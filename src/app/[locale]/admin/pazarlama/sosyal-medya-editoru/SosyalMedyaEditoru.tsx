'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

type Fmt = 'square' | 'portrait' | 'landscape' | 'post';
type BgEffect = 'none' | 'dark' | 'light' | 'solid-dark' | 'solid-gold' | 'solid-green';
type TxtStyle = 'bold' | 'normal' | 'italic';
type LogoPos = 'tl' | 'tc' | 'tr' | 'ml' | 'mc' | 'mr' | 'bl' | 'bc' | 'br';

interface Overlay {
  id: number;
  type: 'text';
  text: string;
  x: number;
  y: number;
  fontSize: number;
  color: string;
  style: TxtStyle;
  bg: BgEffect;
}

const FMTS: Record<Fmt, { w: number; h: number; label: string; sub: string }> = {
  square:    { w: 1080, h: 1080, label: 'Instagram Kare',   sub: '1:1 · 1080px' },
  portrait:  { w: 1080, h: 1920, label: 'Reels / Story',    sub: '9:16 · 1920px' },
  landscape: { w: 1200, h: 628,  label: 'LinkedIn Banner',  sub: '1200×628px' },
  post:      { w: 1200, h: 1200, label: 'LinkedIn Kare',    sub: '1:1 · 1200px' },
};

const TEMPLATES: Record<string, Partial<Overlay>[]> = {
  distributor: [
    { text: 'Exklusiver Distributor',                      color: '#FFD700', style: 'bold',   bg: 'solid-dark' },
    { text: 'FO Produkte',                                  color: 'white',   style: 'bold',   bg: 'none' },
    { text: 'in Deutschland',                               color: 'white',   style: 'normal', bg: 'none' },
    { text: 'Köln & Umgebung',                              color: 'white',   style: 'normal', bg: 'dark' },
    { text: '#KölnHoreca  #FOProducts  #Deutschland',       color: 'rgba(255,255,255,0.65)', style: 'normal', bg: 'none' },
  ],
  product: [
    { text: 'NEU in Deutschland',   color: '#FFD700', style: 'bold',   bg: 'solid-dark' },
    { text: 'Für Ihre Küche.',      color: 'white',   style: 'bold',   bg: 'dark' },
    { text: 'Jetzt anfragen!',      color: '#FFD700', style: 'bold',   bg: 'none' },
  ],
  horeca: [
    { text: 'Für Hotels, Restaurants & Cafés', color: 'white',   style: 'bold',   bg: 'dark' },
    { text: 'FO Horeca',                        color: '#FFD700', style: 'bold',   bg: 'none' },
    { text: 'Qualität aus der Türkei',          color: 'white',   style: 'normal', bg: 'solid-dark' },
    { text: 'Jetzt als Distributor in Köln!',  color: 'rgba(255,255,255,0.8)', style: 'normal', bg: 'none' },
  ],
  koln: [
    { text: '📍 Köln',                                        color: 'white',   style: 'bold',   bg: 'solid-green' },
    { text: '& Umgebung',                                     color: 'rgba(255,255,255,0.85)', style: 'normal', bg: 'none' },
    { text: 'FO Produkte — direkt bei Ihnen.',                color: '#FFD700', style: 'bold',   bg: 'dark' },
    { text: '#Gastronomie  #Köln  #Horeca  #NRW',             color: 'rgba(255,255,255,0.65)', style: 'normal', bg: 'none' },
  ],
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function SosyalMedyaEditoru() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bgImgRef   = useRef<HTMLImageElement | null>(null);
  const logoImgRef = useRef<HTMLImageElement | null>(null);
  const logoCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const [fmt, setFmt]           = useState<Fmt>('square');
  const [overlays, setOverlays] = useState<Overlay[]>([]);
  const [history, setHistory]   = useState<Overlay[][]>([]);
  const [logoPos, setLogoPos]   = useState<LogoPos>('bl');
  const [logoSize, setLogoSize] = useState(22);
  const [logoOpacity, setLogoOpacity] = useState(100);
  const [bgThresh, setBgThresh] = useState(65);
  const [logoPreview, setLogoPreview] = useState('');
  const [status, setStatus]     = useState('Hazır');
  const [dragging, setDragging] = useState<number | null>(null);
  const dragRef = useRef<{ ox: number; oy: number }>({ ox: 0, oy: 0 });

  // Text input state
  const [txtInput, setTxtInput]   = useState('Jetzt in Deutschland verfügbar!');
  const [fontSize, setFontSize]   = useState(42);
  const [txtColor, setTxtColor]   = useState('white');
  const [txtStyle, setTxtStyle]   = useState<TxtStyle>('bold');
  const [txtBg, setTxtBg]         = useState<BgEffect>('none');
  const [tirToplam, setTirToplam] = useState('');
  const [tirKutu, setTirKutu]     = useState('');

  // ── Logo processing ─────────────────────────────────────────────────────────

  const removeDarkBg = (img: HTMLImageElement, thresh: number): HTMLCanvasElement => {
    const oc = document.createElement('canvas');
    oc.width = img.width; oc.height = img.height;
    const octx = oc.getContext('2d')!;
    octx.drawImage(img, 0, 0);
    const id = octx.getImageData(0, 0, oc.width, oc.height);
    const d = id.data;
    for (let i = 0; i < d.length; i += 4) {
      const brightness = (d[i] + d[i + 1] + d[i + 2]) / 3;
      if (brightness < thresh && d[i + 3] > 10) {
        const f = brightness / thresh;
        d[i + 3] = Math.max(0, Math.round(f * f * 255 * 0.28));
      }
    }
    octx.putImageData(id, 0, 0);
    return oc;
  };

  const reprocessLogo = useCallback(() => {
    if (!logoImgRef.current) return;
    logoCanvasRef.current = removeDarkBg(logoImgRef.current, bgThresh);
  }, [bgThresh]);

  useEffect(() => { reprocessLogo(); }, [bgThresh, reprocessLogo]);

  // ── Render ──────────────────────────────────────────────────────────────────

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const W = canvas.width, H = canvas.height;

    ctx.clearRect(0, 0, W, H);

    if (bgImgRef.current) {
      const r = Math.max(W / bgImgRef.current.width, H / bgImgRef.current.height);
      const sw = bgImgRef.current.width * r, sh = bgImgRef.current.height * r;
      ctx.drawImage(bgImgRef.current, (W - sw) / 2, (H - sh) / 2, sw, sh);
    } else {
      const grad = ctx.createLinearGradient(0, 0, W, H);
      grad.addColorStop(0, '#0d0d1a'); grad.addColorStop(1, '#1a1a2e');
      ctx.fillStyle = grad; ctx.fillRect(0, 0, W, H);
    }

    overlays.forEach(o => {
      const fs = o.fontSize;
      const wt = o.style === 'bold' ? 'bold ' : o.style === 'italic' ? 'italic ' : '';
      ctx.font = `${wt}${fs}px system-ui,sans-serif`;
      const lines = o.text.split('\n');
      const lh = fs * 1.3;
      const maxW = lines.reduce((m, l) => Math.max(m, ctx.measureText(l).width), 0);

      if (o.bg !== 'none') {
        const p = fs * 0.22;
        const bgColors: Record<BgEffect, string> = {
          'none': 'transparent',
          'dark': 'rgba(0,0,0,0.58)',
          'light': 'rgba(255,255,255,0.42)',
          'solid-dark': 'rgba(8,8,8,0.9)',
          'solid-gold': 'rgba(160,110,0,0.92)',
          'solid-green': 'rgba(25,70,45,0.92)',
        };
        ctx.fillStyle = bgColors[o.bg];
        ctx.beginPath();
        (ctx as any).roundRect(o.x - p, o.y - fs - p, maxW + p * 2, lines.length * lh + p * 2, 10);
        ctx.fill();
      }

      ctx.fillStyle = o.color;
      lines.forEach((l, i) => ctx.fillText(l, o.x, o.y + i * lh));
    });

    if (logoCanvasRef.current) {
      const pct = logoSize / 100;
      const lw = W * pct;
      const lh = lw * (logoCanvasRef.current.height / logoCanvasRef.current.width);
      const pad = W * 0.032;
      const posMap: Record<LogoPos, { x: number; y: number }> = {
        tl: { x: pad,          y: pad },
        tc: { x: (W - lw) / 2, y: pad },
        tr: { x: W - lw - pad, y: pad },
        ml: { x: pad,          y: (H - lh) / 2 },
        mc: { x: (W - lw) / 2, y: (H - lh) / 2 },
        mr: { x: W - lw - pad, y: (H - lh) / 2 },
        bl: { x: pad,          y: H - lh - pad },
        bc: { x: (W - lw) / 2, y: H - lh - pad },
        br: { x: W - lw - pad, y: H - lh - pad },
      };
      const { x, y } = posMap[logoPos];
      ctx.globalAlpha = logoOpacity / 100;
      ctx.drawImage(logoCanvasRef.current, x, y, lw, lh);
      ctx.globalAlpha = 1;
    }
  }, [overlays, logoPos, logoSize, logoOpacity]);

  useEffect(() => { render(); }, [render]);

  // ── Format change ────────────────────────────────────────────────────────────

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = FMTS[fmt].w;
    canvas.height = FMTS[fmt].h;
    render();
  }, [fmt, render]);

  // ── Handlers ─────────────────────────────────────────────────────────────────

  const saveHistory = (current: Overlay[]) => {
    setHistory(h => [...h.slice(-24), JSON.parse(JSON.stringify(current))]);
  };

  const addText = () => {
    if (!txtInput.trim()) return;
    const canvas = canvasRef.current!;
    const W = canvas.width, H = canvas.height;
    saveHistory(overlays);
    setOverlays(prev => [...prev, {
      id: Date.now(),
      type: 'text',
      text: txtInput,
      x: W * 0.06,
      y: H * 0.14,
      fontSize,
      color: txtColor,
      style: txtStyle,
      bg: txtBg,
    }]);
    setStatus('Yazı eklendi ✓');
  };

  const applyTemplate = (tpl: string) => {
    const canvas = canvasRef.current!;
    const W = canvas.width, H = canvas.height;
    saveHistory(overlays);
    const rows = TEMPLATES[tpl] || [];
    const yPositions: Record<string, number[]> = {
      distributor: [0.11, 0.21, 0.31, 0.88, 0.96],
      product:     [0.09, 0.82, 0.92],
      horeca:      [0.10, 0.80, 0.88, 0.95],
      koln:        [0.10, 0.19, 0.86, 0.94],
    };
    const fontRatios: Record<string, number[]> = {
      distributor: [0.038, 0.065, 0.044, 0.030, 0.019],
      product:     [0.036, 0.055, 0.028],
      horeca:      [0.034, 0.060, 0.030, 0.023],
      koln:        [0.060, 0.040, 0.031, 0.019],
    };
    const newOverlays: Overlay[] = rows.map((o, i) => ({
      id: Date.now() + Math.random(),
      type: 'text',
      text: o.text || '',
      x: W * 0.06,
      y: H * (yPositions[tpl]?.[i] ?? 0.1 + i * 0.1),
      fontSize: Math.round(W * (fontRatios[tpl]?.[i] ?? 0.04)),
      color: o.color || 'white',
      style: o.style || 'normal',
      bg: o.bg || 'none',
    }));
    setOverlays(newOverlays);
    setStatus('Şablon uygulandı ✓');
  };

  const removeOverlay = (i: number) => {
    saveHistory(overlays);
    setOverlays(prev => prev.filter((_, idx) => idx !== i));
  };

  const undo = () => {
    setHistory(h => {
      if (!h.length) return h;
      const prev = h[h.length - 1];
      setOverlays(prev);
      setStatus('Geri alındı');
      return h.slice(0, -1);
    });
  };

  const downloadImg = () => {
    setStatus('İndiriliyor...');
    const link = document.createElement('a');
    link.download = `fo-horeca-${fmt}-${Date.now()}.png`;
    link.href = canvasRef.current!.toDataURL('image/png');
    link.click();
    setTimeout(() => setStatus('İndirildi ✓'), 500);
  };

  // ── Drag ────────────────────────────────────────────────────────────────────

  const onMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rc = canvas.getBoundingClientRect();
    const sx = canvas.width / rc.width, sy = canvas.height / rc.height;
    const mx = (e.clientX - rc.left) * sx, my = (e.clientY - rc.top) * sy;
    const ctx = canvas.getContext('2d')!;

    for (let i = overlays.length - 1; i >= 0; i--) {
      const o = overlays[i];
      const wt = o.style === 'bold' ? 'bold ' : o.style === 'italic' ? 'italic ' : '';
      ctx.font = `${wt}${o.fontSize}px system-ui,sans-serif`;
      const w = o.text.split('\n').reduce((m, l) => Math.max(m, ctx.measureText(l).width), 0);
      const h = o.fontSize * 1.3 * o.text.split('\n').length;
      if (mx >= o.x - o.fontSize * 0.4 && mx <= o.x + w + o.fontSize * 0.4 &&
          my >= o.y - o.fontSize * 1.4 && my <= o.y + h) {
        setDragging(i);
        dragRef.current = { ox: mx - o.x, oy: my - o.y };
        return;
      }
    }
  };

  const onMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (dragging === null) return;
    const canvas = canvasRef.current!;
    const rc = canvas.getBoundingClientRect();
    const nx = (e.clientX - rc.left) * (canvas.width / rc.width) - dragRef.current.ox;
    const ny = (e.clientY - rc.top) * (canvas.height / rc.height) - dragRef.current.oy;
    setOverlays(prev => prev.map((o, i) => i === dragging ? { ...o, x: nx, y: ny } : o));
  };

  const onMouseUp = () => setDragging(null);

  // ── File loads ───────────────────────────────────────────────────────────────

  const loadBg = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setStatus('Fotoğraf yükleniyor...');
    const r = new FileReader();
    r.onload = ev => {
      const img = new Image();
      img.onload = () => { bgImgRef.current = img; render(); setStatus('Fotoğraf yüklendi ✓'); };
      img.src = ev.target?.result as string;
    };
    r.readAsDataURL(file);
  };

  const loadLogo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setStatus('Logo işleniyor...');
    const r = new FileReader();
    r.onload = ev => {
      const src = ev.target?.result as string;
      const img = new Image();
      img.onload = () => {
        logoImgRef.current = img;
        setLogoPreview(src);
        logoCanvasRef.current = removeDarkBg(img, bgThresh);
        render();
        setStatus('Logo yüklendi ✓');
      };
      img.src = src;
    };
    r.readAsDataURL(file);
  };

  // ── TIR auto-apply ───────────────────────────────────────────────────────────

  const tirCalc = (() => {
    const t = parseFloat(tirToplam), k = parseFloat(tirKutu);
    return t > 0 && k > 0 ? (t / k).toFixed(4) : null;
  })();

  // ─── JSX ────────────────────────────────────────────────────────────────────

  const posIcons: Record<LogoPos, string> = {
    tl:'↖', tc:'↑', tr:'↗', ml:'←', mc:'·', mr:'→', bl:'↙', bc:'↓', br:'↘',
  };

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] bg-[#1a1a2e] text-slate-200 overflow-hidden">

      {/* Top bar */}
      <div className="bg-[#111] px-5 py-2.5 flex items-center gap-3 border-b border-[#333] shrink-0">
        <span className="text-sm font-semibold text-yellow-400">🍽️ FO Horeca — Sosyal Medya Editörü</span>
        <span className="text-xs text-[#888]">Köln &amp; Almanya Distribütörü</span>
        <span className="ml-auto text-[11px] text-[#555]">
          {FMTS[fmt].w}×{FMTS[fmt].h}
        </span>
      </div>

      {/* Main layout */}
      <div className="flex flex-1 overflow-hidden">

        {/* Sidebar */}
        <div className="w-[300px] shrink-0 bg-[#111] border-r border-[#2a2a2a] flex flex-col gap-3 overflow-y-auto p-3.5">

          {/* Format */}
          <Section label="Format">
            <div className="grid grid-cols-2 gap-1.5">
              {(Object.entries(FMTS) as [Fmt, typeof FMTS['square']][]).map(([key, f]) => (
                <button key={key} onClick={() => setFmt(key)}
                  className={`py-2 px-1.5 rounded-lg border text-[11px] text-center leading-tight transition
                    ${fmt === key ? 'bg-yellow-400 text-[#111] border-yellow-400 font-semibold' : 'bg-[#1a1a1a] border-[#333] text-slate-400 hover:bg-[#222] hover:border-yellow-400'}`}>
                  <div>{f.label}</div>
                  <div className="opacity-60 text-[9px] mt-0.5">{f.sub}</div>
                </button>
              ))}
            </div>
          </Section>

          {/* Background photo */}
          <Section label="Arka Plan Fotoğrafı">
            <label className="flex flex-col items-center justify-center gap-1.5 border border-dashed border-[#333] rounded-lg p-3 cursor-pointer hover:bg-[#222] hover:border-yellow-400 transition">
              <span className="text-2xl">📸</span>
              <span className="text-[11px] text-[#888]">Tıkla veya sürükle bırak</span>
              <input type="file" accept="image/*" className="hidden" onChange={loadBg} />
            </label>
          </Section>

          {/* Logo */}
          <Section label="Logo">
            <label className="flex items-center gap-2.5 border border-dashed border-[#333] rounded-lg p-2 cursor-pointer hover:border-yellow-400 transition">
              {logoPreview
                ? <img src={logoPreview} alt="logo" className="w-14 h-14 object-contain rounded border border-[#333] bg-black shrink-0" />
                : <div className="w-14 h-14 rounded border border-[#333] bg-black shrink-0 flex items-center justify-center text-[#444] text-lg">?</div>
              }
              <div>
                <div className="text-xs font-medium text-slate-300">Logo Yükle (PNG)</div>
                <div className="text-[10px] text-[#888]">Siyah arka plan otomatik kaldırılır</div>
                <div className="text-[10px] text-yellow-400 mt-0.5">✓ Şeffaf PNG desteği</div>
              </div>
              <input type="file" accept="image/*" className="hidden" onChange={loadLogo} />
            </label>

            {/* Logo controls */}
            <div className="border border-[#2a2a2a] rounded-lg bg-[#1a1a1a] p-2.5 space-y-2.5 mt-1.5">
              <div className="flex gap-2.5">
                {/* Position grid */}
                <div>
                  <div className="text-[10px] text-[#888] mb-1.5">Konum</div>
                  <div className="grid grid-cols-3 gap-0.5 w-[78px]">
                    {(Object.keys(posIcons) as LogoPos[]).map(p => (
                      <button key={p} onClick={() => setLogoPos(p)}
                        className={`w-6 h-6 rounded border text-[12px] flex items-center justify-center transition
                          ${logoPos === p ? 'bg-yellow-400 text-[#111] border-yellow-400' : 'bg-[#1a1a1a] border-[#333] text-[#888] hover:bg-yellow-400 hover:text-[#111] hover:border-yellow-400'}`}>
                        {posIcons[p]}
                      </button>
                    ))}
                  </div>
                </div>
                {/* Size / Opacity */}
                <div className="flex-1 space-y-2">
                  <div>
                    <div className="text-[10px] text-[#888] mb-1">Boyut</div>
                    <div className="flex items-center gap-1">
                      <input type="range" min={5} max={50} value={logoSize} onChange={e => { setLogoSize(+e.target.value); render(); }}
                        className="flex-1 accent-yellow-400 h-1" />
                      <span className="text-[10px] text-[#888] w-7 text-right">{logoSize}%</span>
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-[#888] mb-1">Opaklık</div>
                    <div className="flex items-center gap-1">
                      <input type="range" min={20} max={100} value={logoOpacity} onChange={e => { setLogoOpacity(+e.target.value); render(); }}
                        className="flex-1 accent-yellow-400 h-1" />
                      <span className="text-[10px] text-[#888] w-7 text-right">{logoOpacity}%</span>
                    </div>
                  </div>
                </div>
              </div>
              <div>
                <div className="text-[10px] text-[#888] mb-1">Siyah kaldır hassasiyeti</div>
                <div className="flex items-center gap-1">
                  <input type="range" min={20} max={130} value={bgThresh} onChange={e => setBgThresh(+e.target.value)}
                    className="flex-1 accent-yellow-400 h-1" />
                  <span className="text-[10px] text-[#888] w-5 text-right">{bgThresh}</span>
                </div>
              </div>
            </div>
          </Section>

          {/* Quick templates */}
          <Section label="Hızlı Şablonlar">
            {[
              ['distributor', '🇩🇪 Distribütör Duyurusu'],
              ['product',     '🍽️ Ürün Tanıtımı'],
              ['horeca',      '🏨 Horeca Partneri'],
              ['koln',        '📍 Köln & Çevresi'],
            ].map(([k, lbl]) => (
              <button key={k} onClick={() => applyTemplate(k)}
                className="w-full text-left px-2.5 py-2 rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] text-[12px] text-slate-400 hover:bg-[#252525] hover:border-yellow-400 transition mb-1">
                {lbl}
              </button>
            ))}
          </Section>

          {/* Add text */}
          <Section label="Yazı Ekle">
            <textarea rows={2} value={txtInput} onChange={e => setTxtInput(e.target.value)} placeholder="Yazınızı girin..."
              className="w-full text-xs bg-[#1a1a1a] border border-[#333] text-slate-200 rounded-md px-2 py-1.5 outline-none focus:border-yellow-400 resize-none" />
            <div className="mt-1.5">
              <div className="text-[10px] text-[#888] mb-1">Yazı boyutu</div>
              <div className="flex items-center gap-1">
                <input type="range" min={14} max={140} value={fontSize} onChange={e => setFontSize(+e.target.value)}
                  className="flex-1 accent-yellow-400 h-1" />
                <span className="text-[10px] text-[#888] w-8 text-right">{fontSize}px</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-1.5 mt-1.5">
              <div>
                <div className="text-[10px] text-[#888] mb-1">Renk</div>
                <select value={txtColor} onChange={e => setTxtColor(e.target.value)}
                  className="w-full text-xs bg-[#1a1a1a] border border-[#333] text-slate-200 rounded-md px-1.5 py-1 outline-none focus:border-yellow-400">
                  <option value="white">⬜ Beyaz</option>
                  <option value="#FFD700">🟡 Altın</option>
                  <option value="#f5f5dc">🟤 Krem</option>
                  <option value="#1a1a1a">⬛ Siyah</option>
                  <option value="#E8002D">🔴 Kırmızı</option>
                  <option value="#0066CC">🔵 Mavi</option>
                  <option value="#2d6a4f">🟢 Koyu Yeşil</option>
                </select>
              </div>
              <div>
                <div className="text-[10px] text-[#888] mb-1">Stil</div>
                <select value={txtStyle} onChange={e => setTxtStyle(e.target.value as TxtStyle)}
                  className="w-full text-xs bg-[#1a1a1a] border border-[#333] text-slate-200 rounded-md px-1.5 py-1 outline-none focus:border-yellow-400">
                  <option value="bold">Kalın</option>
                  <option value="normal">Normal</option>
                  <option value="italic">İtalik</option>
                </select>
              </div>
            </div>
            <div className="mt-1.5">
              <div className="text-[10px] text-[#888] mb-1">Arkaplan efekti</div>
              <select value={txtBg} onChange={e => setTxtBg(e.target.value as BgEffect)}
                className="w-full text-xs bg-[#1a1a1a] border border-[#333] text-slate-200 rounded-md px-1.5 py-1 outline-none focus:border-yellow-400">
                <option value="none">Yok</option>
                <option value="dark">Koyu yarı-şeffaf</option>
                <option value="light">Açık yarı-şeffaf</option>
                <option value="solid-dark">Siyah bant</option>
                <option value="solid-gold">Altın bant</option>
                <option value="solid-green">Koyu Yeşil bant</option>
              </select>
            </div>
            <button onClick={addText}
              className="mt-2 w-full py-2 rounded-lg bg-yellow-400 text-[#111] text-xs font-bold hover:bg-yellow-300 transition">
              ＋ Yazı Ekle
            </button>
          </Section>

          {/* Hashtag chips */}
          <Section label="Hazır Etiketler & Sloganlar">
            <div className="flex flex-wrap gap-1.5">
              {[
                ['🏙️ #KölnHoreca', '#KölnHoreca'],
                ['🇩🇪 #Deutschland', '#Deutschland'],
                ['🍴 #FOProducts', '#FOProducts'],
                ['🍽️ #Gastronomie', '#Gastronomie'],
                ['🏨 #Horeca', '#Horeca'],
                ['📍 #NRW', '#NRW'],
                ['📢 Jetzt verfügbar!', 'Jetzt verfügbar!'],
                ['⭐ Exklusiver Distributor', 'Exklusiver Distributor\nfür Deutschland'],
                ['📍 Köln & Umgebung', 'Köln & Umgebung'],
                ['🇹🇷 Qualität aus der Türkei', 'Qualität aus der Türkei'],
                ['🏨 Für HoReCa', 'Für Hotels, Restaurants\n& Cafés'],
                ['📩 Jetzt anfragen!', 'Jetzt anfragen!'],
              ].map(([label, val]) => (
                <button key={label} onClick={() => setTxtInput(val)}
                  className="text-[10px] px-2 py-1 rounded-full border border-[#333] bg-[#1a1a1a] text-slate-400 hover:bg-yellow-400 hover:text-[#111] hover:border-yellow-400 transition">
                  {label}
                </button>
              ))}
            </div>
          </Section>

          {/* Layer list */}
          <Section label={`Katmanlar${overlays.length ? ` (${overlays.length})` : ''}`}>
            <div className="flex flex-col gap-1 max-h-24 overflow-y-auto">
              {overlays.map((o, i) => (
                <div key={o.id} className="flex items-center gap-1.5 px-2 py-1 border border-[#2a2a2a] rounded-md bg-[#1a1a1a] text-[11px]">
                  <span>T</span>
                  <span className="flex-1 truncate opacity-70">{o.text.replace(/\n/g, ' ').substring(0, 32)}</span>
                  <button onClick={() => removeOverlay(i)} className="text-[#666] hover:text-red-400 text-sm ml-auto">✕</button>
                </div>
              ))}
            </div>
          </Section>

          {/* Download */}
          <button onClick={downloadImg}
            className="w-full py-2.5 rounded-lg bg-gradient-to-r from-yellow-400 to-yellow-300 text-[#111] text-sm font-bold hover:opacity-90 transition">
            ⬇ Görseli İndir (PNG)
          </button>
          <div className="text-[11px] text-[#555] pb-1">{status}</div>
        </div>

        {/* Main canvas area */}
        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Toolbar */}
          <div className="bg-[#111] border-b border-[#2a2a2a] px-4 py-2 flex flex-wrap items-center gap-2 shrink-0">
            <button onClick={undo}
              className="px-3 py-1.5 rounded-md border border-[#333] bg-[#1a1a1a] text-xs text-slate-400 hover:bg-[#252525] transition">
              ↩ Geri Al
            </button>
            <button onClick={() => { saveHistory(overlays); setOverlays([]); setStatus('Temizlendi'); }}
              className="px-3 py-1.5 rounded-md border border-[#333] bg-[#1a1a1a] text-xs text-slate-400 hover:bg-[#252525] transition">
              🗑 Yazıları Temizle
            </button>

            {/* TIR mini-calc */}
            <div className="flex items-center gap-1.5 ml-2 px-2 py-1 rounded-md border border-[#2a2a44] bg-[#1a1a2e]">
              <span className="text-[10px] font-bold text-amber-500 uppercase">TIR</span>
              <input type="number" placeholder="toplam €" value={tirToplam} onChange={e => setTirToplam(e.target.value)}
                className="w-20 text-[11px] bg-transparent border-none text-slate-300 outline-none placeholder:text-[#444]" />
              <span className="text-[#444]">÷</span>
              <input type="number" placeholder="kutu" value={tirKutu} onChange={e => setTirKutu(e.target.value)}
                className="w-14 text-[11px] bg-transparent border-none text-slate-300 outline-none placeholder:text-[#444]" />
              {tirCalc && <span className="text-[11px] font-semibold text-amber-400">= {tirCalc} €/kutu</span>}
            </div>

            <span className="ml-auto text-[11px] text-[#555]">Yazıya tıkla → sürükle ile konumlandır</span>
          </div>

          {/* Canvas wrapper */}
          <div className="flex-1 flex items-center justify-center p-5 bg-[#1a1a2e] overflow-hidden">
            <canvas
              ref={canvasRef}
              width={FMTS[fmt].w}
              height={FMTS[fmt].h}
              onMouseDown={onMouseDown}
              onMouseMove={onMouseMove}
              onMouseUp={onMouseUp}
              onMouseLeave={onMouseUp}
              className="rounded-md shadow-2xl"
              style={{
                cursor: dragging !== null ? 'grabbing' : 'crosshair',
                maxWidth: '100%',
                maxHeight: 'calc(100vh - 140px)',
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Section helper ───────────────────────────────────────────────────────────

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] font-bold uppercase tracking-widest text-[#888] mb-1.5">{label}</div>
      {children}
    </div>
  );
}
