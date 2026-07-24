import bcrypt from "bcryptjs";

// import { AppDataSource } from "../../config/db";
import { AppDataSource } from "@/src/config/db";
import { User } from "@/src/api/entities/User";

const userRepository = AppDataSource.getRepository(User);

export const createUser = async (
  name: string,
  email: string,
  password: string,
) => {
  console.log(name);
  console.log(password);
  const hashedPassword = await bcrypt.hash(password, 10);
  const newUser = userRepository.create({
    name,
    email,
    password: hashedPassword,
  });

  return await userRepository.save(newUser);
};

export const findUserByEmail = async (email: string) => {
  const user = await userRepository.findOne({ where: { email } });

  console.log(user);

  return user;
};

export const validatePassword = async (
  password: string,
  hashedPassword: string,
) => {
  return await bcrypt.compare(password, hashedPassword);
};
