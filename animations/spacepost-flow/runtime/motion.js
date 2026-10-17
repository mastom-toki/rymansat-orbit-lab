/* slide-hub motion runtime。依存なし・1ファイル。window.Motion（Node では module.exports）に置く。
   デッキの deck.html には tools/runtime-sync.mjs が @runtime:begin 〜 @runtime:end の間へ丸ごと埋め込む（手で書き換えない）。
   抽出元: templates/explainer の template.html・vertical.html、lyric-9x16.html、decks/20260928-slide-hub-promo・-short・
   -ai-call-guard-explainer の deck.html。同じ計算はここに 1 つだけ置き、元ごとに違った挙動はその場にコメントで残す。 */
(function (root) {
  "use strict";
  const VERSION = "1.0.0";

  // ---- 数 ----
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const lerp = (a, b, k) => a + (b - a) * k;
  // x を [a, b] → [c, d] に写す。既定で [c, d] に収める
  const remap = (x, a, b, c = 0, d = 1, clip = true) => { const k = (x - a) / (b - a); return lerp(c, d, clip ? clamp(k) : k); };
  // 区間 [a, b] での進み 0..1（promo / short の seg）
  const seg = (t, a, b) => clamp((t - a) / (b - a));

  // ---- easing（入力は 0..1。outExpo は元の explainer と同じく 0 未満を切らない）----
  const ease = {
    linear: x => x,
    inQuad: x => x * x,
    outQuad: x => 1 - (1 - x) * (1 - x),
    inOutQuad: x => x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2,
    inCubic: x => x * x * x,
    outCubic: x => 1 - Math.pow(1 - x, 3),
    inOutCubic: x => x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2, // promo の inOut
    outExpo: x => x >= 1 ? 1 : 1 - Math.pow(2, -10 * x),
    inOutExpo: x => x <= 0 ? 0 : x >= 1 ? 1 : x < 0.5 ? Math.pow(2, 20 * x - 10) / 2 : (2 - Math.pow(2, -20 * x + 10)) / 2,
    outBack: x => 1 + 2.70158 * Math.pow(x - 1, 3) + 1.70158 * Math.pow(x - 1, 2),
    bump: x => x <= 0 || x >= 1 ? 0 : Math.sin(Math.PI * x), // 0→1→0（promo の bump）
  };

  // ---- 閉形式スプリング ----
  // 減衰振動のステップ応答 0→1（tau <= 0 は 0）。f = 固有振動数 Hz、z = 減衰比（< 1）。
  // 既定値は元ごとに違った: explainer / ai-call-guard は (2.0, 0.8)、promo / short は (1.6, 0.8)、lyric は (2.4, 0.7)。
  // ここの既定は (2.0, 0.8)。それ以外に頼っていたところは呼び出し側で明示する
  function spring(tau, f = 2.0, z = 0.8) {
    if (tau <= 0) return 0;
    const w = 2 * Math.PI * f, wd = w * Math.sqrt(1 - z * z);
    return 1 - Math.exp(-z * w * tau) * (Math.cos(wd * tau) + (z * w / wd) * Math.sin(wd * tau));
  }
  // 目標が変わるたびにバネを1本足す: v(t) = v0 + Σ (v_i − v_{i−1})・spring(t − t_i)。過去の状態を持たないので、どの t にも直接飛べる。
  // keys = [[t, v, f?, z?], ...]。v は数か同じ長さの配列。keys[0] の t は使わない（初期値）。f / z はキーごとに上書きできる
  // （promo の track(keys, t, f, z) と explainer の形のキー K を 1 つにした）
  function track(keys, t, f = 2.0, z = 0.8) {
    const v0 = keys[0][1];
    if (typeof v0 === "number") {
      let v = v0;
      for (let i = 1; i < keys.length; i++) {
        const p = spring(t - keys[i][0], keys[i][2] ?? f, keys[i][3] ?? z);
        if (p) v += (keys[i][1] - keys[i - 1][1]) * p;
      }
      return v;
    }
    const v = v0.slice();
    for (let i = 1; i < keys.length; i++) {
      const p = spring(t - keys[i][0], keys[i][2] ?? f, keys[i][3] ?? z);
      if (p) for (let j = 0; j < v.length; j++) v[j] += (keys[i][1][j] - keys[i - 1][1][j]) * p;
    }
    return v;
  }

  // ---- 決まった乱数 ----
  // mulberry32（promo / short の rng(seed) と同じ式）
  function mulberry32(a) {
    return () => {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  // 文字列 → 32bit（FNV-1a）
  function hash(s) {
    let h = 0x811c9dc5;
    for (const ch of String(s)) { h ^= ch.codePointAt(0); h = Math.imul(h, 0x01000193); }
    return h >>> 0;
  }
  // 物体ごとの系列: 同じ (id, seed) なら毎回同じ列、id が違えば独立した列
  const rng = (id, seed = 0) => mulberry32(hash(id) ^ seed);
  // 系列の i 番目だけを状態なしで引く（seek の中で使う）
  const rand = (id, i = 0, seed = 0) => mulberry32((hash(id) ^ seed) + Math.imul(i + 1, 0x9E3779B1) | 0)();

  // ---- シーン表 ----
  // list = [{id, start?, dur}]。start を省くと前のシーンの終わりから続ける。at(t) → {scene, index, local, p}。
  // 境界ちょうどの t は新しいシーンに入る。t < 0 は最初のシーンの頭、総尺以降は最後のシーンの末尾（p = 1）
  function scenes(list) {
    let t0 = 0;
    const S = list.map((s, i) => {
      const start = s.start ?? t0, dur = +s.dur;
      if (!(dur > 0)) throw new Error(`scene ${s.id ?? i}: dur が正の数でない（${s.dur}）`);
      t0 = start + dur;
      return { ...s, id: String(s.id ?? i), index: i, start, dur, end: start + dur };
    });
    const total = S.reduce((m, s) => Math.max(m, s.end), 0);
    function at(t) {
      if (!S.length) return null;
      let i = 0;
      while (i + 1 < S.length && S[i + 1].start <= t) i++;
      const s = S[i], local = clamp(t - s.start, 0, s.dur);
      return { scene: s, index: i, local, p: local / s.dur };
    }
    return { list: S, total, at };
  }

  // ---- 拍グリッド（テンポ一定・offset = 最初の拍の時刻）----
  // at(t) → {beat: 拍の実数, index: 拍番号, phase: 拍内 0..1, since: 拍頭からの秒, bar, inBar: 小節内の拍 0..perBar−1, barPhase: 小節内 0..1}
  // t < offset は負の拍・負の小節（inBar は 0..perBar−1 のまま）
  function beatGrid({ bpm, offset = 0, perBar = 4 }) {
    const beat = 60 / bpm;
    return {
      beat, bar: beat * perBar,
      time: k => offset + k * beat, // k 拍目の時刻
      at(t) {
        const b = (t - offset) / beat, index = Math.floor(b + 1e-9), bar = Math.floor(index / perBar);
        const phase = clamp(b - index);
        return { beat: b, index, phase, since: phase * beat, bar, inBar: index - bar * perBar, barPhase: (b - bar * perBar) / perBar };
      },
    };
  }
  // 昇順の配列 a で t 以下の要素数（lyric の upto。解析した拍・キック時刻の検索に使う）
  function upto(a, t) {
    let lo = 0, hi = a.length;
    while (lo < hi) { const m = (lo + hi) >> 1; if (a[m] <= t) lo = m + 1; else hi = m; }
    return lo;
  }

  // ---- 字幕の切り替え ----
  // segs = [{t0, t1, ...}]（絶対秒）。join 秒未満の隙間で続く字幕は 1 本の帯（run）にまとめる（explainer は 1e-6、ai-call-guard は 0.35）。
  // hold > 0 なら、次の字幕までの隙間が hold 秒以下のとき前の字幕をそこまで延ばす（vertical の「次のスライドの最初の字幕まで延ばす」）。
  // roll: 次の字幕が直後に続くか（vertical は前が上へ抜けるのと同時に次が下から入る）
  function captions(segs, { join = 1e-6, hold = 0 } = {}) {
    const S = segs.map(g => ({ ...g })).sort((a, b) => a.t0 - b.t0);
    S.forEach((g, i) => {
      const nx = S[i + 1];
      if (nx && hold > 0 && nx.t0 > g.t1 && nx.t0 - g.t1 <= hold) g.t1 = nx.t0;
      g.roll = !!nx && Math.abs(nx.t0 - g.t1) < 1e-6;
    });
    const runs = [];
    S.forEach(g => {
      const u = runs[runs.length - 1];
      if (u && g.t0 - u.t1 < join) { u.t1 = Math.max(u.t1, g.t1); u.segs.push(g); } else runs.push({ t0: g.t0, t1: g.t1, segs: [g] });
    });
    const at = t => { let i = -1; S.forEach((g, k) => { if (t >= g.t0 && t < g.t1) i = k; }); return i < 0 ? null : { seg: S[i], index: i, local: t - S[i].t0 }; };
    const runAt = t => runs.find(u => t >= u.t0 && t < u.t1) ?? null;
    return { segs: S, runs, at, runAt };
  }

  // ---- 大きさと安全域 ----
  function parseSize(s = "1920x1080") {
    const m = /^(\d{3,4})x(\d{3,4})$/.exec(String(s));
    if (!m) throw new Error(`size は "1920x1080" のような 幅x高さ: ${s}`);
    return [+m[1], +m[2]];
  }
  // 文字の要（見出し・字幕）を置いてよい矩形 {x, y, w, h}。
  // 縦（9:16）は SNS の UI を避ける: 上 12%（上部のタブ）・下 20%（説明文とボタン）・右 15%（いいね等の縦並び）・左 6%（short の値に左の余白を足した）。
  // 横（16:9）はタイトルセーフ 5%
  function safeArea(size = "1920x1080") {
    const [W, H] = Array.isArray(size) ? size : parseSize(size);
    const [l, t, r, b] = H > W ? [0.06, 0.12, 0.15, 0.20] : [0.05, 0.05, 0.05, 0.05];
    const x = Math.round(W * l), y = Math.round(H * t);
    return { x, y, w: Math.round(W * (1 - r)) - x, h: Math.round(H * (1 - b)) - y };
  }

  // ---- 文字を枠に収める ----
  // items = [{el, size, maxW, maxH?, measure?, grp?, min?}]。el の font-size を size から縮めて maxW（と maxH）に収める。
  // 幅は measure（既定 el）の offsetWidth で測る（explainer はマスク線 .ln に大きさを付け、中の span で測る）。
  // grp が同じものは同じ倍率（code の全行など）。min（px）より小さくはしない。各 item に fit（倍率）を書き戻す
  // display:none の中にあって測れない item は触らない（幅 0 を「収まっている」と取り違えて元の大きさへ戻さないように。測る間は呼び出し側で表示する）
  function fitText(all) {
    const items = all.filter(r => (r.measure || r.el).getClientRects().length);
    items.forEach(r => { r.el.style.fontSize = r.size + "px"; });
    const g = new Map();
    items.forEach(r => {
      const m = r.measure || r.el;
      r.fit = Math.min(1, r.maxW / (m.offsetWidth || 1), r.maxH ? r.maxH / (m.offsetHeight || 1) : 1);
      if (r.min) r.fit = Math.max(r.fit, Math.min(1, r.min / r.size));
      if (r.grp != null) g.set(r.grp, Math.min(g.get(r.grp) ?? 1, r.fit));
    });
    items.forEach(r => { if (r.grp != null) r.fit = g.get(r.grp); r.el.style.fontSize = (r.size * r.fit).toFixed(2) + "px"; });
    return all;
  }
  // 字幅の見積もり（全角 = 1、半角 = 0.56 em。vertical の em）
  const em = t => [...String(t)].reduce((a, c) => a + (c.codePointAt(0) < 0x2000 ? 0.56 : 1), 0);
  // 2 行に割る: 真ん中に近い読点・閉じ記号の後ろ、無ければ真ん中に近い単語の切れ目（ひらがな・閉じ記号・！？の前では割らない）。vertical の split2
  function split2(txt) {
    txt = String(txt);
    const mid = txt.length / 2;
    let cut = -1;
    for (const m of txt.matchAll(/[、。，・）」]/g)) if (cut < 0 || Math.abs(m.index - mid) < Math.abs(cut - mid)) cut = m.index;
    if (cut >= 0 && cut <= txt.length - 3 && Math.abs(cut - mid) <= txt.length / 4) return [txt.slice(0, cut + 1), txt.slice(cut + 1)];
    let best = -1;
    const words = typeof Intl !== "undefined" && Intl.Segmenter ? [...new Intl.Segmenter("ja", { granularity: "word" }).segment(txt)].map(s => s.index) : [];
    for (const i of words)
      // 数字の直後（「1 / 枚」のような数と助数詞の間）でも割らない（vertical からの追加）
      if (i > 2 && !/[ぁ-ゟ、。，）」ー！？!?…]/.test(txt.slice(i).trimStart()[0]) && !/\d/.test(txt[i - 1]) && (best < 0 || Math.abs(i - mid) < Math.abs(best - mid))) best = i;
    if (best < 0) best = cut >= 0 ? cut + 1 : Math.round(mid);   // 割れる所が無ければ、偏っていても読点の後ろ（無ければ真ん中）
    return [txt.slice(0, best).trimEnd(), txt.slice(best).trimStart()];
  }
  // 幅 maxW（px）に size で収まらなければ 2 行に割る（8% までは縮めて 1 行のまま。残りのはみ出しは fitText で縮める）
  const wrap = (txt, size, maxW) => em(txt) * size <= maxW * 1.08 ? [String(txt)] : split2(txt);

  // 2 色の間の rgb() 文字列（a, b は [r, g, b]）
  const mix = (a, b, p) => `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * p)).join(",")})`;

  // ---- デッキの規約をまとめて満たす ----
  // Motion.mount({duration, size, seek, objects?, scenes?, ready?, layout?, loop?, stage?})
  //   seek(t): t（0..duration に丸めた秒）の絵を描く純関数。layout(): 測って組む（最初と、フォント・画像の準備後にもう一度）
  //   objects(t): [{id, bbox:[x,y,w,h], ...}]。省くとステージ内の [data-obj] で見えている要素の矩形（ステージ座標）
  //   scenes: [{id, start?, dur}]。ready: 追加で待つ Promise
  // 公開するもの: window.seek / window.DUR / window.__renderReady / window.__getSceneState() / Motion.info（new-deck が deck.json に写す）。
  // ?t=秒 で静止、無ければループ再生（explainer は剰余、vertical は丸めていた。ここは丸めて、ループはページ側の rAF だけが回す）。
  // ?safe で安全域の外を塗る（short の QA 表示）
  function mount(o) {
    const doc = root.document, win = root;
    const [W, H] = parseSize(o.size);
    const dur = +o.duration;
    if (!(dur > 0)) throw new Error(`Motion.mount: duration が正の数でない（${o.duration}）`);
    const stage = o.stage || doc.getElementById("stage");
    if (!stage) throw new Error("Motion.mount: #stage が無い");
    const css = doc.createElement("style");
    css.textContent = "html,body{margin:0;height:100%;overflow:hidden}.slide{width:100vw;height:100vh;display:block;position:relative}"
      + `#stage{position:absolute;left:0;top:0;width:${W}px;height:${H}px;transform-origin:0 0;overflow:hidden}`;
    doc.head.prepend(css);
    const fit = () => {
      const s = Math.min(win.innerWidth / W, win.innerHeight / H);
      stage.style.transform = `translate(${(win.innerWidth - W * s) / 2}px,${(win.innerHeight - H * s) / 2}px) scale(${s})`;
    };
    win.addEventListener("resize", fit); fit();
    const sc = o.scenes ? scenes(o.scenes) : null;
    let lastT = 0;
    const draw = t => { lastT = +t || 0; o.seek(clamp(lastT, 0, dur)); };
    const r1 = n => Math.round(n * 10) / 10;
    const autoObjects = () => {
      const st = stage.getBoundingClientRect(), k = W / (st.width || W);
      return [...stage.querySelectorAll("[data-obj]")].filter(e => {
        if (!e.getClientRects().length) return false;
        const cs = getComputedStyle(e);
        return cs.visibility === "visible" && +cs.opacity > 0;
      }).map(e => {
        const b = e.getBoundingClientRect();
        return { id: e.dataset.obj, bbox: [r1((b.left - st.left) * k), r1((b.top - st.top) * k), r1(b.width * k), r1(b.height * k)] };
      }).filter(x => x.bbox[2] > 0 && x.bbox[3] > 0);
    };
    o.layout?.();
    win.seek = draw;
    win.DUR = dur;
    Motion.info = { duration: dur, size: `${W}x${H}`, loop: !!o.loop, version: VERSION };
    const imgs = [...stage.querySelectorAll("img")];
    win.__renderReady = Promise.all([
      doc.fonts ? doc.fonts.ready : null,
      ...imgs.map(i => i.decode().catch(() => { throw new Error("画像を読めない: " + i.getAttribute("src")); })),
      o.ready,
    ]).then(() => { o.layout?.(); draw(lastT); });
    win.__getSceneState = () => {
      const t = clamp(lastT, 0, dur), cur = sc?.at(t);
      return {
        t: Math.round(t * 1000) / 1000,
        scene: cur ? cur.scene.id : null,
        scenes: sc ? sc.list.map(s => ({ id: s.id, start: s.start, dur: s.dur })) : [],
        objects: o.objects ? o.objects(t) : autoObjects(),
      };
    };
    // ponytail: window.CUES は出さない（export の check / review は CUES があるとそれを優先する。シーンの頭 +0.3 秒は文字の立ち上がり途中で
    // 「要レビュー」に数えられ、review の境界は __getSceneState().scenes で足りる）。音付きデッキは mix.mjs の timeline.js が CUES を出す
    const q = new URLSearchParams(win.location.search), fixed = q.get("t");
    if (q.has("safe")) {
      const a = safeArea([W, H]), shade = doc.createElement("div");
      shade.style.cssText = `position:absolute;inset:0;pointer-events:none;z-index:99;box-sizing:border-box;border:solid rgba(255,0,200,.28);`
        + `border-width:${a.y}px ${W - a.x - a.w}px ${H - a.y - a.h}px ${a.x}px`;
      stage.appendChild(shade);
    }
    draw(fixed !== null ? +fixed || 0 : 0);
    if (fixed === null) {
      const t0 = performance.now();
      (function loop(now) { fit(); draw(((now - t0) / 1000) % dur); requestAnimationFrame(loop); })(t0);
    }
    return { seek: draw, scenes: sc, W, H, stage };
  }

  const Motion = {
    version: VERSION,
    clamp, lerp, remap, seg, ease, spring, track,
    mulberry32, hash, rng, rand,
    scenes, beatGrid, upto, captions,
    parseSize, safeArea, fitText, em, split2, wrap, mix,
    mount, info: null,
  };
  if (typeof module === "object" && module.exports) module.exports = Motion;
  else root.Motion = Motion;
})(typeof window !== "undefined" ? window : globalThis);
