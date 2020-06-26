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
  it('should UserRepository.create returns ...', function (done) {
    new UserRepository().create({}).then(it => {
      expect(it).toStrictEqual({
        userId: 1,
        name: 'no name',
        nickName: null,
        createdAt: '2020-01-01 12:00:01',
        updatedAt: '2020-01-01 12:00:01',
      });
      done();
    });
  });

  it('should PostRepository.create returns ...', function (done) {
    const creatable: PostCreatable = {
      userId: 1,
      title: 'tti',
    };
    new PostRepository().create(creatable).then(it => {
      expect(it).toStrictEqual({
        userId: 1,
        title: 'tti',
        postId: 1,
      });
      done();
    });
  });
});
