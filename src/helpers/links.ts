import type { Links } from '../types'

export interface LinkBuilderOptions {
  baseUrl: string
  basePath?: string
}

export function createLinkBuilder(options: LinkBuilderOptions) {
  const { baseUrl, basePath = '' } = options

  return {
    build(path: string, params?: Record<string, string>): string {
      const url = new URL(`${basePath}${path}`, baseUrl)
      if (params) {
        for (const [key, value] of Object.entries(params)) {
          url.searchParams.set(key, value)
        }
      }
      return url.toString()
    },

    collection(path: string): Links {
      const base = this.build(path)
      return {
        self: base,
        docs: this.build('/docs'),
      }
    },

    resource(path: string, id: string): Links {
      return {
        self: this.build(`${path}/${id}`),
        collection: this.build(path),
      }
    },
  }
}
