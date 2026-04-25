/**
 * Form Registry
 * Implements Phase 3, Item 9: Build a form registry
 */

import { LayoutEntry, MappingEntry, TransformEntry, TableDefinition } from '../types/Field';

export interface FormSchema {
  layout: Record<string, LayoutEntry>;
  mapping: Record<string, MappingEntry>;
  transforms: Record<string, TransformEntry>;
  tables?: Record<string, TableDefinition>;
}

export interface FormMetadata {
  id: string;
  name: string;
  version: string;
  description?: string;
}

export interface FormBundle extends FormMetadata {
  schema: FormSchema;
  template?: Uint8Array; // Optional PDF template bytes
}

/**
 * Form Registry - manages form schemas and templates
 */
export class FormRegistry {
  private forms: Map<string, FormBundle> = new Map();
  
  /**
   * Register a form with its schema
   */
  register(bundle: FormBundle): void {
    this.forms.set(bundle.id, bundle);
  }
  
  /**
   * Get a form by its ID
   */
  getForm(formId: string): FormBundle | undefined {
    return this.forms.get(formId);
  }
  
  /**
   * Get a form's schema by ID
   */
  getSchema(formId: string): FormSchema | undefined {
    const form = this.forms.get(formId);
    return form?.schema;
  }
  
  /**
   * List all registered forms
   */
  listForms(): FormMetadata[] {
    return Array.from(this.forms.values()).map((bundle) => ({
      id: bundle.id,
      name: bundle.name,
      version: bundle.version,
      description: bundle.description,
    }));
  }
  
  /**
   * Check if a form is registered
   */
  hasForm(formId: string): boolean {
    return this.forms.has(formId);
  }
  
  /**
   * Remove a form from the registry
   */
  unregister(formId: string): boolean {
    return this.forms.delete(formId);
  }
  
  /**
   * Load a form from JSON schema files
   */
  async loadFromFiles(
    formId: string,
    name: string,
    version: string,
    schemaData: {
      layout: Record<string, LayoutEntry>;
      mapping: Record<string, MappingEntry>;
      transforms: Record<string, TransformEntry>;
      tables?: Record<string, TableDefinition>;
    }
  ): Promise<void> {
    const bundle: FormBundle = {
      id: formId,
      name,
      version,
      schema: schemaData,
    };
    
    this.register(bundle);
  }
}

// Global form registry instance
export const formRegistry = new FormRegistry();
