export const tsArrowFunction = (
  params: Array<{ name: string; type: string }>,
  returnType: string,
  body: string,
  async = false,
) => `\
${async ? 'async ' : ''}(${params
  .map(it => `${it.name}: ${it.type}`)
  .join(', ')}): ${returnType} => ${body}`;
