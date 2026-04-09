export const FIELD_TYPES = [
  "TEXT",
  "TEXTAREA",
  "NUMBER",
  "DATE",
  "TIME",
  "DATETIME",
  "SELECT",
  "MULTISELECT",
  "RADIO",
  "CHECKBOX",
  "FILE_FAKE",
  "SIGNATURE_TEXT",
  "CPF_FAKE",
  "RG_FAKE",
  "PLATE",
  "OBSERVATIONS",
] as const;

export type FieldType = (typeof FIELD_TYPES)[number];

export const TEMPLATE_STATUS = ["DRAFT", "PUBLISHED", "ARCHIVED"] as const;

export type TemplateStatus = (typeof TEMPLATE_STATUS)[number];

export type TemplateSummary = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  status: TemplateStatus;
  version: number;
  isActive: boolean;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  _count?: {
    submissions: number;
    sections: number;
  };
};

export type TemplateGraph = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  status: TemplateStatus;
  version: number;
  isActive: boolean;
  deletedAt: Date | null;
  sections: Array<{
    id: string;
    title: string;
    description: string | null;
    order: number;
    fields: Array<{
      id: string;
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
      options: unknown;
      validation: unknown;
    }>;
  }>;
};
