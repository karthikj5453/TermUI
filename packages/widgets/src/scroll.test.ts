import { describe, it, expect } from "vitest";
import { calculateSpringScroll, ScrollSpringState } from "./scroll.js";

describe("calculateSpringScroll", () => {
    it("remains at rest when position equals target and velocity is zero", () => {
        const current: ScrollSpringState = { position: 10, velocity: 0 };
        const result = calculateSpringScroll(current, 10);
        
        expect(result.position).toBe(10);
        expect(result.velocity).toBe(0);
    });

    it("accelerates towards the target when below it", () => {
        const current: ScrollSpringState = { position: 0, velocity: 0 };
        const result = calculateSpringScroll(current, 100);
        
        // Should move in positive direction
        expect(result.velocity).toBeGreaterThan(0);
        expect(result.position).toBeGreaterThan(0);
    });

    it("accelerates towards the target when above it", () => {
        const current: ScrollSpringState = { position: 100, velocity: 0 };
        const result = calculateSpringScroll(current, 0);
        
        // Should move in negative direction
        expect(result.velocity).toBeLessThan(0);
        expect(result.position).toBeLessThan(100);
    });

    it("dampens velocity when moving fast without displacement force", () => {
        const current: ScrollSpringState = { position: 50, velocity: 100 };
        const result = calculateSpringScroll(current, 50);
        
        // Velocity should be reduced due to damping
        expect(result.velocity).toBeLessThan(100);
        expect(result.velocity).toBeGreaterThan(0);
        // It will slightly overshoot the position since it has velocity
        expect(result.position).toBeGreaterThan(50);
    });

    it("allows custom dt values", () => {
        const current: ScrollSpringState = { position: 0, velocity: 0 };
        const resultNormal = calculateSpringScroll(current, 100, 1/60);
        const resultFast = calculateSpringScroll(current, 100, 1/30);
        
        // Larger dt should result in larger position change
        expect(resultFast.position).toBeGreaterThan(resultNormal.position);
    });
});
