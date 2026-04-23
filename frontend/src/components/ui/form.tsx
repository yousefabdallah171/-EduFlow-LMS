import React, { createContext, useContext } from "react";
import { Slot } from "@radix-ui/react-slot";
import {
  Controller,
  FormProvider,
  useFormContext,
  type ControllerProps,
  type FieldPath,
  type FieldValues
} from "react-hook-form";

import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const Form = FormProvider;

const FormFieldContext = createContext<{ name: string }>({ name: "" });

const FormField = <TFieldValues extends FieldValues, TName extends FieldPath<TFieldValues>>(
  props: ControllerProps<TFieldValues, TName>
) => (
  <FormFieldContext.Provider value={{ name: String(props.name) }}>
    <Controller {...props} />
  </FormFieldContext.Provider>
);

const FormItemContext = createContext<{ id: string }>({ id: "" });

const FormItem = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => {
  const id = React.useId();
  return (
    <FormItemContext.Provider value={{ id }}>
      <div className={cn("space-y-2", className)} {...props} />
    </FormItemContext.Provider>
  );
};

const useFormField = () => {
  const fieldContext = useContext(FormFieldContext);
  const itemContext = useContext(FormItemContext);
  const { getFieldState, formState } = useFormContext();
  const fieldState = getFieldState(fieldContext.name as never, formState);

  return {
    id: itemContext.id,
    formMessageId: `${itemContext.id}-form-item-message`,
    formDescriptionId: `${itemContext.id}-form-item-description`,
    ...fieldState
  };
};

const FormLabel = ({ className, ...props }: React.ComponentPropsWithoutRef<typeof Label>) => {
  const { error } = useFormField();
  return <Label className={cn("ui-field-label", error && "text-[color:var(--color-danger)]", className)} {...props} />;
};

const FormControl = ({ ...props }: React.ComponentPropsWithoutRef<typeof Slot>) => {
  const { error, formDescriptionId, formMessageId } = useFormField();
  return (
    <Slot
      aria-describedby={!error ? formDescriptionId : `${formDescriptionId} ${formMessageId}`}
      aria-invalid={Boolean(error)}
      {...props}
    />
  );
};

const FormDescription = ({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) => {
  const { formDescriptionId } = useFormField();
  return <p id={formDescriptionId} className={cn("text-sm leading-6 text-secondary", className)} {...props} />;
};

const FormMessage = ({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) => {
  const { error, formMessageId } = useFormField();
  const body = error ? String(error.message ?? "") : props.children;

  if (!body) return null;

  return (
    <p id={formMessageId} className={cn("text-sm font-medium text-[color:var(--color-danger)]", className)} {...props}>
      {body}
    </p>
  );
};

export { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage };
