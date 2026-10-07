/**
 * Fault injection for the browser repository's failure tests (note-storage
 * AC-29 to AC-32). Built only on public IndexedDB API: Proxies over a real
 * in-process factory, plus EventTarget-based stub open requests.
 *
 * The repository reads `transaction.error` from the transaction object it
 * was given, so a proxied transaction can report an injected error.
 */
import { vi } from "vitest";

/** Which repository write a fault targets, by the store method it uses. */
export type WriteOp = "create" | "update" | "delete";

const METHOD: Record<WriteOp, "add" | "put" | "delete"> = {
  create: "add",
  update: "put",
  delete: "delete",
};

interface Fault {
  readonly method: "add" | "put" | "delete";
  /** Run instead of / around the real store method. */
  readonly apply: (
    real: (...args: unknown[]) => IDBRequest,
    args: unknown[],
    tx: IDBTransaction,
    setError: (error: DOMException) => void,
  ) => IDBRequest;
}

function forward<T extends object>(
  target: T,
  overrides: Partial<Record<PropertyKey, unknown>>,
): T {
  return new Proxy(target, {
    get(real, prop) {
      if (Object.hasOwn(overrides, prop)) return overrides[prop];
      const value: unknown = Reflect.get(real, prop, real);
      return typeof value === "function" ? value.bind(real) : value;
    },
  });
}

function wrapTransaction(tx: IDBTransaction, fault: Fault): IDBTransaction {
  let injected: DOMException | undefined;
  const setError = (error: DOMException) => {
    injected = error;
  };
  const proxy = new Proxy(tx, {
    get(real, prop) {
      if (prop === "error") return injected ?? real.error;
      if (prop === "objectStore") {
        return (name: string) => {
          const store = real.objectStore(name);
          return forward(store, {
            [fault.method]: (...args: unknown[]) =>
              fault.apply(
                (...a: unknown[]) =>
                  (store[fault.method] as (...b: unknown[]) => IDBRequest)(
                    ...a,
                  ),
                args,
                real,
                setError,
              ),
          });
        };
      }
      const value: unknown = Reflect.get(real, prop, real);
      return typeof value === "function" ? value.bind(real) : value;
    },
  });
  return proxy;
}

function wrapDatabase(db: IDBDatabase, fault: Fault): IDBDatabase {
  return forward(db, {
    transaction: (...args: Parameters<IDBDatabase["transaction"]>) =>
      wrapTransaction(db.transaction(...args), fault),
  });
}

function faultyFactory(factory: IDBFactory, fault: Fault): IDBFactory {
  const wrapped = new WeakMap<IDBDatabase, IDBDatabase>();
  return forward(factory, {
    open: (...args: Parameters<IDBFactory["open"]>) => {
      const request = factory.open(...args);
      return new Proxy(request, {
        get(real, prop) {
          if (prop === "result") {
            const db = real.result;
            let proxy = wrapped.get(db);
            if (!proxy) {
              proxy = wrapDatabase(db, fault);
              wrapped.set(db, proxy);
            }
            return proxy;
          }
          const value: unknown = Reflect.get(real, prop, real);
          return typeof value === "function" ? value.bind(real) : value;
        },
      });
    },
  });
}

/** The real write request succeeds, then the real transaction is aborted. */
export function abortAfterWrite(factory: IDBFactory, op: WriteOp): IDBFactory {
  return faultyFactory(factory, {
    method: METHOD[op],
    apply(real, args, tx) {
      const request = real(...args);
      request.addEventListener("success", () => tx.abort());
      return request;
    },
  });
}

/** Like `abortAfterWrite`, and the transaction's `error` reports `error`. */
export function abortWith(
  factory: IDBFactory,
  op: WriteOp,
  error: DOMException,
): IDBFactory {
  return faultyFactory(factory, {
    method: METHOD[op],
    apply(real, args, tx, setError) {
      const request = real(...args);
      request.addEventListener("success", () => {
        setError(error);
        tx.abort();
      });
      return request;
    },
  });
}

/**
 * The write request itself fails with `error` and nothing is written; the
 * transaction then aborts with that error, as a browser does when a request
 * error is not handled.
 */
export function requestError(
  factory: IDBFactory,
  op: WriteOp,
  error: DOMException,
): IDBFactory {
  return faultyFactory(factory, {
    method: METHOD[op],
    apply(_real, _args, tx, setError) {
      const failed = Object.assign(new EventTarget(), {
        error,
        readyState: "done",
        result: undefined,
      });
      setError(error);
      failed.dispatchEvent(new Event("error"));
      tx.abort();
      return failed as unknown as IDBRequest;
    },
  });
}

type StubRequest = EventTarget & {
  error: DOMException | null;
  result: unknown;
  transaction: null;
};

function stubRequest(): StubRequest {
  return Object.assign(new EventTarget(), {
    error: null,
    result: undefined,
    transaction: null,
  });
}

function stubFactory(open: () => unknown): IDBFactory {
  return { open: vi.fn(open) } as unknown as IDBFactory;
}

/** AC-30 (c): `open()` throws synchronously. */
export function factoryWhoseOpenThrows(error: DOMException): IDBFactory {
  return stubFactory(() => {
    throw error;
  });
}

/** AC-30 (d): the open request fires `error`. */
export function factoryWhoseOpenErrors(error: DOMException): IDBFactory {
  return stubFactory(() => {
    const request = stubRequest();
    setTimeout(() => {
      request.error = error;
      request.dispatchEvent(new Event("error"));
    }, 0);
    return request;
  });
}

/** AC-30 (e): the open request fires `blocked` and never succeeds. */
export function factoryWhoseOpenBlocks(): IDBFactory {
  return stubFactory(() => {
    const request = stubRequest();
    setTimeout(() => request.dispatchEvent(new Event("blocked")), 0);
    return request;
  });
}

/**
 * R26: the open request fires `blocked`, then succeeds later with
 * `connection`. The repository must close that late connection.
 */
export function factoryBlockedThenSucceeds(connection: object): IDBFactory {
  return stubFactory(() => {
    const request = stubRequest();
    setTimeout(() => request.dispatchEvent(new Event("blocked")), 0);
    setTimeout(() => {
      request.result = connection;
      request.dispatchEvent(new Event("success"));
    }, 5);
    return request;
  });
}

/** AC-32: the first `open()` fails with an error event; later calls reach `factory`. */
export function failFirstOpen(factory: IDBFactory): IDBFactory {
  let calls = 0;
  const failing = factoryWhoseOpenErrors(
    new DOMException("first open fails", "UnknownError"),
  );
  return forward(factory, {
    open: vi.fn((...args: Parameters<IDBFactory["open"]>) => {
      calls += 1;
      return calls === 1 ? failing.open(...args) : factory.open(...args);
    }),
  });
}
