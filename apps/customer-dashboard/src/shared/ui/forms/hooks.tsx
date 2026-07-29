'use client';

/* eslint-disable react-refresh/only-export-components */

import { useForm, type FieldPath, type FieldValues, type UseFormReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { z } from 'zod';
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
} from '@/shared/ui/forms/form';
import { Input } from '@/shared/ui/forms/input';

interface UseZodFormOptions<T extends z.ZodTypeAny> {
  schema: T;
  defaultValues?: z.infer<T>;
  onSubmit: (values: z.infer<T>) => Promise<void>;
}

export function useZodForm<T extends z.ZodTypeAny>({
  schema,
  defaultValues,
  onSubmit,
}: UseZodFormOptions<T>) {
  const form = useForm<z.infer<T>>({
    resolver: zodResolver(schema),
    defaultValues,
    mode: 'onBlur',
  });

  return {
    ...form,
    handleSubmit: form.handleSubmit(async (data) => {
      await onSubmit(data);
    }),
  };
}

interface FormInputFieldProps<TValues extends FieldValues> {
  form: UseFormReturn<TValues>;
  name: FieldPath<TValues>;
  label: string;
  description?: string;
  placeholder?: string;
  type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url';
  required?: boolean;
  autoComplete?: string;
}

export function FormInputField<TValues extends FieldValues>({
  form,
  name,
  label,
  description,
  placeholder,
  type = 'text',
  required,
  autoComplete,
}: FormInputFieldProps<TValues>) {
  const hasError = Boolean(form.getFieldState(name, form.formState).error);
  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>
            {label}
            {required && <span className="ml-1 text-destructive">*</span>}
          </FormLabel>
          <FormControl>
            <Input
              type={type}
              placeholder={placeholder}
              autoComplete={autoComplete}
              aria-invalid={hasError}
              {...field}
            />
          </FormControl>
          {description && <FormDescription>{description}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

interface FormSelectFieldProps<TValues extends FieldValues> {
  form: UseFormReturn<TValues>;
  name: FieldPath<TValues>;
  label: string;
  description?: string;
  placeholder?: string;
  options: { value: string; label: string }[];
  required?: boolean;
}

export function FormSelectField<TValues extends FieldValues>({
  form,
  name,
  label,
  description,
  placeholder,
  options,
  required,
}: FormSelectFieldProps<TValues>) {
  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>
            {label}
            {required && <span className="ml-1 text-destructive">*</span>}
          </FormLabel>
          <FormControl>
            <select
              {...field}
              className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="" disabled>
                {placeholder}
              </option>
              {options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </FormControl>
          {description && <FormDescription>{description}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
