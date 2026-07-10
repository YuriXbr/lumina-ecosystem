import { useState, useEffect, useCallback, useRef } from 'react';

// ─── CSS Keyframes ────────────────────────────────────────────────────────────
function AnimationStyles() {
    return (
        <style>{`
            @keyframes chestShake {
                0%,100% { transform: translateX(0) rotate(0deg) scale(1); }
                10%  { transform: translateX(-9px) rotate(-7deg) scale(1.06); }
                20%  { transform: translateX(9px)  rotate(7deg)  scale(1.09); }
                30%  { transform: translateX(-9px) rotate(-6deg) scale(1.07); }
                40%  { transform: translateX(9px)  rotate(6deg)  scale(1.09); }
                50%  { transform: translateX(-8px) rotate(-7deg) scale(1.06); }
                60%  { transform: translateX(8px)  rotate(7deg)  scale(1.09); }
                70%  { transform: translateX(-5px) rotate(-3deg) scale(1.04); }
                80%  { transform: translateX(5px)  rotate(3deg)  scale(1.06); }
                90%  { transform: translateX(-3px) rotate(-1deg) scale(1.02); }
            }
            @keyframes pulseRing {
                0%   { transform: scale(0.7); opacity: 0.75; }
                100% { transform: scale(2.6); opacity: 0; }
            }
            @keyframes cardReveal {
                0%   { opacity: 0; transform: scale(0.58) translateY(32px); }
                65%  { transform: scale(1.06) translateY(-5px); }
                100% { opacity: 1; transform: scale(1) translateY(0); }
            }
            @keyframes particleFly {
                0%   { opacity: 1; transform: translate(0,0) scale(1); }
                100% { opacity: 0; transform: translate(var(--tx), var(--ty)) scale(0.15); }
            }
            @keyframes shimmerSweep {
                0%   { transform: translateX(-140%) skewX(-18deg); }
                100% { transform: translateX(240%)  skewX(-18deg); }
            }
            @keyframes rarityGlow {
                0%, 100% { box-shadow: 0 0 12px var(--glow-color), 0 8px 32px rgba(0,0,0,0.25); }
                50%       { box-shadow: 0 0 44px var(--glow-color), 0 0 90px var(--glow-color), 0 8px 32px rgba(0,0,0,0.25); }
            }
            @keyframes sustainedGlow {
                0%, 100% { box-shadow: 0 0 28px var(--glow-color), 0 0 70px var(--glow-color), 0 8px 32px rgba(0,0,0,0.25); }
                50%       { box-shadow: 0 0 70px var(--glow-color), 0 0 140px var(--glow-color), 0 0 220px var(--glow-color), 0 8px 32px rgba(0,0,0,0.25); }
            }
            @keyframes badgePop {
                0%   { opacity: 0; transform: scale(0.35) translateY(10px); }
                70%  { transform: scale(1.12); }
                100% { opacity: 1; transform: scale(1) translateY(0); }
            }
            @keyframes textFadeUp {
                0%   { opacity: 0; transform: translateY(10px); }
                100% { opacity: 1; transform: translateY(0); }
            }
            @keyframes expandRing {
                0%   { transform: scale(1); opacity: 0.8; }
                100% { transform: scale(2.6); opacity: 0; }
            }
            @keyframes chestGlow {
                0%, 100% { filter: drop-shadow(0 0 6px rgba(99,102,241,0.4)); }
                50%       { filter: drop-shadow(0 0 20px rgba(99,102,241,0.9)); }
            }
            @keyframes chestBuildup {
                0%   { filter: drop-shadow(0 0 4px rgba(99,102,241,0.3)) brightness(1); }
                100% { filter: drop-shadow(0 0 36px rgba(168,85,247,1)) brightness(1.45); }
            }
            @keyframes screenFlash {
                0%   { opacity: 0; }
                12%  { opacity: 0.92; }
                100% { opacity: 0; }
            }
            @keyframes screenShake {
                0%, 100% { transform: translate(0,0); }
                8%  { transform: translate(-8px, -5px); }
                16% { transform: translate(8px, 5px); }
                24% { transform: translate(-6px, 7px); }
                32% { transform: translate(6px, -7px); }
                40% { transform: translate(-8px, -3px); }
                48% { transform: translate(8px, 3px); }
                56% { transform: translate(-4px, 5px); }
                64% { transform: translate(4px, -5px); }
                72% { transform: translate(-3px, 2px); }
                80% { transform: translate(3px, -2px); }
                88% { transform: translate(-1px, 1px); }
            }
            @keyframes confettiFall {
                0%   { transform: translateY(-30px) rotate(0deg); opacity: 1; }
                100% { transform: translateY(110vh) rotate(720deg); opacity: 0.3; }
            }
            @keyframes muteBtnPulse {
                0%,100% { transform: scale(1); }
                50%     { transform: scale(1.12); }
            }
        `}</style>
    );
}

// ─── Config ──────────────────────────────────────────────────────────────────
const CHEST_CONFIG = {
    masterWorkChests: {
        label: 'Baú do Mestre Artesão',
        description: 'Garante raridade épica ou superior',
        openingEmoji: '✨',
        cardEmoji: '🏆',
        gradient: 'from-amber-400 to-orange-500',
        selectedBorder: 'border-amber-500',
        selectedBg: 'bg-amber-50',
        selectedText: 'text-amber-700',
        badgeBg: 'bg-amber-100 text-amber-700',
        ringColor: 'rgba(245,158,11,0.7)',
    },
    hextechChests: {
        label: 'Baú Hextech',
        description: 'Qualquer raridade possível',
        openingEmoji: '📦',
        cardEmoji: '📦',
        gradient: 'from-indigo-500 to-purple-600',
        selectedBorder: 'border-indigo-500',
        selectedBg: 'bg-indigo-50',
        selectedText: 'text-indigo-700',
        badgeBg: 'bg-indigo-100 text-indigo-700',
        ringColor: 'rgba(99,102,241,0.7)',
    },
};

