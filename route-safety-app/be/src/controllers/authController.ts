import { Request, Response } from 'express';
import { createUser, findUserByEmail, verifyPassword } from '../services/userService';
import { generateToken } from '../middleware/authMiddleware';
import { AuthRequest } from '../middleware/authMiddleware';

export async function register(req: Request, res: Response): Promise<void> {
  try {
    const { email, username, password } = req.body;

    if (!email || !username || !password) {
      res.status(400).json({ error: 'Все поля обязательны' });
      return;
    }

    if (password.length < 6) {
      res.status(400).json({ error: 'Пароль должен содержать минимум 6 символов' });
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      res.status(400).json({ error: 'Некорректный email' });
      return;
    }

    const user = await createUser({ email, username, password });

    const token = generateToken({ userId: user.id, email: user.email });

    const response = {
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
      },
    };

    res.status(201).json(response);
  } catch (error: any) {
    if (error.message.includes('уже существует')) {
      res.status(409).json({ error: error.message });
    } else {
      console.error('Ошибка регистрации:', error);
      res.status(500).json({ error: 'Ошибка при регистрации пользователя' });
    }
  }
}

export async function login(req: Request, res: Response): Promise<void> {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'Email и пароль обязательны' });
      return;
    }

    const user = findUserByEmail(email);
    if (!user) {
      res.status(401).json({ error: 'Неверный email или пароль' });
      return;
    }

    const isValidPassword = await verifyPassword(user, password);
    if (!isValidPassword) {
      res.status(401).json({ error: 'Неверный email или пароль' });
      return;
    }

    const token = generateToken({ userId: user.id, email: user.email });

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
      },
    });
  } catch (error) {
    console.error('Ошибка входа:', error);
    res.status(500).json({ error: 'Ошибка при входе' });
  }
}

export function getCurrentUser(req: AuthRequest, res: Response): void {
  if (!req.user) {
    res.status(401).json({ error: 'Пользователь не авторизован' });
    return;
  }

  res.json({
    user: req.user,
  });
}

