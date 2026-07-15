import bcrypt from 'bcrypt';

const SALT_ROUNDS = 12;

export const hashPassword = async (password: string) => bcrypt.hash(password, SALT_ROUNDS);
export const comparePassword = async (password: string, passwordHash: string) => bcrypt.compare(password, passwordHash);
