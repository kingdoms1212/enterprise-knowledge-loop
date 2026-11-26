import type { ReactNode } from 'react'
import styles from './Surfaces.module.css'

export function Table<Row>({ label, rows, columns, rowKey }: {
  label: string
  rows: readonly Row[]
  columns: readonly { key: string; heading: string; cell: (row: Row) => ReactNode }[]
  rowKey: (row: Row) => string
}) {
  return <table className={styles.table}>
    <caption className="visually-hidden">{label}</caption>
    <thead><tr>{columns.map((column) => <th key={column.key} scope="col">{column.heading}</th>)}</tr></thead>
    <tbody>{rows.map((row) => <tr key={rowKey(row)}>
      {columns.map((column) => <td key={column.key}>{column.cell(row)}</td>)}
    </tr>)}</tbody>
  </table>
}
