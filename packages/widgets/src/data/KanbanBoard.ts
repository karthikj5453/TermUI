// ─────────────────────────────────────────────────────
// @termuijs/widgets — KanbanBoard widget (multi-column task board)
// ─────────────────────────────────────────────────────

import { type Screen, type Style, type Color, type KeyEvent, styleToCellAttrs, stringWidth, caps } from '@termuijs/core';
import { Widget } from '../base/Widget.js';

export interface KanbanCard {
    id: string;
    title: string;
    description?: string;
    tags?: string[];
}

export interface KanbanColumn {
    id: string;
    title: string;
    cards: KanbanCard[];
    color?: Color;
}

export interface KanbanBoardOptions {
    /** Initial columns in the board */
    columns?: KanbanColumn[];
    /** Initial focused column index */
    focusedColumnIndex?: number;
    /** Initial focused card index within focused column */
    focusedCardIndex?: number;
    /** Show card counts in column headers (default: true) */
    showCardCount?: boolean;
    /** Color for active/focused column and selected card indicator */
    activeColor?: Color;
    /** Card selection callback triggered on Enter/Space */
    onSelect?: (card: KanbanCard, column: KanbanColumn) => void;
    /** Card move callback triggered when a card moves columns */
    onCardMove?: (card: KanbanCard, fromColumn: KanbanColumn, toColumn: KanbanColumn) => void;
}

/**
 * KanbanBoard — a multi-column task/card board with interactive keyboard navigation,
 * column switching, card movement, and configurable color themes.
 */
export class KanbanBoard extends Widget {
    private _columns: KanbanColumn[] = [];
    private _focusedColumnIndex: number = 0;
    private _focusedCardIndex: number = 0;
    private _showCardCount: boolean;
    private _activeColor: Color;
    private _onSelect?: (card: KanbanCard, column: KanbanColumn) => void;
    private _onCardMove?: (card: KanbanCard, fromColumn: KanbanColumn, toColumn: KanbanColumn) => void;

    constructor(style: Partial<Style> = {}, opts: KanbanBoardOptions = {}) {
        super(style);
        this._columns = opts.columns ? opts.columns.map((c) => ({ ...c, cards: [...c.cards] })) : [];
        this._focusedColumnIndex = opts.focusedColumnIndex ?? 0;
        this._focusedCardIndex = opts.focusedCardIndex ?? 0;
        this._showCardCount = opts.showCardCount ?? true;
        this._activeColor = opts.activeColor ?? { type: 'named', name: 'cyan' };
        this._onSelect = opts.onSelect;
        this._onCardMove = opts.onCardMove;
        this._clampFocus();
    }

    /** Returns all columns in the board */
    getColumns(): KanbanColumn[] {
        return this._columns;
    }

    /** Replaces board columns and clamps focus */
    setColumns(columns: KanbanColumn[]): void {
        this._columns = columns.map((c) => ({ ...c, cards: [...c.cards] }));
        this._clampFocus();
        this.markDirty();
    }

    /** Adds a new column to the board */
    addColumn(column: KanbanColumn): void {
        this._columns.push({ ...column, cards: [...column.cards] });
        this._clampFocus();
        this.markDirty();
    }

    /** Removes a column by ID */
    removeColumn(columnId: string): void {
        const index = this._columns.findIndex((c) => c.id === columnId);
        if (index !== -1) {
            this._columns.splice(index, 1);
            this._clampFocus();
            this.markDirty();
        }
    }

    /** Adds a card to a specific column */
    addCard(columnId: string, card: KanbanCard, index?: number): void {
        const col = this._columns.find((c) => c.id === columnId);
        if (col) {
            if (index !== undefined && index >= 0 && index <= col.cards.length) {
                col.cards.splice(index, 0, card);
            } else {
                col.cards.push(card);
            }
            this._clampFocus();
            this.markDirty();
        }
    }

    /** Removes a card by ID from whichever column contains it */
    removeCard(cardId: string): void {
        for (const col of this._columns) {
            const index = col.cards.findIndex((c) => c.id === cardId);
            if (index !== -1) {
                col.cards.splice(index, 1);
                this._clampFocus();
                this.markDirty();
                return;
            }
        }
    }

