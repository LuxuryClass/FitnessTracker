export const clearFieldError = <T extends Record<string, string>>(
  errors: T,
  field: keyof T,
  setErrors: (errors: T) => void
) => {
  if (errors[field]) {
    setErrors({ ...errors, [field]: '' });
  }
};