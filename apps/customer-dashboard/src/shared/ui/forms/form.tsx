'use client';

/* eslint-disable react/prop-types, react-refresh/only-export-components */

import * as React from 'react';
import {
  Controller,
  FormProvider,
  useFormContext,
  type ControllerProps,
  type FieldPath,
  type FieldValues,
  type UseFormReturn,
} from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { cn } from '@/shared/utils/cn';

type FormFieldContextValue<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> = {
  name: TName;
};

const FormFieldContext = React.createContext<FormFieldContextValue>({} as FormFieldContextValue);

type FormFieldProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> = ControllerProps<TFieldValues, TName>;

const FormField = <
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>({
  ...props
}: FormFieldProps<TFieldValues, TName>) => {
  return (
    <FormFieldContext.Provider value={{ name: props.name }}>
      <Controller {...props} />
    </FormFieldContext.Provider>
  );
};

function useFormField() {
  const fieldContext = React.useContext(FormFieldContext);
  const formContext = useFormContext();
  if (!formContext) {
    return { name: fieldContext.name, error: undefined };
  }
  const fieldState = formContext.getFieldState(fieldContext.name, formContext.formState);
  return { name: fieldContext.name, ...fieldState };
}

type FormProps<TFieldValues extends FieldValues = FieldValues> =
  React.FormHTMLAttributes<HTMLFormElement> & {
    form?: UseFormReturn<TFieldValues>;
  };

function Form<TFieldValues extends FieldValues = FieldValues>({
  form,
  ...props
}: FormProps<TFieldValues>) {
  return form ? (
    <FormProvider {...form}>
      <form {...props} />
    </FormProvider>
  ) : (
    <form {...props} />
  );
}

type FormItemProps = React.HTMLAttributes<HTMLDivElement>;

const FormItem = React.forwardRef<HTMLDivElement, FormItemProps>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('space-y-2', className)} {...props} />
));
FormItem.displayName = 'FormItem';

type FormLabelProps = React.LabelHTMLAttributes<HTMLLabelElement>;

const FormLabel = React.forwardRef<HTMLLabelElement, FormLabelProps>(
  ({ className, ...props }, ref) => (
    <label
      ref={ref}
      className={cn(
        'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
        className
      )}
      {...props}
    />
  )
);
FormLabel.displayName = 'FormLabel';

type FormControlProps = React.HTMLAttributes<HTMLDivElement>;

const FormControl = React.forwardRef<HTMLDivElement, FormControlProps>(
  ({ className, ...props }, ref) => <div ref={ref} className={cn(className)} {...props} />
);
FormControl.displayName = 'FormControl';

type FormDescriptionProps = React.HTMLAttributes<HTMLParagraphElement>;

const FormDescription = React.forwardRef<HTMLParagraphElement, FormDescriptionProps>(
  ({ className, ...props }, ref) => (
    <p ref={ref} className={cn('text-sm text-muted-foreground', className)} {...props} />
  )
);
FormDescription.displayName = 'FormDescription';

type FormMessageProps = React.HTMLAttributes<HTMLParagraphElement>;

const FormMessage = React.forwardRef<HTMLParagraphElement, FormMessageProps>(
  ({ className, children, ...props }, ref) => {
    const { error } = useFormField();
    const { t } = useTranslation();
    const message = error?.message ? String(error.message) : undefined;
    const body = message ? t(message) : children;
    if (!body) return null;
    return (
      <p ref={ref} className={cn('text-sm font-medium text-destructive', className)} {...props}>
        {body}
      </p>
    );
  }
);
FormMessage.displayName = 'FormMessage';

export {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
  useFormField,
};
