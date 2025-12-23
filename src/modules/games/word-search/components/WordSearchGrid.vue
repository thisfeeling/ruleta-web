<template>
  <div
    class="wordsearch-grid grid gap-0"
    ref="gridEl"
    @pointerdown="onDown"
    @pointermove="onMove"
    @pointerup="onUp"
    @pointerleave="onUp"
  >
    <div
      v-for="(row, r) in grid"
      :key="r"
      class="grid-row"
      role="row"
      style="display: grid; grid-template-columns: repeat(15, 1fr)"
    >
      <div
        v-for="(cell, c) in row"
        :key="c"
        class="cell"
        :data-row="r"
        :data-col="c"
        :class="isSelected(r, c) ? 'selected' : ''"
        role="gridcell"
        :aria-selected="isSelected(r, c)"
      >
        {{ cell }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useWordSearchStore } from '../word-search.store'

const props = defineProps<{ grid: string[][] }>()
const grid = props.grid
const store = useWordSearchStore()

const gridEl = ref<HTMLElement | null>(null)
let selecting = false
let start: { row: number; col: number } | null = null
let selected: { row: number; col: number }[] = []

function cellFromEvent(e: PointerEvent) {
  const el = (e.target as HTMLElement).closest('.cell') as HTMLElement | null
  if (!el) return null
  const row = Number(el.dataset.row)
  const col = Number(el.dataset.col)
  return { row, col }
}

function onDown(e: PointerEvent) {
  const pos = cellFromEvent(e)
  if (!pos) return
  selecting = true
  start = pos
  selected = [pos]
}

function onMove(e: PointerEvent) {
  if (!selecting) return
  const pos = cellFromEvent(e)
  if (!pos) return
  // compute straight line selection from start to pos (Bresenham-like)
  if (!start) return
  selected = lineCells(start.row, start.col, pos.row, pos.col)
}

function onUp() {
  if (!selecting) return
  selecting = false
  // assemble word
  const word = selected
    .map((s) => grid?.[s.row]?.[s.col] ?? '')
    .join('')
    .toLowerCase()
  const found = store.state.words.find((w) => w.toLowerCase() === word)
  if (found && !store.state.foundWords.has(found)) {
    store.markWordFound(found)
  }
  // reset selection
  selected = []
  start = null
}

function isSelected(r: number, c: number) {
  return selected.some((s) => s.row === r && s.col === c)
}

// simple line algorithm that supports straight and diagonal lines
function lineCells(r1: number, c1: number, r2: number, c2: number) {
  const dr = r2 - r1
  const dc = c2 - c1
  const steps = Math.max(Math.abs(dr), Math.abs(dc))
  const cells = [] as { row: number; col: number }[]
  for (let i = 0; i <= steps; i++) {
    const row = Math.round(r1 + (dr * i) / steps)
    const col = Math.round(c1 + (dc * i) / steps)
    cells.push({ row, col })
  }
  return cells
}
</script>

<style scoped>
.wordsearch-grid {
  user-select: none;
}
.cell {
  border: 1px solid rgba(0, 0, 0, 0.04);
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
}
.cell.selected {
  background: rgba(59, 130, 246, 0.2);
}
</style>
