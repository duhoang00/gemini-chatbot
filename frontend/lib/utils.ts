import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import validator from "validator";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function validateInputMessage(
  input: string,
): { isValid: boolean; error?: string } {
  if (!validator.isLength(input, { min: 1, max: 500 })) {
    return {
      isValid: false,
      error: "Input must be between 1 and 500 characters.",
    };
  }

  if (validator.matches(input, /<script[\s\S]*?>[\s\S]*?<\/script>/i)) {
    return { isValid: false, error: "Input contains prohibited content." };
  }

  return { isValid: true };
}
