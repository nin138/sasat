/** Best-effort notifications must not turn a completed database write into an error. */
export async function publishAfterWrite(
  event: string,
  publish: () => unknown | Promise<unknown>,
): Promise<void> {
  try {
    await publish();
  } catch {
    // Error objects and payloads can contain credentials or application data.
    try {
      console.error(
        "[sasat] Subscription publish failed after database write:",
        event,
      );
    } catch {
      // A failing log sink must not change the successful mutation result either.
    }
  }
}