    /** Moves a card from its current column to a target column */
    moveCard(cardId: string, targetColumnId: string, targetIndex?: number): void {
        let sourceCol: KanbanColumn | undefined;
        let cardIndex = -1;

        for (const col of this._columns) {
            const idx = col.cards.findIndex((c) => c.id === cardId);
            if (idx !== -1) {
                sourceCol = col;
                cardIndex = idx;
                break;
            }
        }

        if (!sourceCol || cardIndex === -1) return;

        const targetCol = this._columns.find((c) => c.id === targetColumnId);
        if (!targetCol) return;

        const [card] = sourceCol.cards.splice(cardIndex, 1);

        if (targetIndex !== undefined && targetIndex >= 0 && targetIndex <= targetCol.cards.length) {
            targetCol.cards.splice(targetIndex, 0, card);
        } else {
            targetCol.cards.push(card);
        }

        if (this._onCardMove) {
            this._onCardMove(card, sourceCol, targetCol);
        }

        this._clampFocus();
        this.markDirty();
    }

    /** Get focused column index */
    getFocusedColumnIndex(): number {
        return this._focusedColumnIndex;
    }

    /** Get focused card index */
    getFocusedCardIndex(): number {
        return this._focusedCardIndex;
    }

    /** Set focused column index */
    setFocusedColumn(index: number): void {
        this._focusedColumnIndex = index;
        this._clampFocus();
        this.markDirty();
    }

    /** Set focused card index */
    setFocusedCard(index: number): void {
        this._focusedCardIndex = index;
        this._clampFocus();
        this.markDirty();
    }

    /** Get currently selected/focused column object */
    getSelectedColumn(): KanbanColumn | undefined {
        return this._columns[this._focusedColumnIndex];
    }

    /** Get currently selected/focused card object */
    getSelectedCard(): KanbanCard | undefined {
        const col = this.getSelectedColumn();
        if (!col || col.cards.length === 0) return undefined;
        return col.cards[this._focusedCardIndex];
    }

    /** Handle keyboard navigation and interaction */
    handleKey(event: KeyEvent): void {
        const key = event.key.toLowerCase();

        // Moving card between columns (Shift + Left/Right or Shift + H/L)
        const isShift = Boolean(event.shift);
        if (isShift && (key === 'left' || key === 'arrowleft' || key === 'h')) {
            this._moveFocusedCardHorizontally(-1);
            return;
        }
        if (isShift && (key === 'right' || key === 'arrowright' || key === 'l')) {
            this._moveFocusedCardHorizontally(1);
            return;
        }

        switch (key) {
            case 'left':
            case 'arrowleft':
            case 'h':
                if (this._focusedColumnIndex > 0) {
                    this._focusedColumnIndex--;
                    this._focusedCardIndex = 0;
                    this._clampFocus();
                    this.markDirty();
                }
                break;

            case 'right':
            case 'arrowright':
            case 'l':
                if (this._focusedColumnIndex < this._columns.length - 1) {
                    this._focusedColumnIndex++;
                    this._focusedCardIndex = 0;
                    this._clampFocus();
                    this.markDirty();
                }
                break;

            case 'up':
            case 'arrowup':
            case 'k':
                if (this._focusedCardIndex > 0) {
                    this._focusedCardIndex--;
                    this.markDirty();
                }
                break;

            case 'down':
            case 'arrowdown':
            case 'j': {
                const currentCol = this.getSelectedColumn();
                if (currentCol && this._focusedCardIndex < currentCol.cards.length - 1) {
                    this._focusedCardIndex++;
                    this.markDirty();
                }
                break;
            }

            case 'enter':
            case ' ':
            case 'space': {
                const card = this.getSelectedCard();
                const col = this.getSelectedColumn();
                if (card && col && this._onSelect) {
                    this._onSelect(card, col);
                }
                break;
            }
        }
    }

    private _moveFocusedCardHorizontally(delta: number): void {
        const card = this.getSelectedCard();
        const col = this.getSelectedColumn();
        if (!card || !col) return;

        const targetColIndex = this._focusedColumnIndex + delta;
        if (targetColIndex < 0 || targetColIndex >= this._columns.length) return;

        const targetCol = this._columns[targetColIndex];
        this.moveCard(card.id, targetCol.id);
        this._focusedColumnIndex = targetColIndex;
        this._focusedCardIndex = targetCol.cards.length - 1;
        this._clampFocus();
        this.markDirty();
    }

    private _clampFocus(): void {
        if (this._columns.length === 0) {
            this._focusedColumnIndex = 0;
            this._focusedCardIndex = 0;
            return;
        }

        if (this._focusedColumnIndex < 0) {
            this._focusedColumnIndex = 0;
        } else if (this._focusedColumnIndex >= this._columns.length) {
            this._focusedColumnIndex = this._columns.length - 1;
        }

        const currentCol = this._columns[this._focusedColumnIndex];
        if (!currentCol || currentCol.cards.length === 0) {
            this._focusedCardIndex = 0;
        } else if (this._focusedCardIndex < 0) {
            this._focusedCardIndex = 0;
        } else if (this._focusedCardIndex >= currentCol.cards.length) {
            this._focusedCardIndex = currentCol.cards.length - 1;
        }
    }