const RARITY_STYLES = {
    kNoRarity:      { label: 'Sem raridade',  ring: 'ring-gray-300',    text: 'text-gray-600',    glow: null },
    kLegacy:        { label: 'Legado',        ring: 'ring-amber-700',   text: 'text-amber-700',   glow: 'rgba(180,83,9,0.65)' },
    legacy:         { label: 'Legado',        ring: 'ring-amber-700',   text: 'text-amber-700',   glow: 'rgba(180,83,9,0.65)' },
    kEpic:          { label: 'Épica',         ring: 'ring-purple-500',  text: 'text-purple-600',  glow: 'rgba(168,85,247,0.72)' },
    epic:           { label: 'Épica',         ring: 'ring-purple-500',  text: 'text-purple-600',  glow: 'rgba(168,85,247,0.72)' },
    kLegendary:     { label: 'Lendária',      ring: 'ring-orange-500',  text: 'text-orange-600',  glow: 'rgba(249,115,22,0.78)' },
    legendary:      { label: 'Lendária',      ring: 'ring-orange-500',  text: 'text-orange-600',  glow: 'rgba(249,115,22,0.78)' },
    kMythic:        { label: 'Mítica',        ring: 'ring-rose-500',    text: 'text-rose-600',    glow: 'rgba(244,63,94,0.82)' },
    mythic:         { label: 'Mítica',        ring: 'ring-rose-500',    text: 'text-rose-600',    glow: 'rgba(244,63,94,0.82)' },
    kUltimate:      { label: 'Ultimate',      ring: 'ring-cyan-400',    text: 'text-cyan-600',    glow: 'rgba(6,182,212,0.82)' },
    ultimate:       { label: 'Ultimate',      ring: 'ring-cyan-400',    text: 'text-cyan-600',    glow: 'rgba(6,182,212,0.82)' },
    kTranscendent:  { label: 'Transcendente', ring: 'ring-fuchsia-400', text: 'text-fuchsia-600', glow: 'rgba(232,121,249,0.9)' },
    transcendent:   { label: 'Transcendente', ring: 'ring-fuchsia-400', text: 'text-fuchsia-600', glow: 'rgba(232,121,249,0.9)' },
};

const RARITY_PARTICLE_COLORS = {
    kEpic:         ['#a855f7', '#c084fc', '#ddd6fe'],
    epic:          ['#a855f7', '#c084fc', '#ddd6fe'],
    kLegendary:    ['#f97316', '#fb923c', '#fde68a'],
    legendary:     ['#f97316', '#fb923c', '#fde68a'],
    kMythic:       ['#f43f5e', '#fb7185', '#fecdd3'],
    mythic:        ['#f43f5e', '#fb7185', '#fecdd3'],
    kUltimate:     ['#06b6d4', '#67e8f9', '#a5f3fc'],
    ultimate:      ['#06b6d4', '#67e8f9', '#a5f3fc'],
    kTranscendent: ['#e879f9', '#f0abfc', '#f9a8d4', '#c026d3'],
    transcendent:  ['#e879f9', '#f0abfc', '#f9a8d4', '#c026d3'],
};

// Tier rank used for triggering tiered visual effects (mythic+, ultimate+, etc.)
const RARITY_TIER = {
    kNoRarity: 0, kLegacy: 0, legacy: 0,
    kEpic: 1, epic: 1,
    kLegendary: 2, legendary: 2,
    kMythic: 3, mythic: 3,
    kUltimate: 4, ultimate: 4,
    kTranscendent: 5, transcendent: 5,
};

// Screen-flash color per rarity tier
// common = white, epic = gold, legendary = purple, mythic+ = rainbow
const RARITY_FLASH = {
    kNoRarity:      { type: 'solid', color: 'rgba(255,255,255,0.92)' },
    kLegacy:        { type: 'solid', color: 'rgba(255,243,199,0.92)' },
    legacy:         { type: 'solid', color: 'rgba(255,243,199,0.92)' },
    kEpic:          { type: 'solid', color: 'rgba(255,215,0,0.9)' },
    epic:           { type: 'solid', color: 'rgba(255,215,0,0.9)' },
    kLegendary:     { type: 'solid', color: 'rgba(168,85,247,0.9)' },
    legendary:      { type: 'solid', color: 'rgba(168,85,247,0.9)' },
    kMythic:        { type: 'rainbow' },
    mythic:         { type: 'rainbow' },
    kUltimate:      { type: 'rainbow' },
    ultimate:       { type: 'rainbow' },
    kTranscendent:  { type: 'rainbow' },
    transcendent:   { type: 'rainbow' },
};

function getRarityStyle(rarity) {
    return RARITY_STYLES[rarity] || RARITY_STYLES.kNoRarity;
}

function getRarityTier(rarity) {
    return RARITY_TIER[rarity] || 0;
}

function getRarityFlash(rarity) {
    return RARITY_FLASH[rarity] || RARITY_FLASH.kNoRarity;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function getSkinSplashUrl(skin) {
    if (!skin?.championName || skin?.skinId == null) return null;
    const skinNumber = skin.skinId.toString().slice(-3).replace(/^0+/, '');
    return `https://ddragon.leagueoflegends.com/cdn/img/champion/centered/${skin.championName}_${skinNumber}.jpg`;
}

function preloadImage(url, timeoutMs = 6000) {
    return new Promise((resolve) => {
        if (!url) { resolve(false); return; }
        const img = new Image();
        let settled = false;
        const finish = (ok) => { if (settled) return; settled = true; clearTimeout(timer); resolve(ok); };
        const timer = setTimeout(() => finish(false), timeoutMs);
        img.onload = () => finish(true);
        img.onerror = () => finish(false);
        img.src = url;
    });
}

async function readErrorMessage(response, fallback) {
    try {
        const contentType = response.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
            const body = await response.json();
            return body.error || body.message || fallback;
        }
    } catch { /* fall through */ }
    return fallback;
}

