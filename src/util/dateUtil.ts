export const getCurrentDateTimeString = () => {
  const pad = (number: number) => {
    if (number < 10) {
      return '0' + number;
    }
    return number;
  };
  const date = new Date();
  return (
    date.getFullYear() +
    '-' +
    pad(date.getMonth() + 1) +
    '-' +
    pad(date.getDate()) +
    ' ' +
    pad(date.getHours()) +
    ':' +
    pad(date.getMinutes()) +
    ':' +
    pad(date.getSeconds()) //+
    // '.' +
    // (date.getMilliseconds() / 1000).toFixed(3).slice(2, 5)
  );
};
