export type MockCallbackError = {
  message?: string
  code?: string
}

export type MockCallbackOptions<TData = unknown, TError = MockCallbackError> = {
  fetchOptions?: {
    onSuccess?: (ctx?: { data?: TData }) => Promise<void> | void
    onError?: (ctx: {
      error: TError
      response?: { status: number; headers: Headers }
    }) => Promise<void> | void
  }
}

export function mockAuthSuccess<TData = unknown>(data?: TData) {
  return async (opts: unknown) => {
    const { fetchOptions } = (opts ?? {}) as MockCallbackOptions<TData>
    await fetchOptions?.onSuccess?.(data !== undefined ? { data } : undefined)
    return undefined as never
  }
}

export function mockAuthError<TError = MockCallbackError>(
  error: TError,
  status = 400
) {
  return async (opts: unknown) => {
    const { fetchOptions } = (opts ?? {}) as MockCallbackOptions<
      unknown,
      TError
    >
    await fetchOptions?.onError?.({
      error,
      response: { status, headers: new Headers() },
    })
    return undefined as never
  }
}