async function fetchCsrfToken(baseUrl) {
    const response = await fetch(`${baseUrl}expapi/v1/csrf-token`, { credentials: 'include' });
    if (!response.ok) throw new Error('Não foi possível iniciar a sessão de segurança. Tente novamente.');
    const data = await response.json();
    return data.csrfToken;
}

// ─── Sound Effects (Web Audio API, no external files) ────────────────────────
// A small self-contained Web Audio synth. All sound is generated procedurally.
function useSoundEffects() {
    const audioCtxRef = useRef(null);
    const rumbleNodesRef = useRef(null);
    const [muted, setMuted] = useState(() => {
        try {
            return typeof localStorage !== 'undefined' && localStorage.getItem('lumina_chest_muted') === '1';
        } catch { return false; }
    });
    const mutedRef = useRef(muted);
    useEffect(() => { mutedRef.current = muted; }, [muted]);

    const toggleMute = useCallback(() => {
        setMuted((prev) => {
            const next = !prev;
            try { localStorage.setItem('lumina_chest_muted', next ? '1' : '0'); } catch { /* noop */ }
            return next;
        });
    }, []);

    // Lazily create / resume the AudioContext. Must be called from a user gesture.
    const getCtx = useCallback(() => {
        if (typeof window === 'undefined') return null;
        const Ctx = window.AudioContext || window.webkitAudioContext;
        if (!Ctx) return null;
        if (!audioCtxRef.current) {
            try { audioCtxRef.current = new Ctx(); }
            catch { return null; }
        }
        const ctx = audioCtxRef.current;
        if (ctx.state === 'suspended') {
            ctx.resume().catch(() => { /* autoplay blocked */ });
        }
        return ctx;
    }, []);

    // Generic envelope-driven tone
    const playTone = useCallback((freq, duration, type = 'sine', startTime = 0, volume = 0.08) => {
        if (mutedRef.current) return;
        const ctx = getCtx();
        if (!ctx) return;
        const t0 = ctx.currentTime + startTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, t0);
        gain.gain.setValueAtTime(0.0001, t0);
        gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, volume), t0 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
        osc.connect(gain).connect(ctx.destination);
        osc.start(t0);
        osc.stop(t0 + duration + 0.05);
    }, [getCtx]);

    // Low rumble during the shake phase
    const startRumble = useCallback(() => {
        if (mutedRef.current) return;
        const ctx = getCtx();
        if (!ctx) return;
        // stop any existing rumble first
        if (rumbleNodesRef.current) {
            try {
                rumbleNodesRef.current.osc1.stop();
                rumbleNodesRef.current.osc2.stop();
            } catch { /* noop */ }
            rumbleNodesRef.current = null;
        }
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const lfo = ctx.createOscillator();
        const lfoGain = ctx.createGain();
        const gain = ctx.createGain();
        const filter = ctx.createBiquadFilter();
        osc1.type = 'sawtooth';
        osc1.frequency.value = 55;
        osc2.type = 'sine';
        osc2.frequency.value = 32;
        lfo.type = 'sine';
        lfo.frequency.value = 6;
        lfoGain.gain.value = 12; // vibrato depth
        lfo.connect(lfoGain).connect(osc1.frequency);
        filter.type = 'lowpass';
        filter.frequency.value = 240;
        filter.Q.value = 0.7;
        gain.gain.setValueAtTime(0.0001, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.06, ctx.currentTime + 0.15);
        osc1.connect(filter);
        osc2.connect(filter);
        filter.connect(gain).connect(ctx.destination);
        osc1.start();
        osc2.start();
        lfo.start();
        rumbleNodesRef.current = { osc1, osc2, lfo, gain };
    }, [getCtx]);

    const stopRumble = useCallback(() => {
        const nodes = rumbleNodesRef.current;
        const ctx = audioCtxRef.current;
        if (!nodes) return;
        try {
            if (ctx) {
                nodes.gain.gain.cancelScheduledValues(ctx.currentTime);
                nodes.gain.gain.setValueAtTime(Math.max(0.0001, nodes.gain.gain.value), ctx.currentTime);
                nodes.gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.08);
                nodes.osc1.stop(ctx.currentTime + 0.1);
                nodes.osc2.stop(ctx.currentTime + 0.1);
                nodes.lfo.stop(ctx.currentTime + 0.1);
            }
        } catch { /* noop */ }
        rumbleNodesRef.current = null;
    }, []);

    // Whoosh (filtered noise) + impact (low boom) when chest opens
    const playWhooshImpact = useCallback(() => {
        if (mutedRef.current) return;
        const ctx = getCtx();
        if (!ctx) return;
        // --- Whoosh: filtered white noise swept down ---
        const bufferSize = Math.floor(ctx.sampleRate * 0.32);
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            // fade-out envelope so noise doesn't click
            const env = 1 - i / bufferSize;
            data[i] = (Math.random() * 2 - 1) * env;
        }
        const noise = ctx.createBufferSource();
        noise.buffer = buffer;
        const noiseFilter = ctx.createBiquadFilter();
        noiseFilter.type = 'bandpass';
        noiseFilter.frequency.setValueAtTime(1800, ctx.currentTime);
        noiseFilter.frequency.exponentialRampToValueAtTime(220, ctx.currentTime + 0.3);
        noiseFilter.Q.value = 1.8;
        const noiseGain = ctx.createGain();
        noiseGain.gain.setValueAtTime(0.10, ctx.currentTime);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
        noise.connect(noiseFilter).connect(noiseGain).connect(ctx.destination);
        noise.start();

        // --- Impact: low boom ---
        const t0 = ctx.currentTime + 0.08;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(140, t0);
        osc.frequency.exponentialRampToValueAtTime(42, t0 + 0.22);
        gain.gain.setValueAtTime(0.15, t0);
        gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.3);
        osc.connect(gain).connect(ctx.destination);
        osc.start(t0);
        osc.stop(t0 + 0.35);
    }, [getCtx]);

    // Simple "ding" for common / legacy / no-rarity
    const playDing = useCallback(() => {
        if (mutedRef.current) return;
        playTone(880, 0.45, 'sine', 0, 0.25);
        playTone(1318.5, 0.35, 'sine', 0.02, 0.14);
        playTone(1760, 0.25, 'sine', 0.04, 0.07);
    }, [playTone]);

    // Ascending arpeggio
    const playArpeggio = useCallback((freqs, noteDuration = 0.12, type = 'triangle', vol = 0.22) => {
        if (mutedRef.current) return;
        freqs.forEach((f, i) => {
            playTone(f, noteDuration * 1.6, type, i * noteDuration, vol);
        });
    }, [playTone]);

    // Epic fanfare — melody + chord (extended adds more notes / longer tail)
    const playFanfare = useCallback((extended = false) => {
        if (mutedRef.current) return;
        const melody = extended
            ? [
                { f: 392.00, t: 0.00, d: 0.22 }, // G4
                { f: 523.25, t: 0.16, d: 0.22 }, // C5
                { f: 659.25, t: 0.32, d: 0.22 }, // E5
                { f: 783.99, t: 0.48, d: 0.28 }, // G5
                { f: 1046.50, t: 0.70, d: 0.55 }, // C6
                { f: 1318.51, t: 1.05, d: 0.45 }, // E6
              ]
            : [
                { f: 523.25, t: 0.00, d: 0.22 }, // C5
                { f: 659.25, t: 0.12, d: 0.22 }, // E5
                { f: 783.99, t: 0.24, d: 0.32 }, // G5
                { f: 1046.50, t: 0.42, d: 0.45 }, // C6
              ];
        melody.forEach((n) => playTone(n.f, n.d, 'triangle', n.t, 0.22));
        // Sustained chord under the melody
        const chordT = extended ? 0.6 : 0.4;
        const chordD = extended ? 1.1 : 0.8;
        playTone(261.63, chordD, 'sawtooth', chordT, 0.08); // C4
        playTone(329.63, chordD, 'sawtooth', chordT, 0.08); // E4
        playTone(392.00, chordD, 'sawtooth', chordT, 0.08); // G4
        // Cymbal-like noise splash on the climax
        if (extended) {
            const ctx = getCtx();
            if (!ctx) return;
            const t0 = ctx.currentTime + 0.7;
            const bufferSize = Math.floor(ctx.sampleRate * 0.4);
            const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
            const d = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
            const noise = ctx.createBufferSource();
            noise.buffer = buffer;
            const hp = ctx.createBiquadFilter();
            hp.type = 'highpass';
            hp.frequency.value = 5000;
            const g = ctx.createGain();
            g.gain.setValueAtTime(0.05, t0);
            g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.4);
            noise.connect(hp).connect(g).connect(ctx.destination);
            noise.start(t0);
        }
    }, [getCtx, playTone]);

    // Full orchestral hit for transcendent — layered sawtooth chord + low boom + cymbal + fanfare
    const playOrchestralHit = useCallback(() => {
        if (mutedRef.current) return;
        const ctx = getCtx();
        if (!ctx) return;
        // Low brass-like sustained chord
        [110.00, 130.81, 164.81, 220.00].forEach((f) => {
            playTone(f, 1.4, 'sawtooth', 0, 0.14);
        });
        // High shimmer (adds sparkle)
        playTone(1046.50, 1.6, 'sine', 0.08, 0.1);
        playTone(1567.98, 1.4, 'sine', 0.14, 0.07);
        playTone(2093.00, 1.0, 'sine', 0.2, 0.05);
        // Sub-boom drum hit
        const t0 = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(90, t0);
        osc.frequency.exponentialRampToValueAtTime(30, t0 + 0.5);
        gain.gain.setValueAtTime(0.18, t0);
        gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.6);
        osc.connect(gain).connect(ctx.destination);
        osc.start(t0);
        osc.stop(t0 + 0.65);
        // Cymbal crash
        const bufferSize = Math.floor(ctx.sampleRate * 0.6);
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const d = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
        const noise = ctx.createBufferSource();
        noise.buffer = buffer;
        const hp = ctx.createBiquadFilter();
        hp.type = 'highpass';
        hp.frequency.value = 4000;
        const ng = ctx.createGain();
        ng.gain.setValueAtTime(0.07, t0);
        ng.gain.exponentialRampToValueAtTime(0.001, t0 + 0.6);
        noise.connect(hp).connect(ng).connect(ctx.destination);
        noise.start(t0);
        // Then the extended fanfare on top, slightly delayed for impact
        setTimeout(() => playFanfare(true), 220);
    }, [getCtx, playFanfare, playTone]);

    // Dispatch the rarity-appropriate sound
    const playRaritySound = useCallback((rarity) => {
        if (mutedRef.current) return;
        const tier = getRarityTier(rarity);
        if (tier >= 5) {
            // kTranscendent
            playOrchestralHit();
        } else if (tier >= 4) {
            // kUltimate
            playFanfare(true);
        } else if (tier >= 3) {
            // kMythic
            playFanfare(false);
        } else if (tier >= 2) {
            // kLegendary — 5-note ascending arpeggio
            playArpeggio([523.25, 659.25, 783.99, 1046.50, 1318.51], 0.1, 'triangle', 0.22);
        } else if (tier >= 1) {
            // kEpic — 3-note ascending arpeggio
            playArpeggio([523.25, 659.25, 783.99], 0.13, 'triangle', 0.22);
        } else {
            // kLegacy / kNoRarity — soft ding
            playDing();
        }
    }, [playArpeggio, playDing, playFanfare, playOrchestralHit]);

    // Cleanup audio on unmount
    useEffect(() => {
        return () => {
            stopRumble();
            const ctx = audioCtxRef.current;
            if (ctx) {
                try { ctx.close(); } catch { /* noop */ }
                audioCtxRef.current = null;
            }
        };
    }, [stopRumble]);

    return {
        muted,
        toggleMute,
        getCtx,
        startRumble,
        stopRumble,
        playWhooshImpact,
        playDing,
        playArpeggio,
        playFanfare,
        playOrchestralHit,
        playRaritySound,
    };
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function OpenChestModal({
    isOpen,
    onClose,
    isLoggedIn,
    discordError,
    loginWithDiscord,
    onSkinObtained,
}) {
    const sound = useSoundEffects();

    const [inventory, setInventory] = useState(null);
    const [inventoryLoading, setInventoryLoading] = useState(false);
    const [inventoryError, setInventoryError] = useState(null);

    const [selectedChest, setSelectedChest] = useState('masterWorkChests');
    const [rolling, setRolling] = useState(false);
    // null | 'shaking' | 'flashing'
    const [openPhase, setOpenPhase] = useState(null);
    const [rollError, setRollError] = useState(null);
    const [result, setResult] = useState(null);

    // Visual reveal effects
    const [screenFlash, setScreenFlash] = useState(null); // { id, config }
    const [screenShake, setScreenShake] = useState(false);
    const [showConfetti, setShowConfetti] = useState(false);

    const fetchInventory = useCallback(async () => {
        setInventoryLoading(true);
        setInventoryError(null);
        try {
            const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || '/'}expapi/v1/myinventory`, {
                credentials: 'include',
            });
            if (!response.ok) {
                const message = await readErrorMessage(response, 'Não foi possível carregar seu inventário');
                throw new Error(message);
            }
            const data = await response.json();
            setInventory(data);
        } catch (err) {
            setInventoryError(err.message);
        } finally {
            setInventoryLoading(false);
        }
    }, []);

    useEffect(() => {
        if (isOpen && isLoggedIn && !discordError) {
            setResult(null);
            setRollError(null);
            setOpenPhase(null);
            setScreenFlash(null);
            setScreenShake(false);
            setShowConfetti(false);
            fetchInventory();
        } else if (!isOpen) {
            // Safety: stop any lingering audio when modal closes
            sound.stopRumble();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, isLoggedIn, discordError, fetchInventory]);

    // Sound: react to openPhase changes
    useEffect(() => {
        if (openPhase === 'shaking') {
            sound.startRumble();
            return () => sound.stopRumble();
        }
        if (openPhase === 'flashing') {
            sound.stopRumble();
            sound.playWhooshImpact();
        }
        return undefined;
    }, [openPhase]); // eslint-disable-line react-hooks/exhaustive-deps

    // When a new result lands, fire rarity-tier visuals + sound
    useEffect(() => {
        if (!result) return undefined;
        const tier = getRarityTier(result.rarity);
        // 1. Rarity sound
        sound.playRaritySound(result.rarity);
        // 2. Screen flash (color depends on rarity tier)
        const flashCfg = getRarityFlash(result.rarity);
        const flashId = Date.now();
        setScreenFlash({ id: flashId, config: flashCfg });
        // Clear the flash after the animation finishes
        const t1 = setTimeout(() => setScreenFlash(null), 700);
        // 3. Confetti + screen shake for ultimate+ (and transcendent)
        let t2;
        if (tier >= 4) {
            setShowConfetti(true);
            setScreenShake(true);
            t2 = setTimeout(() => {
                setScreenShake(false);
                // keep confetti flying for a bit longer
            }, 650);
        }
        return () => {
            clearTimeout(t1);
            if (t2) clearTimeout(t2);
        };
    }, [result]); // eslint-disable-line react-hooks/exhaustive-deps

    // Clear confetti a few seconds after the result appears so it doesn't loop forever
    useEffect(() => {
        if (!showConfetti) return undefined;
        const t = setTimeout(() => setShowConfetti(false), 4500);
        return () => clearTimeout(t);
    }, [showConfetti]);

    if (!isOpen) return null;

    const handleRoll = async () => {
        // Unlock audio on this user gesture (autoplay policy)
        sound.getCtx();

        setRolling(true);
        setOpenPhase('shaking');
        setRollError(null);

        const baseUrl = import.meta.env.VITE_API_BASE_URL || '/';
        const animStart = Date.now();
        const MIN_SHAKE_MS = 1500;
        const FLASH_MS = 400;

        let rollData = null;
        let rollErr = null;

        try {
            const csrfToken = await fetchCsrfToken(baseUrl);
            const response = await fetch(`${baseUrl}expapi/v1/rollskin`, {
                method: 'POST',
                headers: { 'X-CSRF-Token': csrfToken, 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ chestType: selectedChest }),
            })

            if (!response.ok) {
                const message = await readErrorMessage(
                    response,
                    'Não foi possível abrir o baú. Verifique se você tem chaves e baús suficientes.'
                );
                throw new Error(message);
            }

            // Verifica que a resposta é JSON antes de fazer parse
            const contentType = response.headers.get('content-type') || '';
            if (!contentType.includes('application/json')) {
                throw new Error('Resposta inválida do servidor. Tente novamente.');
            }
            const skin = await response.json();
            const splashUrl = getSkinSplashUrl(skin);
            const imageLoaded = await preloadImage(splashUrl);
            rollData = { ...skin, _imageLoaded: imageLoaded };
        } catch (err) {
            rollErr = err.message;
        }

        // Sempre aguarda a duração mínima do shake para não cortar a animação
        const elapsed = Date.now() - animStart;
        const remaining = Math.max(0, MIN_SHAKE_MS - elapsed);
        await new Promise((r) => setTimeout(r, remaining));

        if (rollErr) {
            sound.stopRumble();
            setRollError(rollErr);
            setOpenPhase(null);
            setRolling(false);
            fetchInventory();
            return;
        }

        // Flash antes do reveal
        setOpenPhase('flashing');
        await new Promise((r) => setTimeout(r, FLASH_MS));

        // Atualiza contadores locais sem novo fetch
        setInventory((prev) =>
            prev && {
                ...prev,
                keys: Math.max(0, prev.keys - 1),
                [selectedChest]: Math.max(0, prev[selectedChest] - 1),
            }
        );

        setResult(rollData);
        setOpenPhase(null);
        setRolling(false);
        onSkinObtained?.(rollData);
    };

    const handleClose = () => {
        // Impede fechar durante a animação para não quebrar o estado
        if (rolling) return;
        sound.stopRumble();
        setResult(null);
        setRollError(null);
        setOpenPhase(null);
        setScreenFlash(null);
        setScreenShake(false);
        setShowConfetti(false);
        onClose();
    };

    const canRoll = inventory && inventory.keys > 0 && inventory[selectedChest] > 0 && !rolling;

    return (
        <>
            <AnimationStyles />

            {/* Screen flash overlay (above everything else) */}
            {screenFlash && <ScreenFlashOverlay key={screenFlash.id} config={screenFlash.config} />}

            {/* Confetti (CSS only) for ultimate+ */}
            {showConfetti && <Confetti />}

            <div
                className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                onClick={handleClose}
                style={screenShake ? { animation: 'screenShake 0.65s ease-out' } : undefined}
            >
                <div
                    className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header do modal */}
                    <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-5 flex items-center justify-between">
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <span className="text-2xl">🗝️</span>
                            Abrir baú
                        </h2>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={sound.toggleMute}
                                className="text-white/85 hover:text-white transition-colors w-9 h-9 flex items-center justify-center rounded-md hover:bg-white/10"
                                aria-label={sound.muted ? 'Ativar som' : 'Silenciar'}
                                title={sound.muted ? 'Ativar som' : 'Silenciar'}
                            >
                                {sound.muted ? (
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15zM17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                                    </svg>
                                ) : (
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072M17.95 6.05a8 8 0 010 11.9M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                                    </svg>
                                )}
                            </button>
                            <button
                                onClick={handleClose}
                                disabled={rolling}
                                className="text-white/80 hover:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed w-9 h-9 flex items-center justify-center rounded-md hover:bg-white/10"
                                aria-label="Fechar"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                    </div>

                    <div className="p-6">
                        {!isLoggedIn ? (
                            <EmptyState
                                emoji="🔒"
                                title="Faça login para continuar"
                                description="Você precisa estar logado no dashboard para abrir baús."
                            />
                        ) : discordError ? (
                            <EmptyState
                                emoji="🔗"
                                title="Conecte sua conta Discord"
                                description="Abrir baús exige que sua conta esteja vinculada ao Discord, já que seu inventário de skins vive lá."
                                action={
                                    <button
                                        onClick={loginWithDiscord}
                                        className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
                                    >
                                        Conectar Discord
                                    </button>
                                }
                            />
                        ) : openPhase ? (
                            <ChestOpeningView chestType={selectedChest} phase={openPhase} />
                        ) : result ? (
                            <ResultView
                                skin={result}
                                onRollAgain={() => {
                                    setResult(null);
                                    setRollError(null);
                                    setScreenFlash(null);
                                    setScreenShake(false);
                                    setShowConfetti(false);
                                }}
                            />
                        ) : (
                            <ChestSelectionView
                                inventory={inventory}
                                inventoryLoading={inventoryLoading}
                                inventoryError={inventoryError}
                                selectedChest={selectedChest}
                                setSelectedChest={setSelectedChest}
                                rolling={rolling}
                                rollError={rollError}
                                canRoll={canRoll}
                                onRoll={handleRoll}
                                onRetryInventory={fetchInventory}
                            />
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}

// ─── EmptyState ───────────────────────────────────────────────────────────────
function EmptyState({ emoji, title, description, action }) {
    return (
        <div className="text-center py-8">
            <div className="text-5xl mb-4">{emoji}</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
            <p className="text-gray-600 mb-6 max-w-sm mx-auto">{description}</p>
            {action}
        </div>
    );
}

// ─── ChestOpeningView ─────────────────────────────────────────────────────────
function ChestOpeningView({ chestType, phase }) {
    const cfg = CHEST_CONFIG[chestType] || CHEST_CONFIG.hextechChests;
    const isFlashing = phase === 'flashing';

    return (
        <div className="relative flex flex-col items-center justify-center py-14 overflow-hidden min-h-[230px]">
            {/* Anéis pulsantes */}
            {!isFlashing && [0, 0.45, 0.9].map((delay, i) => (
                <div
                    key={i}
                    className="absolute w-20 h-20 rounded-full border-2 border-indigo-400/20"
                    style={{ animation: `pulseRing 1.45s ease-out ${delay}s infinite` }}
                />
            ))}

            {/* Ícone do baú */}
            <div
                className="text-7xl select-none z-10"
                style={{
                    animation: !isFlashing
                        ? `chestShake 0.22s ease-in-out infinite, chestBuildup 1.5s ease-in forwards`
                        : undefined,
                    transform: isFlashing ? 'scale(1.5)' : undefined,
                    filter: isFlashing ? 'brightness(4)' : undefined,
                    transition: isFlashing
                        ? 'transform 0.25s ease-out, filter 0.25s ease-out'
                        : undefined,
                }}
            >
                {cfg.openingEmoji}
            </div>

            {/* Label */}
            {!isFlashing && (
                <p
                    className="mt-7 text-sm font-medium text-gray-400 z-10 tracking-wide"
                    style={{ animation: 'textFadeUp 0.3s ease-out' }}
                >
                    Abrindo {cfg.label}…
                </p>
            )}

            {/* Overlay de flash */}
            <div
                className="absolute inset-0 bg-white pointer-events-none rounded-xl transition-opacity duration-300"
                style={{ opacity: isFlashing ? 1 : 0 }}
            />
        </div>
    );
}

// ─── ChestSelectionView ───────────────────────────────────────────────────────
function ChestSelectionView({
    inventory,
    inventoryLoading,
    inventoryError,
    selectedChest,
    setSelectedChest,
    rolling,
    rollError,
    canRoll,
    onRoll,
    onRetryInventory,
}) {
    if (inventoryLoading) {
        return (
            <div className="flex flex-col items-center py-10">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mb-3" />
                <span className="text-gray-600">Carregando seu inventário…</span>
            </div>
        );
    }

    if (inventoryError) {
        return (
            <EmptyState
                emoji="⚠️"
                title="Erro ao carregar inventário"
                description={inventoryError}
                action={
                    <button
                        onClick={onRetryInventory}
                        className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
                    >
                        Tentar novamente
                    </button>
                }
            />
        );
    }

    if (!inventory) return null;

    return (
        <>
            {/* Saldo de chaves */}
            <div className="flex items-center justify-center gap-2 mb-5 px-4 py-3 bg-indigo-50 rounded-xl border border-indigo-100">
                <span className="text-xl">🔑</span>
                <span className="font-bold text-indigo-700 text-lg tabular-nums">{inventory.keys}</span>
                <span className="text-sm text-indigo-500">
                    chave{inventory.keys !== 1 ? 's' : ''} disponível{inventory.keys !== 1 ? 'is' : ''}
                </span>
            </div>

            {/* Cards dos baús */}
            <div className="grid grid-cols-2 gap-3 mb-5">
                {Object.entries(CHEST_CONFIG).map(([key, cfg]) => {
                    const amount = inventory[key] || 0;
                    const isSelected = selectedChest === key;
                    const isEmpty = amount === 0;

                    return (
                        <button
                            key={key}
                            disabled={rolling || isEmpty}
                            onClick={() => setSelectedChest(key)}
                            className={`
                                relative flex flex-col items-center p-4 rounded-xl border-2 transition-all duration-150 text-center select-none
                                ${isSelected
                                    ? `${cfg.selectedBorder} ${cfg.selectedBg} shadow-md`
                                    : isEmpty
                                        ? 'border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed'
                                        : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm cursor-pointer'
                                }
                                ${rolling ? 'pointer-events-none' : ''}
                            `}
                        >
                            {/* Círculo gradiente com ícone */}
                            <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${cfg.gradient} flex items-center justify-center mb-2.5 shadow`}>
                                <span className="text-2xl">{cfg.cardEmoji}</span>
                            </div>

                            <p className={`text-sm font-bold leading-tight mb-1 ${isSelected ? cfg.selectedText : 'text-gray-800'}`}>
                                {cfg.label}
                            </p>
                            <p className="text-xs text-gray-400 leading-snug mb-2.5">
                                {cfg.description}
                            </p>

                            {/* Badge de quantidade */}
                            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                                isSelected ? `bg-white ${cfg.selectedText}` :
                                isEmpty ? 'bg-gray-200 text-gray-400' :
                                cfg.badgeBg
                            }`}>
                                {amount} disponíve{amount !== 1 ? 'is' : 'l'}
                            </span>

                            {/* Check de seleção */}
                            {isSelected && (
                                <div className={`absolute top-2.5 right-2.5 ${cfg.selectedText}`}>
                                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                </div>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Erro de roll */}
            {rollError && (
                <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
                    {rollError}
                </div>
            )}

            {!canRoll && !rolling && inventory && (
                <p className="text-center text-sm text-gray-400 mb-4">
                    {inventory.keys === 0
                        ? 'Você não tem chaves suficientes.'
                        : 'Você não tem esse baú disponível.'}
                </p>
            )}

            <button
                onClick={onRoll}
                disabled={!canRoll}
                className={`w-full py-3.5 rounded-xl font-bold text-white text-base transition-all duration-200 ${
                    canRoll
                        ? 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0'
                        : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
            >
                🗝️ Abrir baú
            </button>
        </>
    );
}

