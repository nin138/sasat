import { PostRepository } from './out/repository/Post';
import { PostCreatable } from './out/__generated__/entity/Post';
import { getDbClient } from '../src/db/getDbClient';
import { UserRepository } from './out/repository/User';
import { mockDateStart, restoreDate } from './mocks/date';

describe('repository', () => {
  beforeEach(() => {
    mockDateStart();
  });

  afterAll(() => {
    restoreDate();
    getDbClient().release();
  });

  it('should PostRepository.create returns ...', function (done) {
    const creatable: PostCreatable = {
      user_id: 1,
      title: 'tti',
    };
    new PostRepository().create(creatable).then(it => {
      expect(it).toStrictEqual({
        user_id: 1,
        title: 'tti',
        post_id: 1,
      });
      done();
    });
  });
  it('should UserRepository.create returns ...', function (done) {
    new UserRepository().create({}).then(it => {
      expect(it).toStrictEqual({
        user_id: 1,
        name: 'no name',
        nick_name: null,
        created_at: '2020-01-01T12:00:01.221',
        updated_at: '2020-01-01T12:00:01.221',
      });
      done();
    });
  });
});
