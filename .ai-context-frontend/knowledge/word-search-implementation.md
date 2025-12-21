# ¡A buscar! (Word Search) - Implementación Completa

> **Tipo**: Sopa de letras competitiva  
> **Tecnología**: Vue 3 puro (HTML/CSS Grid) - NO Phaser/Three.js  
> **Bonus Game**: No elimina jugadores, solo genera puntos

---

## 🎯 Mecánica General

**Participantes**: Todos los jugadores vivos  
**Objetivo**: Encontrar 12 palabras escondidas en el menor tiempo posible  
**Grid**: 15×15 letras  
**Palabras**: Supervisor define el tema y palabras  
**Ranking**: Por tiempo (menor = mejor)  
**Puntos**: Normalizado (1 - tiempo/maxTiempo) × 500

---

## 🔠 Generación del Grid (Backend)

### Algoritmo de Colocación

```php
// app/Services/WordSearchGenerator.php

class WordSearchGenerator
{
    private const GRID_SIZE = 15;
    private const DIRECTIONS = [
        'horizontal' => [0, 1],
        'vertical' => [1, 0],
        'diagonal_down' => [1, 1],
        'diagonal_up' => [-1, 1],
        'horizontal_reverse' => [0, -1],
        'vertical_reverse' => [-1, 0],
    ];

    public function generate(array $words): array
    {
        // Initialize empty grid
        $grid = array_fill(0, self::GRID_SIZE, array_fill(0, self::GRID_SIZE, ''));
        $placements = [];

        // Sort words by length (longest first for better placement)
        usort($words, fn($a, $b) => strlen($b) - strlen($a));

        foreach ($words as $word) {
            $word = strtoupper(str_replace(' ', '', $word));
            $placed = false;
            $attempts = 0;
            $maxAttempts = 100;

            while (!$placed && $attempts < $maxAttempts) {
                $direction = array_rand(self::DIRECTIONS);
                [$dr, $dc] = self::DIRECTIONS[$direction];

                // Random starting position
                $row = rand(0, self::GRID_SIZE - 1);
                $col = rand(0, self::GRID_SIZE - 1);

                if ($this->canPlaceWord($grid, $word, $row, $col, $dr, $dc)) {
                    $this->placeWord($grid, $word, $row, $col, $dr, $dc);
                    $placements[] = [
                        'word' => $word,
                        'start' => [$row, $col],
                        'direction' => $direction,
                        'end' => [
                            $row + (strlen($word) - 1) * $dr,
                            $col + (strlen($word) - 1) * $dc
                        ]
                    ];
                    $placed = true;
                }

                $attempts++;
            }

            if (!$placed) {
                throw new \\Exception(\"No se pudo colocar la palabra: {$word}\");
            }
        }

        // Fill empty cells with random letters
        $this->fillEmptyCells($grid);

        return [
            'grid' => $grid,
            'placements' => $placements,
            'seed' => $this->generateSeed($grid)  // For verification
        ];
    }

    private function canPlaceWord(array $grid, string $word, int $row, int $col, int $dr, int $dc): bool
    {
        $len = strlen($word);

        for ($i = 0; $i < $len; $i++) {
            $r = $row + $i * $dr;
            $c = $col + $i * $dc;

            // Out of bounds
            if ($r < 0 || $r >= self::GRID_SIZE || $c < 0 || $c >= self::GRID_SIZE) {
                return false;
            }

            // Cell occupied by different letter
            if ($grid[$r][$c] !== '' && $grid[$r][$c] !== $word[$i]) {
                return false;
            }
        }

        return true;
    }

    private function placeWord(array &$grid, string $word, int $row, int $col, int $dr, int $dc): void
    {
        $len = strlen($word);

        for ($i = 0; $i < $len; $i++) {
            $grid[$row + $i * $dr][$col + $i * $dc] = $word[$i];
        }
    }

    private function fillEmptyCells(array &$grid): void
    {
        for ($r = 0; $r < self::GRID_SIZE; $r++) {
            for ($c = 0; $c < self::GRID_SIZE; $c++) {
                if ($grid[$r][$c] === '') {
                    $grid[$r][$c] = chr(rand(65, 90));  // A-Z
                }
            }
        }
    }

    private function generateSeed(array $grid): string
    {
        return hash('sha256', json_encode($grid));
    }
}
```

