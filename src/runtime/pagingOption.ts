import { BooleanValueExpression, ListQueryOption, QExpr } from '../index.js';
import { Sort } from './dsl/query/query.js';

type DsPagingOption = {
  numberOfItem: number;
  where?: BooleanValueExpression;
  offset?: number;
  sort?: Sort[];
};

export const pagingOption = (option: ListQueryOption): DsPagingOption => {
  const sort = option.order
    ? [
        QExpr.sort(
          QExpr.field('t1', option.order),
          option?.asc === false ? 'DESC' : 'ASC',
        ),
      ]
    : [];
  return { numberOfItem: option.numberOfItem, offset: option.offset, sort };
};
