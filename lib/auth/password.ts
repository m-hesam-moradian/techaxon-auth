import bcrypt from 'bcrypt';

const SALT_ROUNDS = 10;

export const hashValue = async (value: string): Promise<string> => {
  return bcrypt.hash(value, SALT_ROUNDS);
};

export const compareValue = async (value: string, hash: string): Promise<boolean> => {
  return bcrypt.compare(value, hash);
};