    protected _renderSelf(screen: Screen): void {
        const rect = this._getContentRect();
        const { x, y, width, height } = rect;
        if (width <= 0 || height <= 0 || this._columns.length === 0) return;

        const attrs = styleToCellAttrs(this._style);
        const numCols = this._columns.length;
        const colWidth = Math.max(1, Math.floor(width / numCols));

        const borderChar = caps.unicode ? '│' : '|';
        const hLineChar = caps.unicode ? '─' : '-';
        const focusPointer = caps.unicode ? '▶ ' : '> ';

        for (let i = 0; i < numCols; i++) {
            const col = this._columns[i];
            const isFocusedCol = i === this._focusedColumnIndex;
            const colX = x + i * colWidth;
            const currentActualWidth = i === numCols - 1 ? width - i * colWidth : colWidth;

            if (currentActualWidth <= 0) continue;

            // Header text
            const countStr = this._showCardCount ? ` (${col.cards.length})` : '';
            const titleText = `${col.title}${countStr}`;
            const headerStr = titleText.length > currentActualWidth - 1
                ? titleText.substring(0, currentActualWidth - 1)
                : titleText;

            const headerStyle = {
                ...attrs,
                bold: isFocusedCol,
                fg: isFocusedCol ? this._activeColor : col.color ?? attrs.fg,
            };

            // Render Header
            screen.writeString(colX, y, headerStr, headerStyle);

            // Render horizontal separator line under header
            if (height > 1) {
                const sepLen = Math.max(0, currentActualWidth - 1);
                for (let k = 0; k < sepLen; k++) {
                    screen.setCell(colX + k, y + 1, {
                        char: hLineChar,
                        fg: isFocusedCol ? this._activeColor : attrs.fg,
                    });
                }
            }

            // Render vertical column separator (between columns)
            if (i < numCols - 1 && currentActualWidth > 1) {
                const sepX = colX + currentActualWidth - 1;
                for (let row = 0; row < height; row++) {
                    screen.setCell(sepX, y + row, {
                        char: borderChar,
                        fg: attrs.fg,
                    });
                }
            }

            // Render Cards in column
            let currentY = y + 2;
            const usableWidth = Math.max(1, currentActualWidth - (i < numCols - 1 ? 1 : 0));

            for (let j = 0; j < col.cards.length; j++) {
                if (currentY >= y + height) break;

                const card = col.cards[j];
                const isFocusedCard = isFocusedCol && j === this._focusedCardIndex;

                const prefix = isFocusedCard ? focusPointer : '  ';
                const prefixWidth = stringWidth(prefix);
                const titleWidth = Math.max(0, usableWidth - prefixWidth);

                const cardTitle = card.title.length > titleWidth
                    ? card.title.substring(0, titleWidth)
                    : card.title;

                const cardStyle = {
                    ...attrs,
                    bold: isFocusedCard,
                    fg: isFocusedCard ? this._activeColor : attrs.fg,
                };

                // Card title line
                screen.writeString(colX, currentY, prefix + cardTitle, cardStyle);
                currentY++;

                // Optional description
                if (card.description && currentY < y + height) {
                    const descIndent = '    ';
                    const maxDescWidth = Math.max(0, usableWidth - descIndent.length);
                    const descStr = card.description.length > maxDescWidth
                        ? card.description.substring(0, maxDescWidth)
                        : card.description;

                    screen.writeString(colX, currentY, descIndent + descStr, {
                        ...attrs,
                        dim: true,
                    });
                    currentY++;
                }

                // Optional tags
                if (card.tags && card.tags.length > 0 && currentY < y + height) {
                    const tagIndent = '    ';
                    const tagText = card.tags.map((t) => `[${t}]`).join(' ');
                    const maxTagWidth = Math.max(0, usableWidth - tagIndent.length);
                    const tagStr = tagText.length > maxTagWidth
                        ? tagText.substring(0, maxTagWidth)
                        : tagText;

                    screen.writeString(colX, currentY, tagIndent + tagStr, {
                        ...attrs,
                        fg: { type: 'named', name: 'blue' },
                    });
                    currentY++;
                }

                // Empty spacing row after card if room allows
                currentY++;
            }
        }
    }
}
