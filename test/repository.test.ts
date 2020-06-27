import { PostRepository } from './out/repository/Post';
import { PostCreatable } from './out/__generated__/entity/Post';
import { getDbClient } from '../src';
import { UserRepository } from './out/repository/User';
import { mockDateStart, restoreDate } from './mocks/date';

describe('repository', () => {
  const dbClient = getDbClient();
  beforeEach(() => {
    mockDateStart();
  });

  afterAll(() => {
    restoreDate();
    getDbClient().release();
  });
  it('should UserRepository.create returns ...', async function (done) {
    await new UserRepository(dbClient)
      .create({})
      .then(it => {
        expect(it).toStrictEqual({
          userId: 1,
          name: 'no name',
          nickName: null,
          createdAt: '2020-01-01 12:00:01',
          updatedAt: '2020-01-01 12:00:01',
        });
      })
      .finally(async () => {
        done();
      });
  });

  it('should PostRepository.create returns ...', function (done) {
    const creatable: PostCreatable = {
      userId: 1,
      title: 'tti',
    };
    new PostRepository(getDbClient())
      .create(creatable)
      .then(it => {
        expect(it).toStrictEqual({
          userId: 1,
          title: 'tti',
          postId: 1,
        });
      })
      .finally(() => done());
  });
});