// ─── ParticleBurst ────────────────────────────────────────────────────────────
function ParticleBurst({ rarity }) {
    const colors = RARITY_PARTICLE_COLORS[rarity];
    if (!colors) return null;

    const count =
        ['kTranscendent', 'transcendent'].includes(rarity) ? 26 :
        ['kUltimate', 'ultimate'].includes(rarity) ? 22 :
        ['kMythic', 'mythic'].includes(rarity) ? 18 :
        ['kLegendary', 'legendary'].includes(rarity) ? 13 : 9;

    const particles = Array.from({ length: count }, (_, i) => {
        const angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
        const dist = 55 + Math.random() * 50;
        return {
            tx: `${Math.cos(angle) * dist}px`,
            ty: `${Math.sin(angle) * dist}px`,
            color: colors[i % colors.length],
            size: 5 + Math.random() * 7,
            delay: Math.random() * 0.28,
            duration: 0.55 + Math.random() * 0.3,
        };
    });

    return (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden rounded-xl">
            {particles.map((p, i) => (
                <div
                    key={i}
                    style={{
                        position: 'absolute',
                        width: `${p.size}px`,
                        height: `${p.size}px`,
                        borderRadius: '50%',
                        backgroundColor: p.color,
                        '--tx': p.tx,
                        '--ty': p.ty,
                        animation: `particleFly ${p.duration}s ease-out ${p.delay}s forwards`,
                    }}
                />
            ))}
        </div>
    );
}

