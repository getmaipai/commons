// Race a promise against a setTimeout rejection, clearing the timer
// either way. `onTimeout` is a factory (not a fixed message) so each
// caller's own error type/wording survives unchanged - one caller needs
// a distinct error class to tell a timeout apart from an ordinary
// failure, another just wants a plain Error with its own message.
export async function withTimeout<T>(promise: Promise<T>, ms: number, onTimeout: () => Error): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(onTimeout()), ms);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timer!);
  }
}
