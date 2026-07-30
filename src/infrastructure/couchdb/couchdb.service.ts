import { Injectable, OnModuleInit, Inject } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import nano from 'nano';

import {
  UserRepository,
  type CreateUserData,
  type CreateUserResult,
  type UserDocument,
} from '../../users/user.repository';

import couchdbConfig from '../../config/couchdb.config';

@Injectable()
export class CouchDbService implements OnModuleInit, UserRepository {
  private couch!: nano.ServerScope;
  private db!: nano.DocumentScope<UserDocument>;

  constructor(
    @Inject(couchdbConfig.KEY)
    private readonly config: ConfigType<typeof couchdbConfig>,
  ) {}

  onModuleInit() {
    this.couch = nano(this.config.url);
    this.db = this.couch.use(this.config.database);
  }

  async createUser(user: CreateUserData): Promise<CreateUserResult> {
    const document: UserDocument = {
      ...user,
      _id: `user:${user.email}`,
    };
    const response = await this.db.insert(document);

    return {
      id: response.id,
      rev: response.rev,
    };
  }
}
