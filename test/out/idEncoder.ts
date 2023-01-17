import HashIds from 'hashids';
import { makeNumberIdEncoder } from 'sasat';

export const UserHashId = makeNumberIdEncoder(new HashIds('User', 7));
export const PostHashId = makeNumberIdEncoder(new HashIds('Post'));