// ─── ScreenFlashOverlay ───────────────────────────────────────────────────────
// Full-screen colored flash on top of everything when the chest is revealed.
function ScreenFlashOverlay({ config }) {
    const background =
        config.type === 'rainbow'
            ? 'linear-gradient(115deg, #ff0080 0%, #ff8c00 14%, #ffd700 28%, #00ff7f 42%, #00bfff 57%, #8a2be2 75%, #ff0080 100%)'
            : config.color;

    return (
        <div
            className="fixed inset-0 pointer-events-none z-[70]"
            style={{
                background,
                animation: 'screenFlash 0.7s ease-out forwards',
            }}
        />
    );
}

// ─── Confetti (CSS only, no external libs) ────────────────────────────────────
function Confetti() {
    const colors = ['#f43f5e', '#fb923c', '#facc15', '#22c55e', '#06b6d4', '#a855f7', '#ec4899', '#38bdf8'];
    // Pre-compute once — confetti is purely decorative.
    const pieces = Array.from({ length: 90 }, (_, i) => {
        const left = Math.random() * 100;
        const delay = Math.random() * 0.6;
        const duration = 2.2 + Math.random() * 1.8;
        const size = 6 + Math.random() * 8;
        const color = colors[i % colors.length];
        const rotation = Math.random() * 360;
        const isRound = Math.random() > 0.6;
        return { left, delay, duration, size, color, rotation, isRound, key: i };
    });

    return (
        <div className="fixed inset-0 pointer-events-none z-[65] overflow-hidden">
            {pieces.map((p) => (
                <div
                    key={p.key}
                    style={{
                        position: 'absolute',
                        left: `${p.left}%`,
                        top: '-30px',
                        width: `${p.size}px`,
                        height: `${p.size * (p.isRound ? 1 : 1.6)}px`,
                        backgroundColor: p.color,
                        borderRadius: p.isRound ? '50%' : '2px',
                        transform: `rotate(${p.rotation}deg)`,
                        animation: `confettiFall ${p.duration}s linear ${p.delay}s forwards`,
                    }}
                />
            ))}
        </div>
    );
}

