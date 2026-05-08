// ─────────────────────────────────────────────────────
// @termuijs/widgets — Tests for ProgressBar widget
// ─────────────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ProgressBar } from './ProgressBar.js';

describe('ProgressBar', () => {
    it('initializes with default value 0', () => {
        const pb = new ProgressBar();
        expect(pb.value).toBe(0);
    });

    it('setValue sets progress to 0.5', () => {
        const pb = new ProgressBar();
        pb.setValue(0.5);
        expect(pb.value).toBe(0.5);
    });

    it('setValue(1) sets to 100%', () => {
        const pb = new ProgressBar();
        pb.setValue(1);
        expect(pb.value).toBe(1);
    });

    it('clamps values above 1 to 1', () => {
        const pb = new ProgressBar();
        pb.setValue(1.5);
        expect(pb.value).toBe(1);
    });

    it('clamps values below 0 to 0', () => {
        const pb = new ProgressBar();
        pb.setValue(-0.5);
        expect(pb.value).toBe(0);
    });
});

describe('ProgressBar — ASCII fallback', () => {
    beforeEach(() => {
        vi.unstubAllEnvs();
        vi.resetModules();
    });

    it('uses "#" for fill and " " for empty when NO_UNICODE=1', async () => {
        vi.stubEnv('NO_UNICODE', '1');
        vi.stubEnv('TERM', '');
        vi.resetModules();
        const { ProgressBar } = await import('./ProgressBar.js');
        const pb = new ProgressBar();
        const fillChar = (pb as unknown as { _fillChar: string })._fillChar;
        const emptyChar = (pb as unknown as { _emptyChar: string })._emptyChar;
        expect(fillChar).toBe('#');
        expect(emptyChar).toBe(' ');
    });

    it('uses "█" for fill when unicode is available', async () => {
        vi.stubEnv('NO_UNICODE', '');
        vi.stubEnv('TERM', '');
        vi.resetModules();
        const { ProgressBar } = await import('./ProgressBar.js');
        const pb = new ProgressBar();
        const fillChar = (pb as unknown as { _fillChar: string })._fillChar;
        expect(fillChar).toBe('█');
    });
});
