// ─────────────────────────────────────────────────────
// @termuijs/widgets — Tests for KanbanBoard widget
// ─────────────────────────────────────────────────────

import { describe, it, expect, vi, afterEach } from 'vitest';

afterEach(() => {
    vi.unstubAllEnvs();
});

describe('KanbanBoard', () => {
    const sampleColumns = [
        {
            id: 'todo',
            title: 'To Do',
            cards: [
                { id: '1', title: 'Task 1', description: 'First task', tags: ['dev'] },
                { id: '2', title: 'Task 2' },
            ],
        },
        {
            id: 'in-progress',
            title: 'In Progress',
            cards: [{ id: '3', title: 'Task 3' }],
        },
        {
            id: 'done',
            title: 'Done',
            cards: [],
        },
    ];

    it('initializes with columns and default focus', async () => {
        const { KanbanBoard } = await import('./KanbanBoard.js');
        const board = new KanbanBoard({}, { columns: sampleColumns });

        expect(board.getColumns().length).toBe(3);
        expect(board.getFocusedColumnIndex()).toBe(0);
        expect(board.getFocusedCardIndex()).toBe(0);
        expect(board.getSelectedColumn()?.id).toBe('todo');
        expect(board.getSelectedCard()?.id).toBe('1');
    });

    it('clamps focus bounds correctly', async () => {
        const { KanbanBoard } = await import('./KanbanBoard.js');
        const board = new KanbanBoard({}, { columns: sampleColumns });

        board.setFocusedColumn(10);
        expect(board.getFocusedColumnIndex()).toBe(2);

        board.setFocusedColumn(-5);
        expect(board.getFocusedColumnIndex()).toBe(0);

        board.setFocusedCard(50);
        expect(board.getFocusedCardIndex()).toBe(1);
    });

    it('adds and removes columns', async () => {
        const { KanbanBoard } = await import('./KanbanBoard.js');
        const board = new KanbanBoard({}, { columns: sampleColumns });

        board.addColumn({ id: 'archived', title: 'Archived', cards: [] });
        expect(board.getColumns().length).toBe(4);

        board.removeColumn('archived');
        expect(board.getColumns().length).toBe(3);
    });

    it('adds, moves, and removes cards programmatically', async () => {
        const { KanbanBoard } = await import('./KanbanBoard.js');
        const onMove = vi.fn();
        const board = new KanbanBoard({}, { columns: sampleColumns, onCardMove: onMove });

        board.addCard('done', { id: '4', title: 'Task 4' });
        expect(board.getColumns()[2].cards.length).toBe(1);

        board.moveCard('1', 'in-progress');
        expect(board.getColumns()[0].cards.length).toBe(1);
        expect(board.getColumns()[1].cards.length).toBe(2);
        expect(onMove).toHaveBeenCalled();

        board.removeCard('4');
        expect(board.getColumns()[2].cards.length).toBe(0);
    });

    it('handles keyboard navigation with arrow keys and hjkl', async () => {
        const { KanbanBoard } = await import('./KanbanBoard.js');
        const board = new KanbanBoard({}, { columns: sampleColumns });

        // Navigate down in column 0
        board.handleKey({ key: 'down' });
        expect(board.getFocusedCardIndex()).toBe(1);

        // Navigate up in column 0
        board.handleKey({ key: 'up' });
        expect(board.getFocusedCardIndex()).toBe(0);

        // Navigate right to column 1
        board.handleKey({ key: 'right' });
        expect(board.getFocusedColumnIndex()).toBe(1);
        expect(board.getFocusedCardIndex()).toBe(0);

        // Navigate left with 'h'
        board.handleKey({ key: 'h' });
        expect(board.getFocusedColumnIndex()).toBe(0);

        // Navigate down with 'j'
        board.handleKey({ key: 'j' });
        expect(board.getFocusedCardIndex()).toBe(1);

        // Navigate up with 'k'
        board.handleKey({ key: 'k' });
        expect(board.getFocusedCardIndex()).toBe(0);

        // Navigate right with 'l'
        board.handleKey({ key: 'l' });
        expect(board.getFocusedColumnIndex()).toBe(1);
    });

    it('moves cards across columns via Shift+Right / Shift+Left', async () => {
        const { KanbanBoard } = await import('./KanbanBoard.js');
        const board = new KanbanBoard({}, { columns: sampleColumns });

        expect(board.getSelectedCard()?.id).toBe('1');

        // Move card '1' from column 0 to column 1
        board.handleKey({ key: 'right', shift: true } as any);
        expect(board.getFocusedColumnIndex()).toBe(1);
        expect(board.getSelectedCard()?.id).toBe('1');
        expect(board.getColumns()[0].cards.length).toBe(1);
        expect(board.getColumns()[1].cards.length).toBe(2);

        // Move card '1' back from column 1 to column 0 using Shift+H
        board.handleKey({ key: 'h', shift: true } as any);
        expect(board.getFocusedColumnIndex()).toBe(0);
        expect(board.getSelectedCard()?.id).toBe('1');
    });

    it('triggers onSelect callback on Enter / Space', async () => {
        const { KanbanBoard } = await import('./KanbanBoard.js');
        const onSelect = vi.fn();
        const board = new KanbanBoard({}, { columns: sampleColumns, onSelect });

        board.handleKey({ key: 'enter' });
        expect(onSelect).toHaveBeenCalledTimes(1);
        expect(onSelect).toHaveBeenCalledWith(
            expect.objectContaining({ id: '1', title: 'Task 1' }),
            expect.objectContaining({ id: 'todo', title: 'To Do' })
        );

        board.handleKey({ key: 'space' });
        expect(onSelect).toHaveBeenCalledTimes(2);
    });

    it('renders on Screen buffer with unicode header & cards', async () => {
        vi.stubEnv('NO_UNICODE', '');
        vi.stubEnv('TERM', 'xterm-256color');
        vi.resetModules();
        const { Screen } = await import('@termuijs/core');
        const { KanbanBoard } = await import('./KanbanBoard.js');

        const board = new KanbanBoard({}, { columns: sampleColumns });
        board.updateRect({ x: 0, y: 0, width: 60, height: 10 });
        const screen = new Screen(60, 10);
        board.render(screen);

        const row0 = screen.back[0].map((c: { char: string }) => c.char).join('');
        expect(row0).toContain('To Do');
        expect(row0).toContain('In Progress');

        const row2 = screen.back[2].map((c: { char: string }) => c.char).join('');
        expect(row2).toContain('Task 1');
    });

    it('uses ASCII chars when NO_UNICODE=1', async () => {
        vi.stubEnv('NO_UNICODE', '1');
        vi.stubEnv('TERM', '');
        vi.resetModules();
        const { Screen } = await import('@termuijs/core');
        const { KanbanBoard } = await import('./KanbanBoard.js');

        const board = new KanbanBoard({}, { columns: sampleColumns });
        board.updateRect({ x: 0, y: 0, width: 60, height: 10 });
        const screen = new Screen(60, 10);
        board.render(screen);

        const row1 = screen.back[1].map((c: { char: string }) => c.char).join('');
        expect(row1).toContain('-');
        expect(row1).not.toContain('─');
    });

    it('marks dirty when mutation methods are called', async () => {
        const { KanbanBoard } = await import('./KanbanBoard.js');
        const board = new KanbanBoard({}, { columns: sampleColumns });
        board.clearDirty();

        board.setFocusedColumn(1);
        expect(board.isDirty).toBe(true);

        board.clearDirty();
        board.addCard('todo', { id: '99', title: 'New Task' });
        expect(board.isDirty).toBe(true);
    });
});
