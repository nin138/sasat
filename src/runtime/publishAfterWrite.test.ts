import { publishAfterWrite } from "./publishAfterWrite.js";

test.each(["throw", "reject"])(
  "records a safe failure and resolves when publishing can %s",
  async (mode) => {
    const logger = jest.spyOn(console, "error").mockImplementation(() => {});
    const error = new Error(
      "redis://secret:password@example.invalid private-payload",
    );
    const publish = jest.fn(() => {
      if (mode === "throw") throw error;
      return Promise.reject(error);
    });
    await expect(
      publishAfterWrite("publishItemCreated", publish),
    ).resolves.toBeUndefined();
    expect(publish).toHaveBeenCalledTimes(1);
    expect(logger).toHaveBeenCalledTimes(1);
    expect(logger).toHaveBeenCalledWith(
      "[sasat] Subscription publish failed after database write:",
      "publishItemCreated",
    );
  },
);

test("a failing log sink does not turn the mutation into an error", async () => {
  jest.spyOn(console, "error").mockImplementation(() => {
    throw new Error("logging failed");
  });
  await expect(
    publishAfterWrite("publishItemCreated", () =>
      Promise.reject(new Error("unavailable")),
    ),
  ).resolves.toBeUndefined();
});

test("awaits the attempt and does not retry or log successful notifications", async () => {
  const logger = jest.spyOn(console, "error").mockImplementation(() => {});
  let finish!: () => void;
  const pending = new Promise<void>((resolve) => {
    finish = resolve;
  });
  const publish = jest.fn(() => pending);
  let complete = false;
  const result = publishAfterWrite("publishItemCreated", publish).then(() => {
    complete = true;
  });
  await Promise.resolve();
  expect(complete).toBe(false);
  finish();
  await result;
  expect(publish).toHaveBeenCalledTimes(1);
  expect(logger).not.toHaveBeenCalled();
});