// ─── ResultView ───────────────────────────────────────────────────────────────
function ResultView({ skin, onRollAgain }) {
    const style = getRarityStyle(skin.rarity);
    const tier = getRarityTier(skin.rarity);
    const splashUrl = getSkinSplashUrl(skin);
    const showImage = skin._imageLoaded && splashUrl;
    const hasParticles = !!RARITY_PARTICLE_COLORS[skin.rarity];
    const hasShine = ['kLegendary', 'legendary', 'kMythic', 'mythic', 'kUltimate', 'ultimate', 'kTranscendent', 'transcendent'].includes(skin.rarity);

    // Transcendent uses the more intense "sustainedGlow" keyframe; everything else uses rarityGlow.
    const glowAnimation = style.glow
        ? (tier >= 5
            ? 'sustainedGlow 2.4s ease-in-out 0.7s infinite'
            : 'rarityGlow 2.8s ease-in-out 0.7s infinite')
        : '';

    const revealAnimation = `cardReveal 0.55s cubic-bezier(0.34,1.56,0.64,1) forwards${glowAnimation ? ', ' + glowAnimation : ''}`;

    return (
        <div className="text-center py-2" style={{ animation: 'textFadeUp 0.25s ease-out' }}>
            {/* Wrapper relativo para anéis de expansão (fora do overflow-hidden do card) */}
            <div className="relative mx-auto mb-5 w-full max-w-[250px] aspect-[3/4]">
                {/* Anéis de expansão após reveal — ficam fora do card */}
                {hasParticles && (
                    <>
                        <div
                            className={`absolute inset-0 rounded-xl ring-4 ${style.ring} pointer-events-none`}
                            style={{ animation: 'expandRing 0.55s ease-out 0.05s forwards' }}
                        />
                        <div
                            className={`absolute inset-0 rounded-xl ring-2 ${style.ring} pointer-events-none opacity-60`}
                            style={{ animation: 'expandRing 0.7s ease-out 0.2s forwards' }}
                        />
                    </>
                )}

                {/* Card da skin */}
                <div
                    className={`absolute inset-0 rounded-xl overflow-hidden ring-4 ${style.ring} shadow-2xl`}
                    style={{
                        animation: revealAnimation,
                        '--glow-color': style.glow || 'transparent',
                    }}
                >
                    {/* Partículas */}
                    {hasParticles && <ParticleBurst rarity={skin.rarity} />}

                    {/* Imagem ou placeholder */}
                    {showImage ? (
                        <img
                            src={splashUrl}
                            alt={skin.skinName}
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 text-6xl">
                            🎨
                        </div>
                    )}

                    {/* Shine sweep para lendária+ */}
                    {hasShine && (
                        <div className="absolute inset-0 pointer-events-none overflow-hidden">
                            <div
                                className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-white/38 to-transparent"
                                style={{ animation: 'shimmerSweep 1.1s ease-out 0.45s both' }}
                            />
                        </div>
                    )}

                    {/* Gradiente inferior + badge de raridade */}
                    <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/88 via-black/30 to-transparent p-3">
                        <div
                            className={`text-xs font-bold uppercase tracking-widest ${style.text} bg-white/95 inline-block px-2.5 py-1 rounded-md`}
                            style={{ animation: 'badgePop 0.45s cubic-bezier(0.34,1.56,0.64,1) 0.38s both' }}
                        >
                            {style.label}
                        </div>
                    </div>
                </div>
            </div>

            {/* Nome e campeão */}
            <div style={{ animation: 'textFadeUp 0.4s ease-out 0.28s both' }}>
                <h3 className="text-xl font-bold text-gray-900 mb-1">{skin.skinName}</h3>
                <p className="text-sm text-gray-500 mb-6">{skin.championName}</p>
            </div>

            {/* Botão de abrir outro */}
            <div style={{ animation: 'textFadeUp 0.4s ease-out 0.48s both' }}>
                <button
                    onClick={onRollAgain}
                    className="inline-flex items-center gap-2 px-6 py-3 text-sm font-bold rounded-xl text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0"
                >
                    🗝️ Abrir outro baú
                </button>
            </div>
        </div>
    );
}
