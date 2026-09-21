/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<object, object, unknown>
  export default component
}

declare module 'sql.js' {
  export interface SqlJsStatic {
    Database: new (data?: ArrayLike<number> | Buffer | null) => Database
  }
  export interface Database {
    run(sql: string, params?: SqlValue[]): Database
    exec(sql: string): QueryExecResult[]
    prepare(sql: string): Statement
    export(): Uint8Array
    close(): void
  }
  export interface Statement {
    bind(values?: SqlValue[]): boolean
    step(): boolean
    getAsObject(params?: Record<string, SqlValue>): Record<string, SqlValue>
    free(): void
  }
  export interface QueryExecResult {
    columns: string[]
    values: SqlValue[][]
  }
  export type SqlValue = string | number | null | Uint8Array
  export default function initSqlJs(config?: {
    locateFile?: (file: string) => string
  }): Promise<SqlJsStatic>
}
