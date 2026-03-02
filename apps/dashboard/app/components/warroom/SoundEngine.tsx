'use client';

import { useEffect, useRef, useCallback } from 'react';
import type { AuditEvent, PaymentArc } from '../../lib/warroom-types';

interface Props {
    events: AuditEvent[];
    arcs: PaymentArc[];
}

/**
 * SoundEngine — Procedural Web Audio API sound effects
 * No audio files needed. All sounds are synthesized.
 */
export default function SoundEngine({ events, arcs }: Props) {
    const audioCtxRef = useRef<AudioContext | null>(null);
    const prevEventCountRef = useRef(0);
    const prevArcCountRef = useRef(0);
    const isInitRef = useRef(false);

    // Initialize AudioContext on mount (user has already opted in via button)
    const initAudio = useCallback(() => {
        if (isInitRef.current) return;
        try {
            audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
            isInitRef.current = true;
        } catch (err) {
            console.log('Web Audio not available');
        }
    }, []);

    // Play a simple tone
    const playTone = useCallback((frequency: number, duration: number, volume: number = 0.05, type: OscillatorType = 'sine') => {
        const ctx = audioCtxRef.current;
        if (!ctx) return;

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(frequency, ctx.currentTime);
        gain.gain.setValueAtTime(volume, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + duration);
    }, []);

    // Transaction ping — high-pitched short beep
    const playTransactionPing = useCallback(() => {
        playTone(800 + Math.random() * 400, 0.1, 0.03);
    }, [playTone]);

    // Alert sound — two-tone descending
    const playAlertSound = useCallback(() => {
        playTone(600, 0.15, 0.04);
        setTimeout(() => playTone(400, 0.2, 0.04), 150);
    }, [playTone]);

    // Ambient hum (starts once and loops)
    useEffect(() => {
        initAudio();
        const ctx = audioCtxRef.current;
        if (!ctx) return;

        // Low ambient drone
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(40, ctx.currentTime);
        gain.gain.setValueAtTime(0.008, ctx.currentTime);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();

        return () => {
            try {
                osc.stop();
                osc.disconnect();
                gain.disconnect();
            } catch (e) {
                // Ignore
            }
        };
    }, [initAudio]);

    // React to new events
    useEffect(() => {
        if (!isInitRef.current) return;

        if (events.length > prevEventCountRef.current && prevEventCountRef.current > 0) {
            const newEvents = events.slice(0, events.length - prevEventCountRef.current);
            for (const event of newEvents) {
                if (event.severity === 'ERROR' || event.severity === 'WARNING') {
                    playAlertSound();
                } else {
                    playTransactionPing();
                }
            }
        }
        prevEventCountRef.current = events.length;
    }, [events, playAlertSound, playTransactionPing]);

    // React to new arcs
    useEffect(() => {
        if (!isInitRef.current) return;

        if (arcs.length > prevArcCountRef.current && prevArcCountRef.current > 0) {
            playTransactionPing();
        }
        prevArcCountRef.current = arcs.length;
    }, [arcs, playTransactionPing]);

    return null; // Invisible component
}
