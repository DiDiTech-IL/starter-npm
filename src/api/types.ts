import { z } from 'zod';

export interface CacheInfo {
  status: string; // HIT, MISS, STALE, ERROR
  source: string; // redis, database, cache
  key?: string;
  age?: number; // seconds
  ttl?: number; // seconds remaining
}

export interface TemplateMetadata {
  templateId: string;
  version: string;
  name: string;
  description: string;
  author?: string;
  homepage?: string;
}

export interface FetchTemplateResponse {
  success: boolean;
  data: {
    templateId: string;
    version: string;
    recipe: Recipe;
    metadata?: TemplateMetadata;
  };
}

export interface InstallationReport {
  templateId: string;
  templateVersion: string;
  projectId: string;
  originUrl?: string;
  selections: Record<string, string | boolean>;
}

// Recipe types
export const WhenConditionSchema: z.ZodType<WhenCondition> = z.lazy(() =>
  z.discriminatedUnion('type', [
    z.object({ type: z.literal('always') }),
    z.object({
      type: z.literal('varEquals'),
      key: z.string(),
      value: z.union([z.string(), z.boolean()]),
    }),
    z.object({
      type: z.literal('and'),
      items: z.array(WhenConditionSchema),
    }),
    z.object({
      type: z.literal('or'),
      items: z.array(WhenConditionSchema),
    }),
  ])
);

export type WhenCondition =
  | { type: 'always' }
  | { type: 'varEquals'; key: string; value: string | boolean }
  | { type: 'and'; items: WhenCondition[] }
  | { type: 'or'; items: WhenCondition[] };

export interface Package {
  name: string;
  version: string;
}

export interface EnvVariable {
  key: string;
  description: string;
  required?: boolean;
}

export interface Command {
  runner?: 'npx' | 'npm' | 'yarn' | 'pnpm' | 'custom';
  packageName: string;
  commandArgs: string;
  customCommand?: string;
  description?: string;
}

export interface Operations {
  packages?: Package[];
  envVariables?: EnvVariable[];
  commands?: Command[];
}

export interface ConfirmVariable {
  type: 'confirm';
  key: string;
  label: string;
  defaultValue?: boolean;
  onTrue?: Operations;
  onFalse?: Operations;
}

export interface SelectOption {
  label: string;
  value: string;
  operations?: Operations;
}

export interface SelectVariable {
  type: 'select';
  key: string;
  label: string;
  options: SelectOption[];
  defaultValue?: string;
}

export type Variable = ConfirmVariable | SelectVariable;

export interface Recipe {
  engine: string;
  variables: Variable[];
  steps?: any[];
  installationGroups?: any[];
  verifiedPackages?: string[];
  envKeys?: Array<{ key: string; description: string }>;
}
