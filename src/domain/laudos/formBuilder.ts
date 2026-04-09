import type { FieldType } from "@/domain/laudos/types";

export interface FormBuilderSection {
  id: string;
  templateId: string;
  title: string;
  description: string | null;
  order: number;
}

export interface FormBuilderField {
  id: string;
  sectionId: string;
  label: string;
  name: string;
  type: FieldType;
  placeholder: string | null;
  helpText: string | null;
  required: boolean;
  order: number;
  defaultValue: unknown;
  mask: string | null;
  isActive: boolean;
  options: string[] | null;
}

export interface CreateBuilderFieldInput {
  sectionId: string;
  label: string;
  name: string;
  type: FieldType;
  placeholder?: string | null;
  helpText?: string | null;
  required?: boolean;
  order?: number;
  defaultValue?: unknown;
  mask?: string | null;
  isActive?: boolean;
  options?: string[] | null;
}

export interface ReorderFieldsInput {
  sectionId: string;
  fieldIds: string[];
}
