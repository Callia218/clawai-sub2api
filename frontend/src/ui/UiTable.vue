<template>
  <div class="ui-table-wrap">
    <table class="ui-table">
      <thead>
        <tr>
          <th
            v-for="col in columns"
            :key="col.key"
            :style="{ width: col.width, textAlign: col.align || 'left' }"
          >
            {{ col.label }}
          </th>
        </tr>
      </thead>
      <tbody>
        <template v-if="loading">
          <tr v-for="n in skeletonRows" :key="`sk-${n}`" class="ui-table__sk-row">
            <td v-for="col in columns" :key="col.key">
              <span class="ui-table__sk" />
            </td>
          </tr>
        </template>

        <tr v-else-if="!rows.length">
          <td :colspan="columns.length" class="ui-table__empty">
            <slot name="empty">
              <div class="ui-table__empty-inner">{{ emptyText }}</div>
            </slot>
          </td>
        </tr>

        <template v-else>
          <tr v-for="(row, i) in rows" :key="rowKey(row, i)" class="ui-table__row">
            <td
              v-for="col in columns"
              :key="col.key"
              :style="{ textAlign: col.align || 'left' }"
              :class="{ 'ui-table__cell--mono': col.mono }"
            >
              <slot :name="`cell-${col.key}`" :row="row" :value="row[col.key]" :index="i">
                {{ row[col.key] ?? '—' }}
              </slot>
            </td>
          </tr>
        </template>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
export type UiTableColumn = {
  key: string
  label: string
  width?: string
  align?: 'left' | 'center' | 'right'
  mono?: boolean
}

const props = withDefaults(
  defineProps<{
    columns: UiTableColumn[]
    rows: Record<string, unknown>[]
    loading?: boolean
    emptyText?: string
    rowKeyField?: string
    skeletonRows?: number
  }>(),
  {
    loading: false,
    emptyText: '暂无数据',
    rowKeyField: 'id',
    skeletonRows: 4,
  }
)

function rowKey(row: Record<string, unknown>, i: number): string | number {
  const v = row[props.rowKeyField]
  return typeof v === 'string' || typeof v === 'number' ? v : i
}
</script>

<style scoped>
.ui-table-wrap {
  width: 100%;
  overflow-x: auto;
  scrollbar-width: thin;
}

.ui-table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  font-family: var(--ui-font);
  font-size: var(--ui-fs-sm);
}

.ui-table thead th {
  position: sticky;
  top: 0;
  z-index: 1;
  padding: 10px var(--ui-s-3);
  font-size: var(--ui-fs-2xs);
  font-weight: 620;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--ui-text-faint);
  white-space: nowrap;
  background-color: rgb(var(--ui-glass-soft-rgb) / calc(var(--ui-glass-soft-alpha) + 0.04));
  -webkit-backdrop-filter: blur(10px);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid var(--ui-line);
}

.ui-table tbody td {
  padding: 12px var(--ui-s-3);
  color: var(--ui-text-soft);
  border-bottom: 1px solid var(--ui-line-soft);
  vertical-align: middle;
}

.ui-table__row {
  transition: background-color var(--ui-dur-fast) var(--ui-ease-out);
}

.ui-table__row:hover td {
  background-color: rgb(var(--ui-glass-soft-rgb) / calc(var(--ui-glass-soft-alpha) + 0.06));
}

.ui-table__cell--mono {
  font-family: var(--ui-font-mono);
  font-variant-numeric: tabular-nums;
  font-size: var(--ui-fs-xs);
}

.ui-table__empty {
  padding: var(--ui-s-10) var(--ui-s-4) !important;
  text-align: center;
}

.ui-table__empty-inner {
  font-size: var(--ui-fs-sm);
  color: var(--ui-text-faint);
}

.ui-table__sk {
  display: block;
  height: 12px;
  width: 100%;
  border-radius: var(--ui-r-xs);
  background-color: rgb(var(--ui-glass-soft-rgb) / calc(var(--ui-glass-soft-alpha) + 0.08));
  animation: ui-table-pulse 1.4s var(--ui-ease-in-out) infinite;
}

@keyframes ui-table-pulse {
  0%,
  100% {
    opacity: 0.45;
  }
  50% {
    opacity: 0.95;
  }
}
</style>
