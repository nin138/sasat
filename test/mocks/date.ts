// eslint-disable-next-line @typescript-eslint/no-explicit-any
let spy: any;
export const mockDateStart = (
  currentDate: Date = new Date('2020/01/01 12:00:01.221'),
) => {
  const OriginalDate = Date;
  // @ts-ignore
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  spy = jest.spyOn(global, 'Date').mockImplementation((arg: any) => {
    if (arg === 0 || arg) {
      return new OriginalDate(arg);
    }
    return currentDate;
  });
  Date.now = jest.fn().mockReturnValue(currentDate.valueOf());
};

export const restoreDate = () => spy.mockRestore();
