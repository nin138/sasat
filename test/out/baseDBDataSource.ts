import { Fields, SasatDBDatasource, EntityType } from 'sasat';
import { relationMap, tableInfo } from './__generated__/relationMap.js';

export abstract class BaseDBDataSource<
  Entity extends EntityType,
  Identifiable extends object,
  Creatable,
  Updatable extends Identifiable,
  EntityFields extends Fields<Entity>,
  QueryResult extends Partial<Entity> & Identifiable,
> extends SasatDBDatasource<
  Entity,
  Identifiable,
  Creatable,
  Updatable,
  EntityFields,
  QueryResult
> {
  protected relationMap = relationMap;
  protected tableInfo = tableInfo;
  protected queryLogger = (q: string) => console.log(q);
}
