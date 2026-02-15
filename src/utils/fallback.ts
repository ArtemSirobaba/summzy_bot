export async function executeUntilSuccess<T>(
  promiseFunctions: (() => Promise<T>)[]
): Promise<T> {
  if (!Array.isArray(promiseFunctions) || promiseFunctions.length === 0) {
    throw new TypeError(
      `Expected an array with at least 1 promise-returning function, got ${typeof promiseFunctions}`
    );
  }

  const [first, ...rest] = promiseFunctions;

  try {
    return await first();
  } catch (error) {
    return await executeUntilSuccess(rest);
  }
}
