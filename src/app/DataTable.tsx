import { useCollection } from '@cloudscape-design/collection-hooks'
import Box from '@cloudscape-design/components/box'
import Button from '@cloudscape-design/components/button'
import CollectionPreferences, { type CollectionPreferencesProps } from '@cloudscape-design/components/collection-preferences'
import Header from '@cloudscape-design/components/header'
import Pagination from '@cloudscape-design/components/pagination'
import SpaceBetween from '@cloudscape-design/components/space-between'
import Table, { type TableProps } from '@cloudscape-design/components/table'
import TextFilter from '@cloudscape-design/components/text-filter'
import { useState, type ReactNode } from 'react'
import { T } from './strings'

export interface Column<Row> {
  id: string
  header: string
  cell: (item: Row) => ReactNode
  sortingField?: keyof Row & string
  minWidth?: number
  isRowHeader?: boolean
  hiddenByDefault?: boolean
}
interface DataTableProps<Row> {
  title: string
  description?: ReactNode
  items: Row[]
  columns: Column<Row>[]
  trackBy: keyof Row & string
  loading?: boolean
  loadingText?: string
  filterPlaceholder: string
  filterAriaLabel: string
  emptyTitle: string
  emptyText: string
  emptyAction?: ReactNode
  actions?: ReactNode
  selected?: Row | null
  onSelect?: (row: Row | null) => void
  selectionLabel?: (row: Row) => string
  defaultSort?: { field: keyof Row & string; descending?: boolean }
  pageSize?: number
  variant?: TableProps.Variant
}

/** One Cloudscape table with filter, sort, pagination and preferences. */
export function DataTable<Row>(props: DataTableProps<Row>) {
  const { columns, items: allItems } = props
  const [preferences, setPreferences] = useState<CollectionPreferencesProps.Preferences>({
    pageSize: props.pageSize ?? 10,
    wrapLines: false,
    stripedRows: false,
    contentDisplay: columns.map((c) => ({ id: c.id, visible: !c.hiddenByDefault })),
  })
  const defaultColumn = props.defaultSort ? columns.find((c) => c.sortingField === props.defaultSort!.field) : undefined
  const { items, collectionProps, filterProps, paginationProps, filteredItemsCount, actions } = useCollection(allItems, {
    filtering: {
      empty: (
        <Box textAlign="center" color="inherit" padding={{ vertical: 'l' }}>
          <SpaceBetween size="xs">
            <Box variant="strong" color="inherit">{props.emptyTitle}</Box>
            <Box color="text-body-secondary">{props.emptyText}</Box>
            {props.emptyAction}
          </SpaceBetween>
        </Box>
      ),
      noMatch: (
        <Box textAlign="center" color="inherit" padding={{ vertical: 'l' }}>
          <SpaceBetween size="xs">
            <Box variant="strong" color="inherit">{T.table.noMatchTitle}</Box>
            <Box color="text-body-secondary">{T.table.noMatchText}</Box>
            <Box><Button onClick={() => actions.setFiltering('')}>{T.table.clearFilter}</Button></Box>
          </SpaceBetween>
        </Box>
      ),
    },
    pagination: { pageSize: preferences.pageSize },
    sorting: defaultColumn
      ? { defaultState: { sortingColumn: { sortingField: defaultColumn.sortingField }, isDescending: props.defaultSort?.descending } }
      : {},
  })
  const selectable = Boolean(props.onSelect)
  return (
    <Table<Row>
      {...collectionProps}
      variant={props.variant ?? 'container'}
      items={items}
      trackBy={props.trackBy}
      columnDefinitions={columns.map((c) => ({ id: c.id, header: c.header, cell: c.cell, sortingField: c.sortingField, minWidth: c.minWidth, isRowHeader: c.isRowHeader }))}
      columnDisplay={preferences.contentDisplay}
      wrapLines={preferences.wrapLines}
      stripedRows={preferences.stripedRows}
      loading={props.loading}
      loadingText={props.loadingText ?? T.table.loading}
      enableKeyboardNavigation
      selectionType={selectable ? 'single' : undefined}
      selectedItems={props.selected ? [props.selected] : []}
      onSelectionChange={(e) => props.onSelect?.(e.detail.selectedItems[0] ?? null)}
      onRowClick={selectable ? (e) => props.onSelect?.(e.detail.item) : undefined}
      ariaLabels={{
        selectionGroupLabel: T.table.selection,
        itemSelectionLabel: (_, row) => props.selectionLabel?.(row) ?? T.table.selectRow,
        tableLabel: props.title,
      }}
      header={
        <Header
          variant="h2"
          counter={props.loading ? undefined : filterProps.filteringText ? `(${filteredItemsCount}/${allItems.length})` : `(${allItems.length})`}
          description={props.description}
          actions={props.actions}
        >
          {props.title}
        </Header>
      }
      filter={
        <TextFilter
          {...filterProps}
          filteringPlaceholder={props.filterPlaceholder}
          filteringAriaLabel={props.filterAriaLabel}
          countText={T.table.matches(filteredItemsCount ?? 0)}
        />
      }
      pagination={<Pagination {...paginationProps} />}
      preferences={
        <CollectionPreferences
          title={T.table.prefsTitle}
          confirmLabel={T.table.prefsConfirm}
          cancelLabel={T.table.prefsCancel}
          preferences={preferences}
          onConfirm={(e) => setPreferences(e.detail)}
          pageSizePreference={{ title: T.table.pageSize, options: [10, 20, 50].map((n) => ({ value: n, label: T.table.rows(n) })) }}
          wrapLinesPreference={{ label: T.table.wrap, description: T.table.wrapHint }}
          stripedRowsPreference={{ label: T.table.striped, description: T.table.stripedHint }}
          contentDisplayPreference={{ title: T.table.columns, options: columns.map((c, i) => ({ id: c.id, label: c.header, alwaysVisible: i === 0 })) }}
        />
      }
    />
  )
}
