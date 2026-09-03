import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { userRepository } from '../repositories/user.repository.js';
import { config } from '../config/env.js';
import { AppError } from '../middleware/errorHandler.js';

export const authService = {
  async register(input) {
    const existingUser = await userRepository.findByEmail(input.email);
    if (existingUser) {
      throw new AppError(409, 'User with this email already exists', 'EMAIL_ALREADY_EXISTS');
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(input.password, salt);

    const user = await userRepository.create({
      email: input.email,
      passwordHash,
      role: input.role || 'PATIENT',
      patient: input.patient,
      doctor: input.doctor,
    });

    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
        patientId: user.patient?.id,
        doctorId: user.doctor?.id,
      },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    );

    return {
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        patient: user.patient,
        doctor: user.doctor,
      },
      token,
    };
  },

  async login(email, password) {
    const user = await userRepository.findByEmail(email);
    if (!user) {
      throw new AppError(401, 'Invalid email or password', 'INVALID_CREDENTIALS');
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      throw new AppError(401, 'Invalid email or password', 'INVALID_CREDENTIALS');
    }

    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
        patientId: user.patient?.id,
        doctorId: user.doctor?.id,
      },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    );

    return {
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        patient: user.patient,
        doctor: user.doctor,
      },
      token,
    };
  },

  async getMe(userId) {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new AppError(404, 'User not found', 'USER_NOT_FOUND');
    }

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      patient: user.patient,
      doctor: user.doctor,
    };
  },
};