### Unique Grid per Player

```php
// app/Actions/Games/WordSearch/AssignGrids.php

public function handle(int $roundId): void
{
    $round = Round::findOrFail($roundId);
    $words = $round->metadata['words'];  // 12 words from supervisor

    $players = Player::where('status', PlayerStatus::ALIVE)->get();

    foreach ($players as $player) {
        // Generate unique grid per player
        $generator = new WordSearchGenerator();
        $result = $generator->generate($words);

        WordSearchGrid::create([
            'round_id' => $roundId,
            'player_id' => $player->id,
            'grid' => $result['grid'],
            'placements' => $result['placements'],
            'seed' => $result['seed'],
            'words' => $words
        ]);
    }

    broadcast(new WordSearchGridsReady($roundId));
}
```

---

## 🖥️ Frontend: Vue Grid Component

### `WordSearchGrid.vue`

````vue
<template>
  <div class=\"word-search-container\">\n    <!-- Words List -->\n    <div class=\"words-list\">\n      <h3>Palabras a encontrar:</h3>\n      <ul>\n        <li\n          v-for=\"word in words\"\n          :key=\"word\"\n          :class=\"{ found: foundWords.includes(word) }\"\n        >\n          {{ word }}\n          <span v-if=\"foundWords.includes(word)\" class=\"checkmark\">✓</span>\n        </li>\n      </ul>\n    </div>\n\n    <!-- Grid -->\n    <div class=\"grid-wrapper\">\n      <div\n        class=\"grid\"\n        :style=\"{ gridTemplateColumns: `repeat(${gridSize}, 1fr)` }\"\n        @mousedown=\"startSelection\"\n        @mousemove=\"updateSelection\"\n        @mouseup=\"endSelection\"\n        @touchstart.prevent=\"startSelection\"\n        @touchmove.prevent=\"updateSelection\"\n        @touchend.prevent=\"endSelection\"\n      >\n        <div\n          v-for=\"(letter, index) in flatGrid\"\n          :key=\"index\"\n          :data-row=\"Math.floor(index / gridSize)\"\n          :data-col=\"index % gridSize\"\n          :class=\"[\n            'cell',\n            {\n              selected: selectedCells.includes(index),\n              found: foundCells.includes(index),\n              highlighting: highlightingCells.includes(index)\n            }\n          ]\"\n        >\n          {{ letter }}\n        </div>\n      </div>\n    </div>\n\n    <!-- Timer -->\n    <div class=\"timer\">\n      <span class=\"time\">{{ formatTime(elapsedTime) }}</span>\n    </div>\n  </div>\n</template>\n\n<script setup lang=\"ts\">\nimport { ref, computed, onMounted, onUnmounted } from 'vue'\nimport { useWordSearchStore } from './word-search.store'\n\nconst wordSearchStore = useWordSearchStore()\n\nconst gridSize = 15\nconst selectedCells = ref<number[]>([])\nconst foundCells = ref<number[]>([])\nconst highlightingCells = ref<number[]>([])\nconst isSelecting = ref(false)\nconst selectionStart = ref<{ row: number; col: number } | null>(null)\nconst elapsedTime = ref(0)\n\nconst grid = computed(() => wordSearchStore.grid)\nconst words = computed(() => wordSearchStore.words)\nconst foundWords = computed(() => wordSearchStore.foundWords)\n\nconst flatGrid = computed(() => grid.value.flat())\n\nlet timerInterval: number | null = null\n\nonMounted(() => {\n  // Start timer\n  timerInterval = setInterval(() => {\n    elapsedTime.value += 100\n  }, 100)\n})\n\nonUnmounted(() => {\n  if (timerInterval) clearInterval(timerInterval)\n})\n\nfunction startSelection(event: MouseEvent | TouchEvent) {\n  isSelecting.value = true\n  selectedCells.value = []\n  \n  const target = event.target as HTMLElement\n  if (!target.classList.contains('cell')) return\n  \n  const row = parseInt(target.dataset.row || '0')\n  const col = parseInt(target.dataset.col || '0')\n  \n  selectionStart.value = { row, col }\n  selectedCells.value = [row * gridSize + col]\n}\n\nfunction updateSelection(event: MouseEvent | TouchEvent) {\n  if (!isSelecting.value || !selectionStart.value) return\n  \n  const target = document.elementFromPoint(\n    event instanceof MouseEvent ? event.clientX : event.touches[0].clientX,\n    event instanceof MouseEvent ? event.clientY : event.touches[0].clientY\n  ) as HTMLElement\n  \n  if (!target || !target.classList.contains('cell')) return\n  \n  const row = parseInt(target.dataset.row || '0')\n  const col = parseInt(target.dataset.col || '0')\n  \n  // Calculate cells between start and current\n  selectedCells.value = getCellsBetween(selectionStart.value, { row, col })\n}\n\nfunction endSelection() {\n  if (!isSelecting.value) return\n  isSelecting.value = false\n  \n  // Check if selection forms a valid word\n  const selectedWord = selectedCells.value\n    .map(index => flatGrid.value[index])\n    .join('')\n  \n  const found = words.value.find(w => \n    w.toUpperCase() === selectedWord || \n    w.toUpperCase() === selectedWord.split('').reverse().join('')\n  )\n  \n  if (found && !foundWords.value.includes(found)) {\n    // Valid word found!\n    foundWords.value.push(found)\n    foundCells.value.push(...selectedCells.value)\n    \n    // Animate\n    highlightingCells.value = [...selectedCells.value]\n    setTimeout(() => {\n      highlightingCells.value = []\n    }, 500)\n    \n    // Send to backend\n    wordSearchStore.submitWord(found, elapsedTime.value)\n    \n    // Check if complete\n    if (foundWords.value.length === words.value.length) {\n      wordSearchStore.complete(elapsedTime.value)\n    }\n  }\n  \n  selectedCells.value = []\n  selectionStart.value = null\n}\n\nfunction getCellsBetween(\n  start: { row: number; col: number },\n  end: { row: number; col: number }\n): number[] {\n  const cells: number[] = []\n  \n  const dr = Math.sign(end.row - start.row)\n  const dc = Math.sign(end.col - start.col)\n  \n  let row = start.row\n  let col = start.col\n  \n  // Only allow straight lines (horizontal, vertical, diagonal)\n  if (dr !== 0 && dc !== 0 && Math.abs(end.row - start.row) !== Math.abs(end.col - start.col)) {\n    return [start.row * gridSize + start.col]\n  }\n  \n  while (true) {\n    cells.push(row * gridSize + col)\n    \n    if (row === end.row && col === end.col) break\n    \n    row += dr\n    col += dc\n  }\n  \n  return cells\n}\n\nfunction formatTime(ms: number): string {\n  const seconds = Math.floor(ms / 1000)\n  const centiseconds = Math.floor((ms % 1000) / 10)\n  return `${seconds}.${centiseconds.toString().padStart(2, '0')}s`\n}\n</script>\n\n<style scoped>\n.word-search-container {\n  @apply flex gap-8 p-6;\n}\n\n.words-list {\n  @apply w-64;\n}\n\n.words-list ul {\n  @apply space-y-2;\n}\n\n.words-list li {\n  @apply flex items-center justify-between p-2 rounded;\n  @apply transition-all duration-300;\n}\n\n.words-list li.found {\n  @apply bg-success text-success-content line-through;\n}\n\n.grid-wrapper {\n  @apply flex-1;\n}\n\n.grid {\n  @apply grid gap-1;\n  user-select: none;\n  touch-action: none;\n}\n\n.cell {\n  @apply aspect-square flex items-center justify-center;\n  @apply bg-base-200 text-lg font-bold rounded cursor-pointer;\n  @apply transition-all duration-150;\n}\n\n.cell:hover {\n  @apply bg-base-300;\n}\n\n.cell.selected {\n  @apply bg-primary text-primary-content;\n}\n\n.cell.found {\n  @apply bg-success text-success-content;\n}\n\n.cell.highlighting {\n  animation: highlight-pulse 0.5s ease-out;\n}\n\n@keyframes highlight-pulse {\n  0%, 100% { transform: scale(1); }\n  50% { transform: scale(1.2); }\n}\n\n.timer {\n  @apply fixed top-4 right-4;\n  @apply text-4xl font-bold;\n}\n</style>\n```\n\n---\n\n## 📡 Backend: Validación y Ranking\n\n### Submit Word\n\n```php\n// app/Actions/Games/WordSearch/SubmitWord.php\n\npublic function handle(Player $player, int $roundId, string $word, int $timeMs): void\n{\n    $playerGrid = WordSearchGrid::where('round_id', $roundId)\n        ->where('player_id', $player->id)\n        ->firstOrFail();\n    \n    // Validate word exists in list\n    if (!in_array(strtoupper($word), array_map('strtoupper', $playerGrid->words))) {\n        throw new \\Exception('Palabra no está en la lista');\n    }\n    \n    // Check not already found\n    $attempt = WordSearchAttempt::where('player_id', $player->id)\n        ->where('round_id', $roundId)\n        ->first();\n    \n    if (!$attempt) {\n        $attempt = WordSearchAttempt::create([\n            'player_id' => $player->id,\n            'round_id' => $roundId,\n            'words_found' => [],\n            'started_at' => now()\n        ]);\n    }\n    \n    $wordsFound = $attempt->words_found;\n    \n    if (in_array(strtoupper($word), array_map('strtoupper', $wordsFound))) {\n        throw new \\Exception('Ya encontraste esa palabra');\n    }\n    \n    $wordsFound[] = $word;\n    $attempt->words_found = $wordsFound;\n    $attempt->save();\n    \n    broadcast(new WordFound($player->id, $word, count($wordsFound)));\n    \n    // Audit\n    AuditService::log(\n        actorId: $player->id,\n        actorType: 'player',\n        action: 'player.word_found',\n        targetType: 'grid',\n        targetId: (string)$playerGrid->id,\n        context: [\n            'word' => $word,\n            'time_ms' => $timeMs,\n            'words_count' => count($wordsFound)\n        ]\n    );\n}\n```\n\n### Complete Game\n\n```php\n// app/Actions/Games/WordSearch/CompleteGame.php\n\npublic function handle(Player $player, int $roundId, int $timeMs): void\n{\n    $attempt = WordSearchAttempt::where('player_id', $player->id)\n        ->where('round_id', $roundId)\n        ->firstOrFail();\n    \n    // Validate all words found\n    $playerGrid = WordSearchGrid::where('player_id', $player->id)\n        ->where('round_id', $roundId)\n        ->first();\n    \n    if (count($attempt->words_found) < count($playerGrid->words)) {\n        throw new \\Exception('No has encontrado todas las palabras');\n    }\n    \n    $attempt->update([\n        'completed_at' => now(),\n        'completion_time_ms' => $timeMs\n    ]);\n    \n    broadcast(new GameCompleted($player->id, $timeMs));\n    \n    // Check achievements\n    AchievementService::check($player->id, 'word_search.complete', [\n        'time_ms' => $timeMs\n    ]);\n}\n```\n\n### Calculate Rankings\n\n```php\n// app/Actions/Games/WordSearch/CalculateRankings.php\n\npublic function handle(int $roundId): void\n{\n    $attempts = WordSearchAttempt::where('round_id', $roundId)\n        ->whereNotNull('completed_at')\n        ->orderBy('completion_time_ms', 'asc')\n        ->get();\n    \n    // Assign ranks\n    $attempts->each(function ($attempt, $index) {\n        $attempt->update(['rank' => $index + 1]);\n    });\n    \n    // Calculate scores (normalize to 0-500)\n    $maxTime = $attempts->max('completion_time_ms');\n    \n    $attempts->each(function ($attempt) use ($maxTime, $roundId) {\n        $score = $maxTime > 0 \n            ? (1 - ($attempt->completion_time_ms / $maxTime)) * 500 \n            : 500;\n        \n        PlayerScore::create([\n            'player_id' => $attempt->player_id,\n            'round_id' => $roundId,\n            'game_id' => 'word_search',\n            'points' => $score,\n            'time_ms' => $attempt->completion_time_ms,\n            'rank' => $attempt->rank\n        ]);\n    });\n    \n    // Update scoreboard\n    ScoreboardService::updateFromWordSearch($roundId);\n    \n    broadcast(new ScoreboardUpdated($roundId));\n}\n```\n\n---\n\n## 🗄️ Datos Guardados\n\n```typescript\ninterface WordSearchGrid {\n  id: number\n  round_id: number\n  player_id: number\n  grid: string[][]          // 15x15\n  placements: Placement[]\n  seed: string              // For verification\n  words: string[]\n  created_at: string\n}\n\ninterface Placement {\n  word: string\n  start: [number, number]\n  end: [number, number]\n  direction: string\n}\n\ninterface WordSearchAttempt {\n  id: number\n  player_id: number\n  round_id: number\n  words_found: string[]\n  started_at: string\n  completed_at: string | null\n  completion_time_ms: number | null\n  rank: number | null\n}\n```\n\n---\n\n## 🏆 Achievements\n\n- `play_both_bonus`: Jugar Word Search + Flappy\n- `word_search_speedster`: Completar < 60s\n- `word_search_win`: Rank 1\n\n---\n\n## 🎨 CSS Effects (Opcionales)\n\n### Particle Effect on Word Found\n\n```typescript\n// word-search.effects.ts\n\nexport function showWordFoundEffect(cells: number[]) {\n  cells.forEach((cellIndex, i) => {\n    setTimeout(() => {\n      const cell = document.querySelector(`[data-index=\"${cellIndex}\"]`)\n      \n      // Create particle\n      const particle = document.createElement('div')\n      particle.className = 'particle'\n      particle.style.left = `${Math.random() * 20 - 10}px`\n      particle.style.top = `${Math.random() * 20 - 10}px`\n      \n      cell?.appendChild(particle)\n      \n      setTimeout(() => particle.remove(), 1000)\n    }, i * 50)\n  })\n}\n```\n\n```css\n.particle {\n  position: absolute;\n  width: 8px;\n  height: 8px;\n  background: gold;\n  border-radius: 50%;\n  pointer-events: none;\n  animation: particle-float 1s ease-out forwards;\n}\n\n@keyframes particle-float {\n  to {\n    transform: translateY(-50px);\n    opacity: 0;\n  }\n}\n```\n\n---\n\n## 📱 Responsive Design\n\n```css\n@media (max-width: 768px) {\n  .word-search-container {\n    flex-direction: column;\n  }\n  \n  .words-list {\n    width: 100%;\n    order: 2;\n  }\n  \n  .grid-wrapper {\n    order: 1;\n  }\n  \n  .cell {\n    font-size: 0.8rem;\n  }\n}\n```\n\n---\n\n**Última actualización**: Diciembre 21, 2025
**Autor**: Word Search - Vue Puro  \n**Tecnología**: HTML/CSS Grid, NO Phaser/Three.js\n
````
