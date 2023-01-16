import HashIds from 'hashids';

import { makeNumberIdEncoder } from 'sasat';
export const UserHashId = makeNumberIdEncoder(new HashIds('User'));
