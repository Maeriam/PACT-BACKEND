import jwt from 'jsonwebtoken';

const SECRET = process.env.JWT_SECRET || 'secret';

export const generateToken = (id: string, role: string) => {
  const signOptions: jwt.SignOptions = {
    expiresIn: (process.env.JWT_EXPIRE as jwt.SignOptions['expiresIn']) || '7d',
  };

  return jwt.sign({ id, role }, SECRET, signOptions);
};

export const verifyToken = (token: string) => {
  try {
    return jwt.verify(token, SECRET);
  } catch {
    return null;
  }
};

